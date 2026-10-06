import {database} from '../../../db';
import {failure} from '../../../lib/server';
import {kindOf} from '../../../lib/collections';
import {monthOf} from '../../../lib/archive';
import {monthStart,type Addition} from '../../../lib/recent-additions';
export async function GET(){
  try{
    const db=database(),now=Date.now(),date=new Date(now+9*3600000);
    const month=`${date.getUTCFullYear()}.${String(date.getUTCMonth()+1).padStart(2,'0')}`;
    const rows=await db.prepare('SELECT id,title FROM playlists').all<{id:string;title:string}>();
    const latest=rows.results.filter(p=>kindOf(p)==='picks'&&monthOf(p.title)===month).sort((a,b)=>a.id.localeCompare(b.id))[0];
    if(!latest)return Response.json({items:[],count:0},{headers:{'Cache-Control':'no-store'}});
    const saved=await db.prepare('SELECT data FROM pick_additions WHERE playlist_id=?').bind(latest.id).first<{data:string}>();
    const items=(saved?JSON.parse(saved.data) as Addition[]:[]).filter(x=>x.at>=monthStart(now));
    return Response.json({items:items.slice(0,100),count:items.length,playlist:latest},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return failure(e);}
}
