import {failure} from '../../../lib/server';
import {pickChannelSources} from '../../../lib/pick-channel-store';
import {buildPickChannels} from '../../../lib/pick-channels';
import {resultPage} from '../../../lib/video-facts';
import {dailySample} from '../../../lib/picks';

export async function GET(request:Request){
  try{
    const url=new URL(request.url),params=url.searchParams;
    const source=await pickChannelSources();
    const views=Number(params.get('views')||1000),subscribers=Number(params.get('subscribers')||10000);
    const data=buildPickChannels(source.music,source.roster,source.facts,Number.isFinite(views)?Math.max(0,views):1000);
    const view=params.get('view')||'small',page=Number(params.get('page')||1),q=(params.get('q')||'').trim().toLowerCase(),nonce=(params.get('nonce')||'').slice(0,80);
    const eligible=data.channels.filter(c=>c.subscribers!==null&&c.subscribers<(Number.isFinite(subscribers)?Math.max(0,subscribers):10000));
    const pool=(view==='all'?data.channels:eligible).filter(c=>!q||c.title.toLowerCase().includes(q));
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const byKey=new Map(pool.map(c=>[c.key,c]));
    const sorted=dailySample(pool.map(c=>({id:c.key})),`${day}:pick-channels:${nonce}`,pool.length).map(c=>byKey.get(c.id)!);
    const channels=resultPage(sorted,page);
    const songs=resultPage(nonce?dailySample(data.music,nonce,data.music.length):data.music,page);
    return Response.json({total:data.total,identified:data.identified,eligible:eligible.length,knownViews:data.knownViews,checkedAt:data.checkedAt,page:view==='low'?songs.page:channels.page,pages:view==='low'?songs.pages:channels.pages,resultTotal:view==='low'?data.music.length:pool.length,channels:view==='low'?[]:channels.music.map(c=>({...c,music:c.music.slice(0,3),trackCount:c.music.length})),music:view==='low'?songs.music:[]},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return failure(e);}
}
