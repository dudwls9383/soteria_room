import { database } from "../db";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import { ApiError } from "./server";
import { galleryPostUrl, newestPosts, parseBlog, parseGallery, parseGalleryPreview, postSourceIds, postSources, type Post, type PostPreview, type PostSource } from "./posts";

export const POST_TTL = 10 * 60000;
const PREVIEW_TTL = 24 * 3600000;
type CacheRow = { data: string; updated_at: number | null; last_attempt: number; error: string | null; lease_owner: string | null; lease_until: number };
export type PostSourceStatus = { id: PostSource; updatedAt: number | null; stale: boolean; retryAt: number; error?: string };
let initialized: Promise<void> | null = null;
async function ensurePostCache() {
  if (!initialized) {
    const db = database();
    initialized = db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS connected_post_cache (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '[]', updated_at INTEGER, last_attempt INTEGER NOT NULL DEFAULT 0, error TEXT, lease_owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0)"),
      db.prepare("CREATE TABLE IF NOT EXISTS connected_preview_cache (url TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', updated_at INTEGER, last_attempt INTEGER NOT NULL DEFAULT 0, error TEXT, lease_owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0)"),
      db.prepare("CREATE TABLE IF NOT EXISTS connected_fetch_limits (id TEXT PRIMARY KEY, next_at INTEGER NOT NULL DEFAULT 0)"),
    ]).then(() => undefined).catch((e) => { initialized = null; throw e; });
  }
  await initialized;
}
function savedPosts(row: CacheRow | null): Post[] {
  try { return row ? JSON.parse(row.data) as Post[] : []; } catch { return []; }
}
function status(source: PostSource, row: CacheRow | null, now = Date.now()): PostSourceStatus {
  return { id: source, updatedAt: row?.updated_at ?? null, stale: !row?.updated_at || now - row.updated_at >= POST_TTL,
    retryAt: row?.last_attempt ? row.last_attempt + POST_TTL : 0, ...(row?.error ? { error: row.error } : {}) };
}
async function sourceRow(source: PostSource) {
  return database().prepare("SELECT data,updated_at,last_attempt,error,lease_owner,lease_until FROM connected_post_cache WHERE id=?").bind(source).first<CacheRow>();
}
async function limitedText(response: Response, maximum = 900000) {
  if (Number(response.headers.get("content-length")) > maximum) throw new Error("원문 응답이 너무 커서 미리보기를 건너뛰었어요.");
  if (!response.body) throw new Error("원문 응답을 읽지 못했어요.");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) throw new Error("원문 응답이 너무 커서 미리보기를 건너뛰었어요.");
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
async function fetchDocument(url: string) {
  // The caller supplies only fixed source URLs or validated known gallery posts.
  // Reject redirects so a source cannot redirect a server fetch to another host.
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.5" }, redirect: "manual", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(response.status === 429 ? "원문 사이트에서 요청을 잠시 제한하고 있어요. 저장된 글과 원문 링크를 이용해 주세요." : "원문 사이트에서 응답하지 않아요. 저장된 글과 원문 링크를 이용해 주세요.");
  return limitedText(response);
}
async function refreshSource(source: PostSource): Promise<CacheRow | null> {
  const db = database(), now = Date.now(), owner = crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO connected_post_cache (id) VALUES (?)").bind(source).run();
  // A persistent lease also bounds requests when different workers/visitors refresh together.
  const claim = await db.prepare("UPDATE connected_post_cache SET lease_owner=?,lease_until=?,last_attempt=? WHERE id=? AND last_attempt<=? AND lease_until<=?")
    .bind(owner, now + 20000, now, source, now - POST_TTL, now).run();
  if (!claim.meta.changes) return sourceRow(source);
  try {
    const html = await fetchDocument(postSources[source]);
    const posts = source === "blog" ? parseBlog(html) : parseGallery(html, source);
    if (!posts.length) throw new Error("원문 사이트의 글 목록을 읽지 못했어요. 원문 링크로 확인해 주세요.");
    await db.prepare("UPDATE connected_post_cache SET data=?,updated_at=?,error=NULL WHERE id=? AND lease_owner=?")
      .bind(JSON.stringify(posts), Date.now(), source, owner).run();
  } catch (e) {
    const message = e instanceof Error && !["AbortError", "TimeoutError", "TypeError"].includes(e.name) ? e.message : "원문 연결이 지연되고 있어요. 저장된 글과 원문 링크를 이용해 주세요.";
    await db.prepare("UPDATE connected_post_cache SET error=? WHERE id=? AND lease_owner=?").bind(message.slice(0, 180), source, owner).run();
  } finally {
    await db.prepare("UPDATE connected_post_cache SET lease_owner=NULL,lease_until=0 WHERE id=? AND lease_owner=?").bind(source, owner).run();
  }
  return sourceRow(source);
}
export async function readConnectedPosts(source: PostSource | "all", refresh = false) {
  await ensurePostCache();
  const selected = source === "all" ? postSourceIds : [source];
  const results = await Promise.all(selected.map(async (id) => {
    const row = await sourceRow(id), posts = savedPosts(row);
    if (!posts.length || refresh) {
      const latest = await refreshSource(id);
      return { posts: savedPosts(latest), status: status(id, latest) };
    }
    if (status(id, row).stale && (!row?.last_attempt || Date.now() - row.last_attempt >= POST_TTL)) {
      // Existing contents render immediately. Edge revalidation survives the response.
      const ctx = getRequestExecutionContext();
      if (ctx) ctx.waitUntil(refreshSource(id).catch((e) => console.error("Connected feed revalidation failed", e instanceof Error ? e.message : "Unknown error")));
      else {
        const latest = await refreshSource(id);
        return { posts: savedPosts(latest), status: status(id, latest) };
      }
    }
    return { posts, status: status(id, row) };
  }));
  const sources = results.map((r) => r.status);
  return { posts: newestPosts(results.flatMap((r) => r.posts)), sources,
    updatedAt: sources.some((s) => s.updatedAt !== null) ? Math.max(...sources.map((s) => s.updatedAt ?? 0)) : null };
}
function savedPreview(row: CacheRow | null): PostPreview | null {
  if (!row?.updated_at) return null;
  try { return JSON.parse(row.data) as PostPreview; } catch { return null; }
}
export async function readPostPreview(source: PostSource, input: string) {
  const url = galleryPostUrl(source, input);
  if (!url) throw new ApiError("연결된 갤러리의 글 주소를 확인해 주세요.");
  await ensurePostCache();
  // Do not turn a public endpoint into an unlimited gallery crawler.
  const post = savedPosts(await sourceRow(source)).find((p) => p.url === url);
  if (!post) throw new ApiError("현재 커뮤니티 목록에 있는 글만 미리 볼 수 있어요.");
  const db = database(), now = Date.now();
  const row = await db.prepare("SELECT data,updated_at,last_attempt,error,lease_owner,lease_until FROM connected_preview_cache WHERE url=?").bind(url).first<CacheRow>();
  const saved = savedPreview(row);
  if (saved && row?.updated_at && now - row.updated_at < PREVIEW_TTL) return { ...saved, updatedAt: row.updated_at, stale: false };
  if (row?.last_attempt && now - row.last_attempt < 60000) {
    if (saved) return { ...saved, updatedAt: row.updated_at, stale: true };
    throw new ApiError(row.error || "글 미리보기를 확인하고 있어요. 잠시 후 다시 눌러 주세요.", 429);
  }
  await db.prepare("INSERT OR IGNORE INTO connected_fetch_limits (id) VALUES ('gallery-preview')").run();
  const rate = await db.prepare("UPDATE connected_fetch_limits SET next_at=? WHERE id='gallery-preview' AND next_at<=?").bind(now + 2000, now).run();
  if (!rate.meta.changes) throw new ApiError("글 미리보기는 잠시 간격을 두고 확인해 주세요.", 429);
  await db.prepare("INSERT OR IGNORE INTO connected_preview_cache (url) VALUES (?)").bind(url).run();
  const owner = crypto.randomUUID();
  const claim = await db.prepare("UPDATE connected_preview_cache SET lease_owner=?,lease_until=?,last_attempt=? WHERE url=? AND last_attempt<=? AND lease_until<=?")
    .bind(owner, now + 20000, now, url, now - 60000, now).run();
  if (!claim.meta.changes) throw new ApiError("다른 창에서 이 글의 미리보기를 확인하고 있어요. 잠시 후 다시 눌러 주세요.", 409);
  try {
    const preview = parseGalleryPreview(await fetchDocument(url), post);
    if (!preview) throw new Error("글 미리보기를 읽지 못했어요. 원문 링크로 확인해 주세요.");
    const updatedAt = Date.now();
    await db.prepare("UPDATE connected_preview_cache SET data=?,updated_at=?,error=NULL WHERE url=? AND lease_owner=?").bind(JSON.stringify(preview), updatedAt, url, owner).run();
    // Retain only a small collection of requested previews, rather than an article archive.
    await db.prepare("DELETE FROM connected_preview_cache WHERE url NOT IN (SELECT url FROM connected_preview_cache ORDER BY last_attempt DESC LIMIT 160)").run();
    return { ...preview, updatedAt, stale: false };
  } catch (e) {
    const message = e instanceof Error && !["AbortError", "TimeoutError", "TypeError"].includes(e.name) ? e.message : "글 미리보기 연결이 지연되고 있어요. 원문 링크로 확인해 주세요.";
    await db.prepare("UPDATE connected_preview_cache SET error=? WHERE url=? AND lease_owner=?").bind(message.slice(0, 180), url, owner).run();
    if (saved) return { ...saved, updatedAt: row?.updated_at, stale: true };
    throw new ApiError(message, 502);
  } finally {
    await db.prepare("UPDATE connected_preview_cache SET lease_owner=NULL,lease_until=0 WHERE url=? AND lease_owner=?").bind(url, owner).run();
  }
}
