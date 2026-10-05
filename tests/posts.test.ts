import assert from "node:assert/strict";
import { test } from "node:test";
import { galleryPostUrl, newestPosts, parseBlog, parseGallery, parseGalleryPreview, safePostImage, type Post } from "../lib/posts.ts";

test("blog RSS exposes approved images and KST dates without inserting raw markup", () => {
  const xml = `<rss><item><title><![CDATA[<b>Song</b> &amp; voice]]></title><link>https://blog.naver.com/dudwls9383/1</link><pubDate>Sun, 04 Oct 2026 18:30:00 +0000</pubDate><category><![CDATA[음악 기록]]></category><description><![CDATA[<script>alert(1)</script><p>첫 곡 &amp; 두 번째</p><img src="https://blogthumb.pstatic.net/photo.jpg?type=s3&amp;v=1">]]></description></item><item><title>foreign blog</title><link>https://blog.naver.com/someone/1</link></item><item><title>wrong host</title><link>https://blog.naver.com.evil.test/dudwls9383/1</link></item></rss>`;
  const [post] = parseBlog(xml);
  assert.equal(parseBlog(xml).length, 1);
  assert.equal(post.title, "Song & voice");
  assert.equal(post.date, "2026-10-05");
  assert.equal(post.publishedAt, Date.parse("2026-10-05T03:30:00+09:00"));
  assert.equal(post.description, "첫 곡 & 두 번째");
  assert.equal(post.image, "https://blogthumb.pstatic.net/photo.jpg?type=s3&v=1");
  assert.equal(post.category, "음악 기록");
});
test("gallery metadata uses full KST title date and full collapsed category", () => {
  const row = `<tr data-no='2211' class='us-post ub-content' data-type='icon_pic'><td class='gall_subject'>ASM<p class='subject_inner'>ASMR</p></td><td class='gall_tit ub-word'><a title='article' href='/mini/board/view/?id=moesound&amp;no=2211&amp;page=2'><em class='icon_img'></em>Dream voice</a><a href='/mini/board/view/?id=moesound&amp;no=2211' class='reply_numbox'><span data-x='1' class='reply_num'>[12]</span></a></td><td title='2026-10-05 00:30:12' class='gall_date'>00:30</td><td class='gall_count'>1,204</td></tr>`;
  const [post] = parseGallery(row + row, "moesound");
  assert.equal(parseGallery(row + row, "moesound").length, 1);
  assert.equal(post.date, "2026-10-05");
  assert.equal(post.publishedAt, Date.parse("2026-10-04T15:30:12Z"));
  assert.equal(post.category, "ASMR");
  assert.equal(post.comments, 12);
  assert.equal(post.views, 1204);
  assert.equal(post.url, "https://gall.dcinside.com/mini/board/view/?id=moesound&no=2211");
  assert.equal(parseGallery(row, "somunia").length, 0);
  assert.equal(parseGallery(row.replace("icon_pic", "icon_notice"), "moesound").length, 0);
});
test("short gallery dates stay unknown rather than being assigned an invented year", () => {
  const row = `<tr class="ub-content"><td class="gall_tit"><a href="/mgallery/board/view/?id=somunia&no=5">Title</a></td><td class="gall_date">12.31</td></tr>`;
  assert.equal(parseGallery(row, "somunia")[0].publishedAt, null);
  const posts = [parseGallery(row, "somunia")[0], { ...parseGallery(row, "somunia")[0], url: "new", publishedAt: 123 }, { ...parseGallery(row, "somunia")[0], url: "newer", publishedAt: 456 }];
  assert.deepEqual(newestPosts(posts).map((p) => p.url), ["newer", "new", posts[0].url]);
});
test("gallery preview validates links and reads only balanced article content", () => {
  const post: Post = { source: "moesound", title: "Dream voice", url: "https://gall.dcinside.com/mini/board/view/?id=moesound&no=1", date: "2026-10-05", publishedAt: 1, description: "" };
  const html = `<div class="outer"><div data-other="hello" class="write_div article"><p>듣고 싶은 곡</p><div><img src="data:image/gif;base64,AAAA" data-original="https://dcimg3.dcinside.co.kr/viewimage.php?id=3&amp;no=5"><embed src="https://www.youtube.com/embed/abcdefghijk"></div><script>injected()</script><div><a href="https://youtu.be/lmnopqrstuv">another video</a></div></div></div><p>광고</p><iframe src="https://www.youtube.com/embed/zyxwvutsrqp"></iframe>`;
  const preview = parseGalleryPreview(html, post)!;
  assert.equal(preview.image, "https://dcimg3.dcinside.co.kr/viewimage.php?id=3&no=5");
  assert.equal(preview.video?.id, "abcdefghijk");
  assert.equal(preview.video?.title, "글 속 영상 · Dream voice");
  assert.ok(preview.description.includes("듣고 싶은 곡"));
  assert.ok(!preview.description.includes("광고"));
  assert.ok(!preview.description.includes("injected"));
  assert.equal(parseGalleryPreview("<h1>삭제된 글</h1>", post), null);
  assert.equal(parseGalleryPreview(html.replace("www.youtube.com/embed/abcdefghijk", "youtube.com.evil.test/embed/abcdefghijk").replace("https://youtu.be/lmnopqrstuv", "javascript:alert(1)"), post)?.video, undefined);
});
test("article and image URL validation blocks arbitrary hosts, credentials and foreign galleries", () => {
  assert.equal(galleryPostUrl("somunia", "/mgallery/board/view/?id=somunia&no=1&page=2#reply"), "https://gall.dcinside.com/mgallery/board/view/?id=somunia&no=1");
  for (const url of ["https://gall.dcinside.com.evil.test/mgallery/board/view/?id=somunia&no=1", "https://user:pass@gall.dcinside.com/mgallery/board/view/?id=somunia&no=1", "https://gall.dcinside.com:8080/mgallery/board/view/?id=somunia&no=1", "https://gall.dcinside.com/mgallery/board/view/?id=other&no=1", "http://gall.dcinside.com/mgallery/board/view/?id=somunia&no=1", "https://gall.dcinside.com/mini/board/view/?id=somunia&no=1", "https://127.0.0.1/mgallery/board/view/?id=somunia&no=1", "https://gall.dcinside.com/mgallery/board/view/?id=somunia&no=abc"]) assert.equal(galleryPostUrl("somunia", url), null);
  for (const url of ["javascript:alert(1)", "data:image/png;base64,a", "http://blogthumb.pstatic.net/image.jpg", "https://blogthumb.pstatic.net.evil.test/image.jpg", "https://user:pass@dcimg3.dcinside.co.kr/image.jpg", "https://example.com/image.jpg"]) assert.equal(safePostImage(url), undefined);
  assert.equal(safePostImage("//blogthumb.pstatic.net/image.jpg"), "https://blogthumb.pstatic.net/image.jpg");
});
