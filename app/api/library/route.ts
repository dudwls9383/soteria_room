import { database } from "../../../db";
import { failure } from "../../../lib/server";
import { ensureMeta } from '../../../lib/playlist-meta';
import { packLibrary } from '../../../lib/library-wire';
export async function GET(request: Request) {
  try {
    await ensureMeta();
    if (new URL(request.url).searchParams.get("summary") === "1") {
      // First paint needs covers/counts, not tens of thousands of song records.
      const [rows, count] = await Promise.all([
        database().prepare("SELECT p.id,p.title,p.updated_at,json_array_length(p.tracks) AS count,json_extract(p.tracks,'$[0]') AS first_track,m.thumbnail,m.views FROM playlists p LEFT JOIN playlist_meta m ON p.id=m.id ORDER BY p.updated_at DESC").all<{id:string;title:string;updated_at:number;count:number;first_track:string|null;thumbnail:string|null;views:number|null}>(),
        database().prepare("SELECT COUNT(DISTINCT json_extract(t.value,'$.id')) AS count FROM playlists p,json_each(p.tracks) t").first<{count:number}>(),
      ]);
      return Response.json({ summary:true, totalTracks:count?.count || 0, playlists:rows.results.map(p => ({id:p.id,title:p.title,updatedAt:p.updated_at,trackCount:p.count,summaryOnly:true,tracks:p.first_track ? [JSON.parse(p.first_track)] : [],thumbnail:p.thumbnail || "",views:p.views})) }, {headers:{"Cache-Control":"no-store"}});
    }
    const metadata = await database().prepare('SELECT id,thumbnail,views FROM playlist_meta').all<{id:string;thumbnail:string;views:number|null}>();
    const byId = new Map(metadata.results.map(m=>[m.id,m]));
    const result = await database()
      .prepare(
        "SELECT id,title,tracks,updated_at FROM playlists ORDER BY updated_at DESC",
      )
      .all<{ id: string; title: string; tracks: string; updated_at: number }>();
    return Response.json(
      packLibrary(result.results.map((p) => ({
          id: p.id,
          title: p.title,
          tracks: JSON.parse(p.tracks),
          updatedAt: p.updated_at,
          thumbnail: byId.get(p.id)?.thumbnail || JSON.parse(p.tracks)[0]?.thumbnail || "",
          views: byId.get(p.id)?.views ?? null,
        })), result.results.reduce((latest, p) => Math.max(latest, p.updated_at || 0), 0)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
