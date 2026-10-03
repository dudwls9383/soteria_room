import { env } from "cloudflare:workers";
import { database } from "../../../db";
import { body, failure, requireAdmin } from "../../../lib/server";
import { refreshVideoFacts, videoFacts } from "../../../lib/video-fact-store";
import { FACT_TTL } from "../../../lib/video-facts";
export async function GET() {
  try {
    const facts = await videoFacts();
    const rows = await database()
      .prepare(
        "SELECT DISTINCT json_extract(t.value,'$.id') AS id,json_extract(t.value,'$.title') AS title FROM playlists p,json_each(p.tracks) t",
      )
      .all<{
        id: string;
        title: string;
      }>();
    const names = new Map(rows.results.map((r) => [r.id, r.title]));
    const fresh = facts.filter((f) => Date.now() - f.checkedAt < FACT_TTL);
    return Response.json(
      {
        apiConfigured: !!(env as any).YOUTUBE_API_KEY,
        total: names.size,
        known: fresh.filter((f) => names.has(f.id)).length,
        checkedAt: facts.reduce((n, f) => Math.max(n, f.checkedAt), 0),
        unavailable: fresh
          .filter((f) => names.has(f.id) && f.availability !== "available")
          .map((f) => ({ ...f, title: names.get(f.id) })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request, 1000);
    return Response.json(await refreshVideoFacts(input.scope === "picks"));
  } catch (e) {
    return failure(e);
  }
}
