import { env } from "cloudflare:workers";
import { database } from "../db";
import { ApiError } from "./server";
import { durationSeconds, FACT_TTL, type VideoFact } from "./video-facts";
export async function ensureVideoFacts() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS video_facts (id TEXT PRIMARY KEY, data TEXT NOT NULL, checked_at INTEGER NOT NULL)",
    )
    .run();
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS media_locks (id TEXT PRIMARY KEY, owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0)",
    )
    .run();
}
export async function videoFacts() {
  await ensureVideoFacts();
  // Expired API observations are removed rather than retained indefinitely.
  await database()
    .prepare("DELETE FROM video_facts WHERE checked_at<?")
    .bind(Date.now() - 30 * 86400000)
    .run();
  const rows = await database().prepare("SELECT data FROM video_facts").all<{
    data: string;
  }>();
  return rows.results.map((r) => JSON.parse(r.data) as VideoFact);
}
export async function youtubeRequest(
  resource: string,
  params: Record<string, string>,
) {
  const key = (env as any).YOUTUBE_API_KEY;
  if (!key) throw new ApiError("공식 YouTube API 연결이 필요해요.", 503);
  const query = new URLSearchParams({ ...params, key });
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/${resource}?${query}`,
    { signal: AbortSignal.timeout(20000) },
  );
  const data: any = await response.json();
  if (!response.ok || !Array.isArray(data.items))
    throw new ApiError(
      response.status === 429 ||
      data.error?.errors?.some((e: any) => e.reason === "quotaExceeded")
        ? "YouTube 조회 한도에 도달했어요. 기존 자료는 유지됩니다."
        : "YouTube 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
      502,
    );
  return data.items as any[];
}
export async function refreshVideoFacts(onlyPicks = false) {
  await ensureVideoFacts();
  const db = database(),
    owner = crypto.randomUUID(),
    now = Date.now();
  await db
    .prepare("INSERT OR IGNORE INTO media_locks (id) VALUES ('facts')")
    .run();
  const claim = await db
    .prepare(
      "UPDATE media_locks SET owner=?,lease_until=? WHERE id='facts' AND lease_until<=?",
    )
    .bind(owner, now + 60000, now)
    .run();
  if (!claim.meta.changes)
    throw new ApiError("다른 창에서 영상 정보를 갱신하고 있어요.", 409);
  try {
    // Prefer curated playlists, then collect the rest; never request IDs supplied by a visitor.
    const due =
      "FROM playlists p,json_each(p.tracks) t LEFT JOIN video_facts f ON f.id=json_extract(t.value,'$.id') WHERE (f.checked_at IS NULL OR f.checked_at<? OR (json_extract(f.data,'$.availability')='available' AND json_extract(f.data,'$.channelId') IS NULL))" + (onlyPicks ? " AND p.title LIKE '%월의%픽%'" : "");
    const total = await db
      .prepare(
        `SELECT COUNT(DISTINCT json_extract(t.value,'$.id')) AS count ${due}`,
      )
      .bind(now - FACT_TTL)
      .first<{
        count: number;
      }>();
    const rows = await db
      .prepare(
        `SELECT DISTINCT json_extract(t.value,'$.id') AS id ${due} ORDER BY CASE WHEN p.title LIKE '%픽%' THEN 0 ELSE 1 END,p.updated_at DESC LIMIT 50`,
      )
      .bind(now - FACT_TTL)
      .all<{
        id: string;
      }>();
    const ids = rows.results
      .map((r) => r.id)
      .filter((id) => /^[\w-]{11}$/.test(id))
      .slice(0, 50);
    if (!ids.length) return { updated: 0, remaining: 0 };
    const items = await youtubeRequest("videos", {
      part: "statistics,contentDetails,status,snippet",
      id: ids.join(","),
      maxResults: "50",
    });
    const byId = new Map(items.map((v) => [v.id, v]));
    await db.batch(
      ids.map((id) => {
        const v = byId.get(id);
        const fact: VideoFact = {
          id,
          views:
            v?.statistics?.viewCount === undefined
              ? null
              : Number(v.statistics.viewCount),
          publishedAt: v?.snippet?.publishedAt || "",
          seconds: durationSeconds(v?.contentDetails?.duration || ""),
          availability: !v
            ? "missing"
            : v.status?.embeddable === false ||
                v.status?.privacyStatus === "private"
              ? "restricted"
              : "available",
          checkedAt: now,
          channelId: v?.snippet?.channelId || undefined,
          channelTitle: v?.snippet?.channelTitle || undefined,
        };
        return db
          .prepare(
            "INSERT INTO video_facts (id,data,checked_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM media_locks WHERE id='facts' AND owner=?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,checked_at=excluded.checked_at",
          )
          .bind(id, JSON.stringify(fact), now, owner);
      }),
    );
    return {
      updated: ids.length,
      remaining: Math.max(0, (total?.count || 0) - ids.length),
    };
  } finally {
    await db
      .prepare(
        "UPDATE media_locks SET owner=NULL,lease_until=0 WHERE id='facts' AND owner=?",
      )
      .bind(owner)
      .run();
  }
}
