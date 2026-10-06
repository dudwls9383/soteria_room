"use client";
import {useEffect,useState} from 'react';
import {ChevronDown,Play,Plus} from 'lucide-react';
import {useRoomAudio} from './room-experience';
import type {Addition} from '../lib/recent-additions';
export default function RecentPickAdditions({revision,language}:{revision:number;language:'ko'|'en'|'ja'}){
  const [data,setData]=useState<{items:Addition[];count:number}|null>(null),[open,setOpen]=useState(false);
  const audio=useRoomAudio(),ja=language==='ja',en=language==='en';
  useEffect(()=>{const controller=new AbortController();void fetch('/api/pick-additions',{signal:controller.signal}).then(async r=>r.ok?await r.json() as {items:Addition[];count:number}:null).then(setData).catch(()=>{});return()=>controller.abort();},[revision]);
  if(!data)return null;
  const label=ja?'今月追加された曲':en?'Added this month':'이번 달 새로 담긴 곡';
  return <div className="recent-pick-additions notranslate" translate="no">
    <button className="recent-additions-toggle" disabled={!data.count} aria-expanded={open} onClick={()=>setOpen(!open)}><span>{label}</span><span>{data.count?`${data.count}${ja?'曲':en?' songs':'곡'}`:ja?'更新後の追加曲を記録します':en?'New additions are tracked after refresh':'갱신 후 추가된 곡을 기록해요'}</span>{!!data.count&&<ChevronDown size={14}/>}</button>
    {open&&<div className="recent-additions-list">{data.items.map(({track})=><div key={track.id}><button onClick={()=>audio.play(track)} aria-label={`${track.title} ${ja?'再生':en?'play':'재생'}`}><Play size={14}/></button><span>{track.title}<small>{track.artist}</small></span><button onClick={()=>audio.add([track])} aria-label={`${track.title} ${ja?'追加':en?'add':'담기'}`}><Plus size={14}/></button></div>)}{data.count>data.items.length&&<p>{ja?'直近100曲を表示しています':en?'Showing the latest 100 songs':'최근 추가된 100곡을 표시해요'}</p>}</div>}
  </div>;
}
