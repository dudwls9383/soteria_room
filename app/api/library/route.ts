import { database } from "../../../db";
import { failure } from "../../../lib/server";
import { ensureMeta } from '../../../lib/playlist-meta';
export async function GET() {
  try {
    await ensureMeta();
    const metadata = await database().prepare('SELECT id,thumbnail,views FROM playlist_meta').all<{id:string;thumbnail:string;views:number|null}>();
    const byId = new Map(metadata.results.map(m=>[m.id,m]));
    const result = await database()
      .prepare(
        "SELECT id,title,tracks,updated_at FROM playlists ORDER BY updated_at DESC",
      )
      .all<{ id: string; title: string; tracks: string; updated_at: number }>();
    return Response.json(
      {
        lastUpdatedAt: result.results.reduce((latest, p) => Math.max(latest, p.updated_at || 0), 0),
        playlists: result.results.map((p) => ({
          id: p.id,
          title: p.title,
          tracks: JSON.parse(p.tracks),
          updatedAt: p.updated_at,
          thumbnail: byId.get(p.id)?.thumbnail,
          views: byId.get(p.id)?.views ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
