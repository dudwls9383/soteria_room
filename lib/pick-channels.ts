import type { MusicRecord } from './music-index.ts';
import type { SmallChannel } from './small-channels.ts';
import { FACT_TTL, type VideoFact } from './video-facts.ts';

export type PickChannel = {
  key:string; id?:string; title:string; avatar?:string; subscribers:number|null;
  checkedAt:number|null; match:'id'|'name'|'unknown'; music:MusicRecord[];
};
export type PickChannelSnapshot = {
  channels:PickChannel[]; total:number; identified:number;
  knownViews:number; checkedAt:number;
  music:(MusicRecord & {views:number;factCheckedAt:number})[];
};
const validId=(id?:string)=>/^UC[\w-]{22}$/.test(id||'');
const name=(title:string)=>title.normalize('NFKC').trim().toLowerCase();

// Input music MUST be built from monthly Pick playlists before deduplication.
// Never use partial/fuzzy names to infer a channel or an unknown count as zero.
export function buildPickChannels(music:MusicRecord[],roster:SmallChannel[],facts:VideoFact[],maxViews=1000,now=Date.now()):PickChannelSnapshot {
  const byId=new Map(roster.map(c=>[c.id,c]));
  const byName=new Map<string,SmallChannel[]>();
  for(const c of roster){const key=name(c.title);byName.set(key,[...(byName.get(key)||[]),c]);}
  const byVideo=new Map(facts.map(f=>[f.id,f]));
  const groups=new Map<string,PickChannel>();
  for(const t of music){
    const f=byVideo.get(t.id);
    if(f&&now-f.checkedAt<FACT_TTL&&f.availability!=='available')continue;
    const rawId=validId(t.channelId)?t.channelId:validId(f?.channelId)?f!.channelId:undefined;
    const title=f?.channelTitle||t.artist;
    if(!rawId&&(!title||title==='YouTube'))continue;
    const exact=byName.get(name(title));
    const matched=rawId?byId.get(rawId):exact?.length===1?exact[0]:undefined;
    const id=rawId||matched?.id;
    const key=id||`name:${name(title)}`;
    const group=groups.get(key)||{key,id,title:matched?.title||title,avatar:matched?.avatar,subscribers:matched?.subscribers??null,checkedAt:matched?.checkedAt??null,match:rawId?'id':matched?'name':'unknown',music:[]} as PickChannel;
    group.music.push(t);groups.set(key,group);
  }
  const known=music.filter(t=>{const f=byVideo.get(t.id);return f&&now-f.checkedAt<FACT_TTL&&f.availability==='available'&&f.views!==null;});
  const low=known.filter(t=>byVideo.get(t.id)!.views!<=maxViews).map(t=>({...t,views:byVideo.get(t.id)!.views!,factCheckedAt:byVideo.get(t.id)!.checkedAt})).sort((a,b)=>a.views-b.views||a.id.localeCompare(b.id));
  const channels=[...groups.values()].sort((a,b)=>a.title.localeCompare(b.title));
  return {channels,total:channels.length,identified:channels.filter(c=>c.id).length,knownViews:known.length,checkedAt:known.reduce((n,t)=>Math.max(n,byVideo.get(t.id)!.checkedAt),0),music:low};
}
