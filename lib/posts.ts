export type Post = {
  title: string;
  url: string;
  date: string;
  description: string;
};
const sources: Record<string, string> = {
  blog: "https://rss.blog.naver.com/dudwls9383.xml",
  somunia: "https://gall.dcinside.com/mgallery/board/lists/?id=somunia",
  moesound: "https://gall.dcinside.com/mini/board/lists?id=moesound",
};
// 외부 HTML은 텍스트로만 표시하며 원문 HTML을 브라우저에 삽입하지 않습니다.
export function plainText(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
export function parseBlog(xml: string): Post[] {
  const field = (item: string, tag: string) =>
    item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] || "";
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => {
      const date = new Date(field(m[1], "pubDate"));
      return {
        title: plainText(field(m[1], "title")),
        url: plainText(field(m[1], "link")),
        date: Number.isNaN(+date) ? "" : date.toISOString().slice(0, 10),
        description: plainText(field(m[1], "description")).slice(0, 180),
      };
    })
    .filter((p) => {
      try {
        return new URL(p.url).hostname === "blog.naver.com";
      } catch {
        return false;
      }
    });
}
export function parseGallery(html: string, source: string): Post[] {
  const posts: Post[] = [];
  for (const row of html.matchAll(
    /<tr\b[^>]*class=["'][^"']*ub-content[^"']*["'][^>]*>([\s\S]*?)<\/tr>/g,
  )) {
    // 오래된 고정 공지는 제외하여 현재 올라오는 글부터 보여줍니다.
    if (row[0].includes('data-type="icon_notice"')) continue;
    const titleCell = row[1].match(
      /<td\b[^>]*class=["'][^"']*gall_tit[^"']*["'][^>]*>([\s\S]*?)<\/td>/,
    )?.[1];
    if (!titleCell) continue;
    const link = titleCell.match(
      /<a\b[^>]*href=["']([^"']*\/board\/view\/?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/,
    );
    if (!link) continue;
    const url = new URL(plainText(link[1]), "https://gall.dcinside.com").href;
    if (
      new URL(url).hostname !== "gall.dcinside.com" ||
      new URL(url).searchParams.get("id") !== source
    )
      continue;
    const dateCell =
      row[1].match(
        /<td\b[^>]*class=["'][^"']*gall_date[^"']*["'][^>]*>([\s\S]*?)<\/td>/,
      )?.[1] || "";
    posts.push({
      title: plainText(link[2]),
      url,
      date: plainText(dateCell),
      description: "",
    });
  }
  return [...new Map(posts.map((p) => [p.url, p])).values()].slice(0, 40);
}
const cache = new Map<string, { time: number; posts: Post[] }>();
export async function readPosts(source: string) {
  if (!sources[source]) throw new Error("알 수 없는 연결 공간입니다.");
  const saved = cache.get(source);
  if (saved && Date.now() - saved.time < 300000) return saved.posts;
  const res = await fetch(sources[source], {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok)
    throw new Error(
      "원문 사이트에서 응답하지 않습니다. 원문 링크로 확인해 주세요.",
    );
  const text = await res.text();
  const posts =
    source === "blog" ? parseBlog(text) : parseGallery(text, source);
  if (!posts.length)
    throw new Error(
      "원문 사이트의 글 목록을 읽지 못했습니다. 원문 링크로 확인해 주세요.",
    );
  cache.set(source, { time: Date.now(), posts });
  return posts;
}
