import { database } from "../../../db";
import { ApiError, body, failure } from "../../../lib/server";
import { smallChannelPool } from "../../../lib/small-channel-store";
import {
  ensureVideoFacts,
  youtubeRequest,
} from "../../../lib/video-fact-store";
export async function POST(request: Request) {
  let owner: string | undefined,
    lock = "";
  try {
    const input = await body(request, 1000),
      pool = await smallChannelPool();
    const channel = pool.channels.find((c) => c.id === input.id);
    if (!channel || !/^UC[\w-]{22}$/.test(channel.id))
      throw new ApiError("저장된 채널을 선택해 주세요.");
    await ensureVideoFacts();
    const db = database();
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS channel_previews (id TEXT PRIMARY KEY,data TEXT NOT NULL,checked_at INTEGER NOT NULL)",
      )
      .run();
    const saved = await db
      .prepare("SELECT data,checked_at FROM channel_previews WHERE id=?")
      .bind(channel.id)
      .first<{
        data: string;
        checked_at: number;
      }>();
    if (saved && Date.now() - saved.checked_at < 6 * 3600000)
      return Response.json({
        ...JSON.parse(saved.data),
        checkedAt: saved.checked_at,
        cached: true,
      });
    // One shared lease also prevents a visitor from generating simultaneous API bursts.
    owner = crypto.randomUUID();
    lock = "preview";
    await db
      .prepare("INSERT OR IGNORE INTO media_locks(id) VALUES (?)")
      .bind(lock)
      .run();
    const claim = await db
      .prepare(
        "UPDATE media_locks SET owner=?,lease_until=? WHERE id=? AND lease_until<=?",
      )
      .bind(owner, Date.now() + 60000, lock, Date.now())
      .run();
    if (!claim.meta.changes)
      throw new ApiError(
        "다른 미리듣기를 가져오는 중이에요. 잠시 후 눌러 주세요.",
        409,
      );
    const items = await youtubeRequest("channels", {
      part: "contentDetails",
      id: channel.id,
    });
    const uploads = items[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads)
      throw new ApiError("이 채널의 공개 영상을 확인하지 못했어요.");
    const videos = await youtubeRequest("playlistItems", {
      part: "snippet",
      playlistId: uploads,
      maxResults: "6",
    });
    const tracks = videos
      .filter(
        (v) =>
          /^[\w-]{11}$/.test(v.snippet?.resourceId?.videoId || "") &&
          !/^(Deleted video|Private video)$/.test(v.snippet.title),
      )
      .map((v) => ({
        id: v.snippet.resourceId.videoId,
        title: v.snippet.title,
        artist: channel.title,
        thumbnail:
          v.snippet.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${v.snippet.resourceId.videoId}/hqdefault.jpg`,
      }));
    const result = { channel, tracks },
      now = Date.now();
    await db
      .prepare(
        "INSERT INTO channel_previews(id,data,checked_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM media_locks WHERE id=? AND owner=?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,checked_at=excluded.checked_at",
      )
      .bind(channel.id, JSON.stringify(result), now, lock, owner)
      .run();
    return Response.json({ ...result, checkedAt: now });
  } catch (e) {
    return failure(e);
  } finally {
    if (owner)
      await database()
        .prepare(
          "UPDATE media_locks SET owner=NULL,lease_until=0 WHERE id=? AND owner=?",
        )
        .bind(lock, owner)
        .run();
  }
}
