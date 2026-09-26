import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monthOf, searchLibrary } from '../lib/archive.ts';
import { extractTracks } from '../lib/youtube.ts';
import { parseBlog, parseGallery } from '../lib/posts.ts';

test('monthly titles use real dates; multi-month titles are not assigned a false month', () => {
  assert.equal(monthOf('9월의 픽(2026)'), '2026.09');
  assert.equal(monthOf('2026.08'), '2026.08');
  assert.equal(monthOf('1&2월의 픽(2022)'), '그 밖의 재생목록');
  assert.equal(monthOf('10~12월의 픽(2021)'), '그 밖의 재생목록');
});
test('search deduplicates videos while preserving every playlist membership', () => {
  const track = { id: 'abcdefghijk', title: 'Somunia Song', artist: 'Artist', thumbnail: '' };
  const library = [{ id: 'a', title: '2026.09', tracks: [track] }, { id: 'b', title: 'Best', tracks: [track] }];
  assert.equal(searchLibrary(library, 'SOMUNIA').length, 1);
  assert.deepEqual(searchLibrary(library, 'best')[0].playlists, ['2026.09', 'Best']);
});
test('playlist continuation does not get replaced by the recommendation continuation', () => {
  const token = (value: string) => ({ continuationItemViewModel: { continuationCommand: { innertubeCommand: { continuationCommand: { token: value } } } } });
  const data = { contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, content: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: [token('playlist-next')] } }, token('recommendations-next')] } } } }] } } };
  assert.equal(extractTracks(data).continuation, 'playlist-next');
});
test('continuation actions take priority over the empty contents shell returned by YouTube', () => {
  const data = { contents: { twoColumnBrowseResultsRenderer: { tabs: [] } }, onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [{ lockupViewModel: { contentId: 'abcdefghijk', contentType: 'LOCKUP_CONTENT_TYPE_VIDEO', metadata: { lockupMetadataViewModel: { title: { content: 'Page 2 song' } } } } }] } }] };
  assert.equal(extractTracks(data).tracks[0].title, 'Page 2 song');
});
test('feeds return text and only expected source links', () => {
  const feed = '<rss><item><title><![CDATA[<b>Song</b> &amp; music]]></title><link>https://blog.naver.com/dudwls9383/1</link><description>Text</description></item><item><title>Bad</title><link>javascript:alert(1)</link></item></rss>';
  assert.equal(parseBlog(feed).length, 1); assert.equal(parseBlog(feed)[0].title, 'Song & music');
  const row = '<tr class="ub-content us-post"><td class="gall_tit ub-word"><a href="/mgallery/board/view/?id=somunia&amp;no=1">Latest</a></td><td class="gall_date">09.26</td></tr>';
  assert.equal(parseGallery(row, 'somunia')[0].title, 'Latest');
  assert.equal(parseGallery(row, 'moesound').length, 0);
});
