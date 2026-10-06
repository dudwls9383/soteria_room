import type { Track } from './music';
export type Addition = {track:Track;at:number};
// A first import is a baseline, not evidence that every song was added today.
export function mergeAdditions(previous:Track[]|null,current:Track[],history:Addition[],now:number):Addition[]{
  const live=new Map(current.map(t=>[t.id,t]));
  const prior=new Set(previous?.map(t=>t.id));
  const result=new Map((previous?history:[]).filter(x=>live.has(x.track.id)).map(x=>[x.track.id,{...x,track:live.get(x.track.id)!}]));
  if(previous)for(const track of current)if(!prior.has(track.id))result.set(track.id,{track,at:now});
  return [...result.values()].sort((a,b)=>b.at-a.at).slice(0,2000);
}
export function monthStart(now:number){
  const kst=new Date(now+9*3600000);
  return Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),1)-9*3600000;
}
