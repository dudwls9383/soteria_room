import {database} from '../db';
import {buildMonthlyPickIndex} from './music-index';
import {smallChannelPool} from './small-channel-store';
import {currentDataset} from './channel-dataset';
import {videoFacts} from './video-fact-store';
import {subscriberNumber,type SmallChannel} from './small-channels';
import type {Playlist} from './music';

export async function pickChannelSources(){
  const db=database();
  const rows=await db.prepare('SELECT id,title,tracks,updated_at FROM playlists').all<{id:string;title:string;tracks:string;updated_at:number}>();
  const music=buildMonthlyPickIndex(rows.results.map(p=>({id:p.id,title:p.title,tracks:JSON.parse(p.tracks),updatedAt:p.updated_at} as Playlist & {updatedAt:number})));
  const pool=await smallChannelPool();
  const {dataset,updatedAt}=await currentDataset();
  const facts=await videoFacts();
  const stats=await db.prepare('SELECT id,subscribers,avatar,checked_at FROM channel_statistics').all<{id:string;subscribers:number|null;avatar:string|null;checked_at:number}>();
  const byId=new Map(pool.channels.map(c=>[c.id,c]));
  for(const [id,c] of Object.entries(dataset.channels))if(!byId.has(id))byId.set(id,{id,title:c.title,url:`https://www.youtube.com/channel/${id}`,avatar:c.avatar||undefined,tags:[],subscribers:subscriberNumber(c.subscriberCount),checkedAt:updatedAt,source:'json'});
  const ownerNames=new Map(music.filter(t=>t.channelId).map(t=>[t.channelId!,t.artist]));
  for(const f of facts)if(f.channelId&&!ownerNames.has(f.channelId))ownerNames.set(f.channelId,f.channelTitle||'YouTube');
  for(const [id,title] of ownerNames)if(!byId.has(id))byId.set(id,{id,title,url:`https://www.youtube.com/channel/${id}`,tags:[],subscribers:null,checkedAt:null,source:'unknown'});
  for(const c of stats.results){
    const previous=byId.get(c.id);
    if(previous||ownerNames.has(c.id))byId.set(c.id,{...previous,id:c.id,title:previous?.title||ownerNames.get(c.id)!,url:`https://www.youtube.com/channel/${c.id}`,avatar:c.avatar||previous?.avatar,tags:previous?.tags||[],subscribers:c.subscribers,checkedAt:c.checked_at,source:'api'} as SmallChannel);
  }
  return {music,roster:[...byId.values()],facts};
}
