import { database } from "../../../db";
import { failure } from "../../../lib/server";
import type { Playlist } from "../../../lib/music";
import { buildMusicIndex, filterMusicIndex } from "../../../lib/music-index";
import type { Scope } from "../../../lib/collections";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await database()
      .prepare(
        "SELECT id,title,tracks,updated_at FROM playlists ORDER BY updated_at DESC",
      )
      .all<{ id: string; title: string; tracks: string; updated_at: number }>();
    const playlists = result.results.map(
      (p) =>
        ({
          id: p.id,
          title: p.title,
          tracks: JSON.parse(p.tracks),
          updatedAt: p.updated_at,
        }) as Playlist & { updatedAt: number },
    );
    const music = buildMusicIndex(playlists);
    const filtered = filterMusicIndex(music, {
      q: url.searchParams.get("q") || "",
      scope: (url.searchParams.get("scope") || "all") as Scope | "all",
      year: url.searchParams.get("year") || "all",
      month: url.searchParams.get("month") || "all",
      collection: url.searchParams.get("collection") || "all",
    });
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 5000);
    return Response.json(
      {
        total: filtered.length,
        music: filtered.slice(0, limit),
        available: {
          years: [...new Set(music.flatMap((m) => m.years))].sort().reverse(),
          months: [...new Set(music.flatMap((m) => m.months))].sort().reverse(),
          collections: [...new Set(music.flatMap((m) => m.collections))],
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
