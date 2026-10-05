export const postSourceIds = ["blog", "somunia", "moesound"] as const;
export type PostSource = (typeof postSourceIds)[number];
export type Post = {
  source: PostSource;
  title: string;
  url: string;
  date: string;
  publishedAt: number | null;
  description: string;
  image?: string;
  category?: string;
  comments?: number;
  views?: number;
};
export type PostPreview = {
  description: string;
  image?: string;
  video?: { id: string; title: string; artist: string; thumbnail: string };
};
export const postSources: Record<PostSource, string> = {
  blog: "https://rss.blog.naver.com/dudwls9383.xml",
  somunia: "https://gall.dcinside.com/mgallery/board/lists/?id=somunia",
  moesound: "https://gall.dcinside.com/mini/board/lists?id=moesound",
};
export function isPostSource(value: string): value is PostSource {
  return postSourceIds.some((id) => id === value);
}
function withoutCdata(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function decodeEntities(value: string) {
  return value.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => {
      const code = hex ? Number.parseInt(hex, 16) : Number(decimal);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    });
}
// 외부 문서는 텍스트와 검증한 주소로만 반환합니다. 원문 HTML을 화면에 삽입하지 않습니다.
export function plainText(value = "") {
  return decodeEntities(withoutCdata(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function attributes(value: string) {
  const result: Record<string, string> = {};
  for (const m of value.matchAll(/([^\s="'<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>]+))/g)) {
    result[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return result;
}
function hasClass(attrs: Record<string, string>, name: string) {
  return (attrs.class || "").split(/\s+/).includes(name);
}
// Image URLs are displayed directly, never fetched through an unrestricted proxy.
export function safePostImage(value: string): string | undefined {
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return;
    const host = url.hostname.toLowerCase();
    const naver = ["blogthumb.pstatic.net", "blogfiles.pstatic.net", "postfiles.pstatic.net", "mblogthumb-phinf.pstatic.net", "blogpfthumb-phinf.pstatic.net"].includes(host);
    const dc = /^dcimg\d+\.dcinside\.(?:com|co\.kr)$/.test(host) || ["image.dcinside.com", "img.dcinside.com"].includes(host);
    const youtube = ["i.ytimg.com", "i1.ytimg.com", "i2.ytimg.com", "i3.ytimg.com", "i4.ytimg.com"].includes(host);
    return naver || dc || youtube ? url.href : undefined;
  } catch { return; }
}
function firstImage(html: string) {
  for (const m of withoutCdata(html).matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = attributes(m[1]);
    // DC's lazy images may contain a spacer in src; prefer the real source.
    const image = safePostImage(attrs["data-original"] || attrs["data-src"] || attrs.src || "");
    if (image) return image;
  }
  return undefined;
}
function kstDate(timestamp: number) {
  return new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
}
export function parseBlog(xml: string): Post[] {
  const field = (item: string, tag: string) => item.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1] || "";
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m): Post => {
    const timestamp = Date.parse(plainText(field(m[1], "pubDate")));
    const publishedAt = Number.isFinite(timestamp) ? timestamp : null;
    const rawDescription = field(m[1], "description");
    return {
      source: "blog", title: plainText(field(m[1], "title")), url: plainText(field(m[1], "link")),
      date: publishedAt === null ? "" : kstDate(publishedAt), publishedAt,
      description: plainText(rawDescription).slice(0, 180), image: firstImage(rawDescription),
      category: plainText(field(m[1], "category")) || undefined,
    };
  }).filter((p) => {
    try {
      const url = new URL(p.url);
      return !!p.title && url.protocol === "https:" && url.hostname === "blog.naver.com" && !url.username && !url.password && /^\/dudwls9383\/\d+\/?$/.test(url.pathname);
    } catch { return false; }
  }).slice(0, 40);
}
// Strip incidental list/page/search parameters; each article has one cache identity.
export function galleryPostUrl(source: string, input: string): string | null {
  if (source !== "somunia" && source !== "moesound") return null;
  try {
    const url = new URL(decodeEntities(input), "https://gall.dcinside.com");
    const section = source === "somunia" ? "mgallery" : "mini";
    const no = url.searchParams.get("no");
    if (url.protocol !== "https:" || url.hostname !== "gall.dcinside.com" || url.username || url.password || (url.port && url.port !== "443") || !new RegExp(`^/${section}/board/view/?$`).test(url.pathname) || url.searchParams.get("id") !== source || !no || !/^\d{1,12}$/.test(no)) return null;
    return `https://gall.dcinside.com/${section}/board/view/?id=${source}&no=${no}`;
  } catch { return null; }
}
function galleryTimestamp(value: string): number | null {
  const m = value.match(/^(\d{4})[-./](\d{2})[-./](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const timestamp = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}+09:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}
export function parseGallery(html: string, source: string): Post[] {
  if (source !== "somunia" && source !== "moesound") return [];
  const posts: Post[] = [];
  for (const row of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const rowAttrs = attributes(row[1]);
    if (!hasClass(rowAttrs, "ub-content") || rowAttrs["data-type"] === "icon_notice") continue;
    const cells = [...row[2].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map((m) => ({ attrs: attributes(m[1]), html: m[2] }));
    const cell = (name: string) => cells.find((c) => hasClass(c.attrs, name));
    const titleCell = cell("gall_tit");
    if (!titleCell) continue;
    let article: { url: string; title: string } | undefined;
    for (const link of titleCell.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attrs = attributes(link[1]);
      if (hasClass(attrs, "reply_numbox")) continue;
      const url = galleryPostUrl(source, attrs.href || "");
      const title = plainText(link[2]);
      if (url && title) { article = { url, title }; break; }
    }
    if (!article) continue;
    const dateCell = cell("gall_date");
    // The short visible dates omit year/time. DC's title attribute is full KST.
    const publishedAt = galleryTimestamp(dateCell?.attrs.title || "") ?? galleryTimestamp(plainText(dateCell?.html || ""));
    const subject = cell("gall_subject")?.html || "";
    const fullSubject = subject.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const reply = titleCell.html.match(/<span\b[^>]*class=["'][^"']*\breply_num\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const count = plainText(cell("gall_count")?.html || "").replace(/,/g, "");
    posts.push({
      source, ...article, date: publishedAt === null ? plainText(dateCell?.html || "") : kstDate(publishedAt), publishedAt,
      description: "", category: plainText(fullSubject || subject) || undefined,
      comments: reply === undefined ? 0 : Number(plainText(reply).replace(/[^\d]/g, "")) || 0,
      views: /^\d+$/.test(count) ? Number(count) : undefined,
    });
  }
  return [...new Map(posts.map((p) => [p.url, p])).values()].slice(0, 40);
}
function galleryBody(html: string): string {
  // Match the nested article div, not the scripts, ads, or list underneath it.
  const cleaned = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const tokens = [...cleaned.matchAll(/<\/?div\b[^>]*>/gi)];
  const start = tokens.findIndex((m) => !m[0].startsWith("</") && hasClass(attributes(m[0]), "write_div"));
  if (start < 0) return "";
  let depth = 1;
  for (let i = start + 1; i < tokens.length; i++) {
    depth += tokens[i][0].startsWith("</") ? -1 : 1;
    if (depth === 0) return cleaned.slice(tokens[start].index! + tokens[start][0].length, tokens[i].index);
  }
  return "";
}
function embeddedVideoId(body: string) {
  for (const tag of body.matchAll(/<(?:iframe|embed|a)\b([^>]*)>/gi)) {
    const attrs = attributes(tag[1]);
    const value = attrs.src || attrs.href || "";
    try {
      const url = new URL(value.startsWith("//") ? `https:${value}` : value);
      if (!["https:", "http:"].includes(url.protocol)) continue;
      const parts = url.pathname.split("/").filter(Boolean);
      const id = url.hostname === "youtu.be" ? parts[0] : ["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname) ? (parts[0] === "watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null) : null;
      if (id && /^[\w-]{11}$/.test(id)) return id;
    } catch { /* Ignore invalid article links. */ }
  }
  return null;
}
export function parseGalleryPreview(html: string, post: Post): PostPreview | null {
  const article = galleryBody(html);
  if (!article) return null;
  const id = embeddedVideoId(article);
  return {
    description: plainText(article).replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim().slice(0, 240),
    image: firstImage(article),
    // Title/artist describe the source article; no YouTube metadata is invented.
    video: id ? { id, title: `글 속 영상 · ${post.title}`, artist: post.source === "somunia" ? "소무니아 갤러리" : "카와이 보이스 갤러리", thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } : undefined,
  };
}
export function newestPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0) || a.url.localeCompare(b.url));
}
