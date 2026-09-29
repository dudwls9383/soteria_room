import { database } from "../../../db";
import { ensureMeta, refreshMeta } from "../../../lib/playlist-meta";
import { ApiError, failure } from "../../../lib/server";

// YouTube custom covers have expiring signatures. Serve only saved playlist
// covers through a stable URL; refresh expired source URLs without song sync.
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[\w-]{10,100}$/.test(id)) throw new ApiError("잘못된 재생목록입니다.",400);
    await ensureMeta();
    const saved = await database().prepare("SELECT json_extract(p.tracks,'$[0].thumbnail') AS fallback,m.thumbnail,m.checked_at FROM playlists p LEFT JOIN playlist_meta m ON p.id=m.id WHERE p.id=?").bind(id).first<{fallback:string|null;thumbnail:string|null;checked_at:number|null}>();
    if (!saved) throw new ApiError("재생목록을 찾지 못했어요.",404);
    const cache = (caches as unknown as {default?: Cache}).default;
    const cacheKey = new Request(`${new URL(request.url).origin}/api/playlist-cover?id=${id}&revision=${saved.checked_at || 0}`);
    const hit = await cache?.match(cacheKey);
    if (hit) return hit;
    let source = saved.thumbnail || saved.fallback || "";
    const readImage = async (url:string) => {
      const target = new URL(url);
      if (target.protocol !== "https:" || !/(^|\.)ytimg\.com$/.test(target.hostname)) throw new Error("Invalid cover source");
      return fetch(target, {signal:AbortSignal.timeout(8000)});
    };
    let response: Response | undefined;
    if (source) response = await readImage(source).catch(() => undefined);
    if (!response?.ok || Date.now() - (saved.checked_at || 0) > 86400000) {
      try {
        const meta = await refreshMeta(id);
        if (meta.thumbnail) { source = meta.thumbnail; response = await readImage(source); }
      } catch { /* Keep a still-valid stored cover if YouTube is unavailable. */ }
    }
    const custom = source.includes("/pl_c/");
    if (!response?.ok && saved.fallback) response = await readImage(saved.fallback);
    if (!response?.ok) throw new ApiError("표지를 불러오지 못했어요.",502);
    // A fallback is cached briefly so temporary errors cannot replace the
    // custom artwork for an entire day.
    const ttl = custom && source === response.url ? 3600 : 300;
    const image = new Response(response.body, {headers:{"Content-Type":response.headers.get("Content-Type") || "image/jpeg","Cache-Control":`public, max-age=${ttl}`,"X-Content-Type-Options":"nosniff"}});
    await cache?.put(cacheKey,image.clone());
    return image;
  } catch (error) { return failure(error); }
}
