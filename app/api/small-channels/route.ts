import { env } from "cloudflare:workers";
import { database } from "../../../db";
import { body, failure, requireAdmin, ApiError } from "../../../lib/server";
import { smallChannelPool } from "../../../lib/small-channel-store";
import { matchesBand, officialSubscriberCount } from "../../../lib/small-channels";
import {pickChannelSources} from "../../../lib/pick-channel-store";
import {buildPickChannels} from "../../../lib/pick-channels";
import {STATS_TTL} from "../../../lib/small-channel-store";
export async function GET() {
  try {
    const pool=await smallChannelPool();
    return Response.json({channels:pool.channels,remaining:pool.due.length,rosterSource:pool.rosterSource,apiConfigured:!!(env as any).YOUTUBE_API_KEY,known:pool.channels.filter(c=>c.subscribers!==null).length,eligible:pool.channels.filter(c=>matchesBand(c.subscribers,"all")).length},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {return failure(error);}
}
// Only an administrator can refresh. IDs come from saved sources, never the client.
// Each click/run processes at most 50 channels per request and skips fresh results.
export async function POST(request:Request) {
  let owner:string|undefined;
  try {
    requireAdmin(request); const input=await body(request,1000);
    const key=(env as any).YOUTUBE_API_KEY;
    if(!key) throw new ApiError("공식 YouTube API 연결이 아직 준비되지 않았어요. 저장된 JSON 정보로 추천을 이용할 수 있습니다.");
    const pool=await smallChannelPool();
    if(input.scope==='picks'){
      const source=await pickChannelSources();
      const channels=buildPickChannels(source.music,source.roster,source.facts).channels;
      const saved=await database().prepare('SELECT id,checked_at FROM channel_statistics').all<{id:string;checked_at:number}>();
      const checked=new Map(saved.results.map(c=>[c.id,c.checked_at]));
      // Only channels proven to appear in saved monthly Picks; never arbitrary visitor IDs.
      pool.due=channels.filter(c=>c.id&&/^UC[\w-]{22}$/.test(c.id)&&(!checked.has(c.id)||Date.now()-checked.get(c.id)!>=STATS_TTL)).map(c=>({id:c.id!,title:c.title,url:`https://www.youtube.com/channel/${c.id}`,tags:[],subscribers:c.subscribers,checkedAt:c.checkedAt,source:'unknown' as const}));
    }
    owner=crypto.randomUUID();
    const claimed=await database().prepare("UPDATE channel_statistics_lock SET owner=?,lease_until=? WHERE id='main' AND lease_until<=?").bind(owner,Date.now()+60000,Date.now()).run();
    if(!claimed.meta.changes) throw new ApiError("다른 창에서 구독자 수를 갱신하고 있어요.",409);
    const batch=pool.due.slice(0,50);
    if(!batch.length) return Response.json({updated:0,remaining:0});
    const params=new URLSearchParams({part:"snippet,statistics",id:batch.map(c=>c.id).join(","),maxResults:"50",key});
    const response=await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`,{signal:AbortSignal.timeout(20000)});
    const data:any=await response.json();
    if(!response.ok) throw new ApiError(response.status===429 || data.error?.errors?.some((e:any)=>e.reason==="quotaExceeded") ? "YouTube 조회 한도에 도달해 갱신을 멈췄어요. 기존 정보는 유지됩니다." : "공식 YouTube API를 사용할 수 없어요. 키의 사용 설정과 제한을 확인해 주세요.",502);
    if(!Array.isArray(data.items)) throw new ApiError("채널 응답을 확인하지 못했어요. 기존 정보를 유지합니다.",502);
    const items=new Map<string,any>(data.items.map((c:any)=>[c.id,c]));
    const now=Date.now();
    await database().batch(batch.map(c=>{
      const item=items.get(c.id),thumb=item?.snippet?.thumbnails;
      const count=officialSubscriberCount(item);
      // Missing/private channels are unknown, with a timestamp to prevent repeated requests.
      return database().prepare("INSERT INTO channel_statistics (id,subscribers,avatar,checked_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM channel_statistics_lock WHERE id='main' AND owner=?) ON CONFLICT(id) DO UPDATE SET subscribers=excluded.subscribers,avatar=excluded.avatar,checked_at=excluded.checked_at").bind(c.id,count,thumb?.medium?.url || thumb?.default?.url || null,now,owner);
    }));
    return Response.json({updated:batch.length,remaining:Math.max(0,pool.due.length-batch.length)});
  } catch(error) {return failure(error);}
  finally {if(owner) await database().prepare("UPDATE channel_statistics_lock SET owner=NULL,lease_until=0 WHERE id='main' AND owner=?").bind(owner).run();}
}
