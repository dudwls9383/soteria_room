import { parseMeta } from "./youtube-metadata";
export { parseMeta } from "./youtube-metadata";
import { database } from "../db";
import { parseInitialData } from "./youtube";
import { seasonalCover } from "./music-cover";
export async function ensureMeta() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS playlist_meta (id TEXT PRIMARY KEY, thumbnail TEXT, views INTEGER, checked_at INTEGER)",
    )
    .run();
}
export async function refreshMeta(id: string) {
  await ensureMeta();
  const res = await fetch(
    `${/^LR(?:SR|YR)/.test(id) ? "https://music.youtube.com" : "https://www.youtube.com"}/playlist?list=${encodeURIComponent(id)}&hl=ko`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok) throw new Error("재생목록 정보를 읽지 못했습니다.");
  const html=await res.text();
  if(/^LR(?:SR|YR)/.test(id)) {
    const thumbnail=seasonalCover(html);
    if(!thumbnail)throw new Error("계절별 표지를 확인하지 못했어요.");
    // Cover-only refresh leaves saved view counts intact.
    await database().prepare("INSERT INTO playlist_meta (id,thumbnail,checked_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET thumbnail=excluded.thumbnail,checked_at=excluded.checked_at").bind(id,thumbnail,Date.now()).run();
    return {thumbnail,views:null};
  }
  const data = parseInitialData(html);
  if (!data.metadata?.playlistMetadataRenderer)
    throw new Error("공개 재생목록을 확인할 수 없습니다.");
  const meta = parseMeta(data);
  await database()
    .prepare(
      "INSERT INTO playlist_meta (id,thumbnail,views,checked_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET thumbnail=excluded.thumbnail,views=excluded.views,checked_at=excluded.checked_at",
    )
    .bind(id, meta.thumbnail, meta.views, Date.now())
    .run();
  return meta;
}
