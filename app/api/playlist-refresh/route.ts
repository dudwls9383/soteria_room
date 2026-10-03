import { env } from "cloudflare:workers";
import { database } from "../../../db";
import { ApiError, body, failure } from "../../../lib/server";
import { ensureSync } from "../../../lib/channel-sync";
import { ensureMeta } from "../../../lib/playlist-meta";
import { readPlaylist } from "../../../lib/youtube";
import { refreshHistory, recordRefresh } from "../../../lib/playlist-refresh-log";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[\w-]{10,100}$/.test(id)) throw new ApiError("재생목록을 선택해 주세요.");
    return Response.json((await refreshHistory(id)).results, {headers:{"Cache-Control":"no-store"}});
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  let owner: string | undefined;
  let playlistId: string | undefined;
  try {
    const input = await body(request, 1000);
    await ensureSync();
    await ensureMeta();
    const db = database(),
      saved = await db
        .prepare("SELECT id,title,tracks,updated_at FROM playlists WHERE id=?")
        .bind(String(input.id || ""))
        .first<{
          id: string;
          title: string;
          tracks: string;
          updated_at: number;
        }>();
    if (!saved)
      throw new ApiError("보관실에 저장된 재생목록을 선택해 주세요.", 404);
    playlistId = saved.id;
    if (Date.now() - saved.updated_at < 60000)
      throw new ApiError(
        "방금 갱신한 목록이에요. 1분 뒤 다시 가져올 수 있어요.",
        429,
      );
    owner = crypto.randomUUID();
    const claim = await db
      .prepare(
        "UPDATE channel_sync SET owner=?,lease_until=? WHERE id='primary' AND lease_until<=?",
      )
      .bind(owner, Date.now() + 600000, Date.now())
      .run();
    if (!claim.meta.changes)
      throw new ApiError(
        "동기화가 진행 중이에요. 완료하거나 중단한 뒤 갱신해 주세요.",
        409,
      );
    // Explicit refresh always downloads the complete list, even if count/first ID match.
    const playlist = await readPlaylist(saved.id, (env as any).YOUTUBE_API_KEY);
    if (!playlist.tracks.length && JSON.parse(saved.tracks).length)
      throw new ApiError(
        "빈 응답이 와서 기존 목록을 유지했어요. 공개 상태를 확인해 주세요.",
        502,
      );
    const now = Date.now();
    await db.batch([
      db
        .prepare(
          "UPDATE playlists SET title=?,tracks=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM channel_sync WHERE id='primary' AND owner=?)",
        )
        .bind(
          playlist.title,
          JSON.stringify(playlist.tracks),
          now,
          saved.id,
          owner,
        ),
      db
        .prepare(
          "INSERT INTO playlist_meta(id,thumbnail,views,checked_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM channel_sync WHERE id='primary' AND owner=?) ON CONFLICT(id) DO UPDATE SET thumbnail=CASE WHEN playlist_meta.thumbnail LIKE '%/pl_c/%' AND excluded.thumbnail NOT LIKE '%/pl_c/%' THEN playlist_meta.thumbnail ELSE COALESCE(NULLIF(excluded.thumbnail,''),playlist_meta.thumbnail) END,views=COALESCE(excluded.views,playlist_meta.views),checked_at=excluded.checked_at",
        )
        .bind(
          saved.id,
          playlist.thumbnail || "",
          playlist.views ?? null,
          now,
          owner,
        ),
    ]);
    const active = await db
      .prepare("SELECT owner FROM channel_sync WHERE id='primary'")
      .first<{
        owner: string | null;
      }>();
    if (active?.owner !== owner)
      throw new ApiError("갱신이 중단되어 기존 자료를 유지했어요.", 409);
    await recordRefresh(saved.id, `${playlist.title} · ${playlist.tracks.length}곡으로 갱신했어요.`, true).catch(() => {});
    return Response.json(
      {
        ...playlist,
        updatedAt: now,
        trackCount: playlist.tracks.length,
        summaryOnly: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (playlistId) await recordRefresh(playlistId, e instanceof ApiError ? e.message : "갱신에 실패했어요. 기존 자료를 유지합니다.", false).catch(() => {});
    return failure(e);
  } finally {
    if (owner)
      await database()
        .prepare(
          "UPDATE channel_sync SET owner=NULL,lease_until=0 WHERE id='primary' AND owner=?",
        )
        .bind(owner)
        .run();
  }
}
