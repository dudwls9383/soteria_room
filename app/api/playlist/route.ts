import { ensureMeta } from "../../../lib/playlist-meta";
import { env } from "cloudflare:workers";
import { database } from "../../../db";
import { readPlaylist, playlistId } from "../../../lib/youtube";
import { ApiError, body, failure, requireAdmin } from "../../../lib/server";
export async function GET(request: Request) {
  try {
    const params=new URL(request.url).searchParams,id=params.get('id')||'',rawLimit=params.get('limit');
    const limit=rawLimit===null?null:Number(rawLimit);
    if(limit!==null&&(!Number.isInteger(limit)||limit<1||limit>500))throw new ApiError('곡 수 제한은 1~500 사이여야 합니다.');
    // Large collections send only the requested prefix, not thousands of songs.
    const query=limit===null?database().prepare("SELECT id,title,tracks,updated_at,json_array_length(tracks) AS count FROM playlists WHERE id=?").bind(id):database().prepare("SELECT p.id,p.title,p.updated_at,json_array_length(p.tracks) AS count,(SELECT json_group_array(json(value)) FROM (SELECT value FROM json_each(p.tracks) LIMIT ?)) AS tracks FROM playlists p WHERE p.id=?").bind(limit,id);
    const saved=await query.first<{id:string;title:string;tracks:string;updated_at:number;count:number}>();
    if (!saved) throw new ApiError("저장된 재생목록이 없어요. 목록을 새로고침해 주세요.",404);
    return Response.json({id:saved.id,title:saved.title,tracks:JSON.parse(saved.tracks),trackCount:saved.count,summaryOnly:limit!==null&&saved.count>limit,updatedAt:saved.updated_at}, {headers:{"Cache-Control":"no-store"}});
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request, 2000);
    if (typeof input.url !== "string")
      throw new ApiError("재생목록 링크를 입력해 주세요.");
    let id: string;
    try {
      id = playlistId(input.url);
    } catch (e) {
      throw new ApiError((e as Error).message);
    }
    const cached = await database()
      .prepare("SELECT title, tracks, updated_at FROM playlists WHERE id = ?")
      .bind(id)
      .first<{ title: string; tracks: string; updated_at: number }>();
    await ensureMeta();
    if (cached && !input.force && Date.now() - cached.updated_at < 900000) {
      const meta = await database()
        .prepare("SELECT thumbnail,views FROM playlist_meta WHERE id=?")
        .bind(id)
        .first();
      return Response.json({
        id,
        title: cached.title,
        tracks: JSON.parse(cached.tracks),
        ...meta,
      });
    }
    let playlist;
    try {
      playlist = await readPlaylist(id, (env as any).YOUTUBE_API_KEY);
    } catch (e) {
      throw new ApiError(
        (e as Error).name === "TimeoutError"
          ? "유튜브 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요."
          : (e as Error).message,
        422,
      );
    }
    await database()
      .prepare(
        "INSERT INTO playlists (id, title, tracks, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, tracks=excluded.tracks, updated_at=excluded.updated_at",
      )
      .bind(id, playlist.title, JSON.stringify(playlist.tracks), Date.now())
      .run();
    await database()
      .prepare(
        "INSERT INTO playlist_meta (id,thumbnail,views,checked_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET thumbnail=excluded.thumbnail,views=excluded.views,checked_at=excluded.checked_at",
      )
      .bind(id, playlist.thumbnail || "", playlist.views ?? null, Date.now())
      .run();
    return Response.json(playlist);
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request, 2000);
    if (typeof input.id !== "string" || !input.id.trim())
      throw new ApiError("삭제할 재생목록을 찾지 못했어요.");
    await ensureMeta();
    await database().batch([
      database().prepare("DELETE FROM playlists WHERE id = ?").bind(input.id),
      database().prepare("DELETE FROM playlist_meta WHERE id = ?").bind(input.id),
      database().prepare("DELETE FROM pick_additions WHERE playlist_id = ?").bind(input.id),
    ]);
    return Response.json({ ok: true, id: input.id });
  } catch (e) {
    return failure(e);
  }
}
