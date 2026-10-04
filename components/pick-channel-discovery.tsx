"use client";
import {useEffect,useState} from 'react';
import {ExternalLink,Play,Plus,RefreshCw} from 'lucide-react';
import {useRoomAudio} from './room-experience';
import type {PickChannel} from '../lib/pick-channels';
import type {MusicRecord} from '../lib/music-index';
type Snapshot={total:number;identified:number;eligible:number;knownViews:number;checkedAt:number;page:number;pages:number;resultTotal:number;channels:(PickChannel & {trackCount:number})[];music:(MusicRecord & {views:number;factCheckedAt:number})[]};
export default function PickChannelDiscovery({adminKey=''}:{adminKey?:string}){
  const audio=useRoomAudio();
  const [view,setView]=useState('small'),[limit,setLimit]=useState('10000'),[views,setViews]=useState('1000'),[q,setQ]=useState(''),[page,setPage]=useState(1),[nonce,setNonce]=useState('');
  const [data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[updating,setUpdating]=useState(false),[note,setNote]=useState('');
  useEffect(()=>{
    const c=new AbortController();setBusy(true);setError('');
    fetch(`/api/pick-channels?${new URLSearchParams({view,subscribers:limit,views,q,page:String(page),nonce})}`,{signal:c.signal}).then(async r=>{const d=await r.json() as Snapshot & {error?:string};if(!r.ok)throw new Error(d.error);setData(d);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setBusy(false);});
    return ()=>c.abort();
  },[view,limit,views,q,page,nonce]);
  async function update(){
    setUpdating(true);setError('');setNote('');
    try{
      const headers={'Content-Type':'application/json','x-soteria-admin-key':adminKey};
      const a=await fetch('/api/video-facts',{method:'POST',headers,body:JSON.stringify({scope:'picks'})});const f=await a.json() as {updated:number;remaining:number;error?:string};if(!a.ok)throw new Error(f.error);
      const b=await fetch('/api/small-channels',{method:'POST',headers,body:JSON.stringify({scope:'picks'})});const s=await b.json() as {updated:number;remaining:number;error?:string};if(!b.ok)throw new Error(s.error);
      setNote(`영상 ${f.updated}곡 · 채널 ${s.updated}개 확인 · 남은 영상 ${f.remaining}곡 / 채널 ${s.remaining}개`);setNonce(String(Date.now()));setPage(1);
    }catch(e){setError((e as Error).message);}finally{setUpdating(false);}
  }
  return <section className="pick-shelf pick-channel-discovery" aria-busy={busy}>
    <div className="pick-shelf-heading"><div><span className="room-eyebrow">FROM MONTHLY PICKS</span><h2>월의 픽에서 만난 채널</h2><p className="pick-reason">월의 픽에 담긴 채널만 모았어요. 덜 알려진 목소리와 아직 덜 들은 곡을 만나보세요.</p></div><button className="room-button subtle" disabled={busy} onClick={()=>{setNonce(String(Date.now()));setPage(1);}}><RefreshCw size={15}/>다른 추천 보기</button></div>
    <div className="pick-channel-controls glass">
      <div className="channel-hub-tabs" role="group" aria-label="월의 픽 추천 종류">{[['small','하꼬 추천'],['low','저조회곡'],['all','전체 채널']].map(([id,title])=><button key={id} className="room-button subtle" aria-pressed={view===id} onClick={()=>{setView(id);setPage(1);}}>{title}</button>)}</div>
      <div className="control-row">
        {view==='small'&&<label>구독자 수<select value={limit} onChange={e=>{setLimit(e.target.value);setPage(1);}}>{[10000,5000,2000,1000,500,100].map(n=><option key={n} value={n}>{`${n.toLocaleString()}명 미만`}</option>)}</select></label>}
        {view==='low'?<label>조회수<select value={views} onChange={e=>{setViews(e.target.value);setPage(1);}}>{[10000,5000,1000,800,500,200,100,50].map(n=><option key={n} value={n}>{`${n.toLocaleString()}회 이하`}</option>)}</select></label>:<label>채널 찾기<input value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="월의 픽에 담긴 채널 이름"/></label>}
      </div>
      {data&&<p className="pick-reason">{`월의 픽 채널 ${data.total.toLocaleString()}개 · ID 연결 ${data.identified.toLocaleString()}개 · 조회수 확인 ${data.knownViews.toLocaleString()}곡`}</p>}
      <p className="pick-reason">미확인 구독자 수와 조회수는 0으로 분류하지 않아요. 구독자 수는 마지막 확인값이며, 저조회곡은 7일 이내 확인한 정보를 사용해요.</p>
      {adminKey&&<div><button className="room-button subtle" disabled={updating} onClick={()=>void update()}><RefreshCw size={13}/>{updating?'정보 확인 중…':'월의 픽 추천 정보 갱신'}</button><small className="pick-reason">한 번에 영상·채널 각각 최대 50개만 확인해요.</small></div>}
      {note&&<p role="status" className="pick-reason">{note}</p>}
    </div>
    {error&&<p className="room-message error" role="alert">{error}<button className="room-button subtle" onClick={()=>setNonce(String(Date.now()))}>다시 시도</button></p>}
    {busy&&!data&&<p className="room-message" role="status">월의 픽 추천을 불러오는 중…</p>}
    {data&&<>
      <p className="pick-reason">{`조건에 맞는 ${data.resultTotal.toLocaleString()}${view==='low'?'곡':'개 채널'}${view==='low'&&data.checkedAt?` · ${new Date(data.checkedAt).toLocaleDateString('ko-KR')} 기준`:''}`}</p>
      {!data.resultTotal&&<p className="room-message">조건에 맞는 추천이 아직 없어요. 다른 조건이나 전체 채널을 확인해 주세요.</p>}
      {view==='low'?<div className="pick-album-grid">{data.music.map(t=><article className="pick-album glass" key={t.id}><button className="pick-cover" onClick={()=>audio.play(t)} aria-label={`${t.title} · 사이트에서 듣기`}><img src={t.thumbnail} alt="" loading="lazy"/><span><Play size={19}/></span></button><div className="pick-album-copy"><h3 className="notranslate" translate="no">{t.title}</h3><p className="notranslate" translate="no">{t.artist}</p><small>{t.views.toLocaleString()}회</small><button className="room-button subtle" onClick={()=>audio.add([t])}><Plus size={13}/>목록에 담기</button></div></article>)}</div>:<div className="pick-channel-grid">{data.channels.map(c=><article className="pick-channel-card glass" key={c.key}>
        <div className="pick-channel-identity">{c.avatar?<img src={c.avatar} alt="" loading="lazy"/>:<span className="pick-channel-avatar" aria-hidden="true">{c.title.slice(0,1)}</span>}<div><h3 className="notranslate" translate="no">{c.title}</h3><small>{`${c.subscribers===null?'구독자 수 미확인':`${c.subscribers.toLocaleString()}명`} · 월의 픽 ${c.trackCount}곡`}</small>{c.match==='name'&&<small>채널 이름 일치로 연결 · ID 재확인 전</small>}{c.match==='unknown'&&<small>채널 ID 확인 전</small>}</div></div>
        <div className="pick-channel-tracks">{c.music.map(t=><div key={t.id}><button className="pick-channel-track" onClick={()=>audio.play(t)} aria-label={`${t.title} · 사이트에서 듣기`}><Play size={13}/><span className="notranslate" translate="no">{t.title}</span></button><button className="room-button subtle" onClick={()=>audio.add([t])} aria-label={`${t.title} · 듣기 목록에 담기`}><Plus size={13}/></button></div>)}</div>
        {c.id&&<a className="pick-channel-link" href={`https://www.youtube.com/channel/${c.id}`} target="_blank" rel="noreferrer">YouTube 채널 <ExternalLink size={12}/></a>}
      </article>)}</div>}
      {data.pages>1&&<div className="control-row pick-channel-pages"><button className="room-button subtle" disabled={busy||data.page===1} onClick={()=>setPage(data.page-1)}>이전</button><span>{data.page} / {data.pages}</span><button className="room-button subtle" disabled={busy||data.page===data.pages} onClick={()=>setPage(data.page+1)}>다음</button></div>}
    </>}
  </section>;
}
