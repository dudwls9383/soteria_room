import {youtubeVideoId} from './thumbnails.ts';
export const bottleKey=(item:{id:string;url:string})=>youtubeVideoId(item.url)||item.id;
// Deduplicate songs as well as bottles. A different sender cannot repeat a seen video.
export function unseenBottles<T extends {id:string;url:string}>(items:T[],seen:string[]):T[]{
  const excluded=new Set(seen),unique=new Map<string,T>();
  for(const item of items){const key=bottleKey(item);if(!excluded.has(key)&&!unique.has(key))unique.set(key,item);}
  return [...unique.values()];
}
