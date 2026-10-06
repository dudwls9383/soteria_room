import {database} from '../db';
import {kindOf} from './collections';
import {mergeAdditions,type Addition} from './recent-additions';
import type {Playlist} from './music';
// Called before the playlist write. The same lease guard makes both writes atomic.
export async function additionWrite(p:Playlist,stage:string,owner:string,now:number){
  if(kindOf(p)!=='picks')return [];
  const db=database();
  const prior=await db.prepare('SELECT tracks FROM playlists WHERE id=?').bind(p.id).first<{tracks:string}>();
  const saved=await db.prepare('SELECT data FROM pick_additions WHERE playlist_id=?').bind(p.id).first<{data:string}>();
  const data=mergeAdditions(prior?JSON.parse(prior.tracks):null,p.tracks,saved?JSON.parse(saved.data) as Addition[]:[],now);
  return [db.prepare("INSERT INTO pick_additions(playlist_id,data,updated_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM channel_sync WHERE id=? AND owner=?) ON CONFLICT(playlist_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(p.id,JSON.stringify(data),now,stage,owner)];
}
