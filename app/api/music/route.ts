import { database } from "../../../db";
import { failure } from "../../../lib/server";
import type { Playlist } from "../../../lib/music";
import { buildMusicIndex, buildMonthlyPickIndex, filterMusicIndex } from "../../../lib/music-index";
import type { Scope } from "../../../lib/collections";
import { buildPicks, dailySample } from "../../../lib/picks";
import { videoFacts } from "../../../lib/video-fact-store";
import { FACT_TTL, hiddenCandidate, resultPage } from "../../../lib/video-facts";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const facts=await videoFacts();
    const fresh=new Map(facts.filter(f=>Date.now()-f.checkedAt<FACT_TTL).map(f=>[f.id,f]));
    if(url.searchParams.get("mode")==="hidden"&&!fresh.size)return Response.json({music:[],page:1,pages:1,total:0,known:0,checkedAt:0},{headers:{"Cache-Control":"no-store"}});
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
    const mode = url.searchParams.get("mode");
    // Other Pick shelves always use monthly Picks. Hidden gems default to that same
    // scope, but visitors can explicitly expand this one filter to all saved songs.
    const monthlyOnly=mode==="picks" || (mode==="hidden"&&url.searchParams.get("scope")!=="all");
    const allMusic = monthlyOnly ? buildMonthlyPickIndex(playlists) : buildMusicIndex(playlists);
    const music=allMusic.filter(t=>!fresh.has(t.id)||fresh.get(t.id)!.availability==="available");
    if(url.searchParams.get("mode")==="hidden"){
      const views=Math.max(0,Number(url.searchParams.get("views")||10000)),seconds=Math.max(60,Number(url.searchParams.get("seconds")||600)),before=url.searchParams.get("before")||"";
      const candidates=music.filter(t=>fresh.has(t.id)&&hiddenCandidate(fresh.get(t.id)!,views,seconds,before)).sort((a,b)=>fresh.get(a.id)!.views!-fresh.get(b.id)!.views!||a.id.localeCompare(b.id));
      const nonce=(url.searchParams.get("nonce")||"").slice(0,80);
      const page=resultPage(nonce ? dailySample(candidates,nonce,candidates.length) : candidates,Number(url.searchParams.get("page")||1));
      return Response.json({...page,music:page.music.map(t=>({...t,fact:fresh.get(t.id)})),total:candidates.length,known:music.filter(t=>fresh.has(t.id)).length,checkedAt:music.reduce((n,t)=>Math.max(n,fresh.get(t.id)?.checkedAt||0),0)},{headers:{"Cache-Control":"no-store"}});
    }
    if (url.searchParams.get("mode") === "picks") {
      return Response.json(buildPicks(music, {
        year: url.searchParams.get("year") || undefined,
        quarter: Number(url.searchParams.get("quarter")) || undefined,
        refresh: url.searchParams.get("refresh") || undefined,
        nonce: (url.searchParams.get("nonce") || "").slice(0, 80),
        memoryYear: url.searchParams.get("memoryYear") || undefined,
      }), { headers: { "Cache-Control": "no-store" } });
    }
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
