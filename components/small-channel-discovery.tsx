"use client";
import { useEffect, useRef, useState } from "react";
import ChannelPreview from "./channel-preview";
import {localizedChannelTags,compareChannelTags} from "../lib/channel-labels";
import { ExternalLink, RefreshCw, Shuffle, Users } from "lucide-react";
import { matchesBand, subscriberBands, type SmallChannel } from "../lib/small-channels";
import { sampleUnique } from "../lib/collections";
type Snapshot={channels:SmallChannel[];remaining:number;known:number;eligible:number;apiConfigured:boolean;rosterSource:string};
const copy={
 ko:{title:"아 하꼬 너무 좋아, 하꼬추천 만들어야지",intro:"구독목록에서 작은 채널을 발견해 보세요. 구독자 수는 마지막으로 확인한 정보입니다.",all:"1만 명 미만 전체",everything:"전체 채널",over:"1만 명 이상",unknown:"미확인",tag:"태그",any:"전체 태그",search:"채널 이름 검색",random:"랜덤 12개",list:"전체보기",empty:"조건에 맞는 채널이 없어요.",hint:"다른 구간을 고르거나 미확인 채널을 둘러보세요.",loading:"채널을 불러오는 중…",failed:"채널 정보를 불러오지 못했어요.",prev:"이전",next:"다음",stats:"구독자 수 갱신",refresh:"오래된 정보 갱신",stop:"다음 묶음부터 중단",configured:"7일 지난 채널만 50개씩 갱신합니다. 일반 방문자는 저장된 정보만 읽습니다.",missing:"공식 YouTube API 연결 준비 중 · 현재는 JSON에 저장된 정보로 추천합니다.",locked:"갱신하려면 가져오기 · 동기화에서 관리자 잠금을 열어 주세요.",saved:"JSON 저장 정보",api:"공식 API 확인",noDate:"확인일 미상",retry:"다시 불러오기",count:"명",summary:"후보 / 구독자 확인 / 1만 미만",done:"갱신 완료",stopped:"갱신 중단 · 완료된 정보는 저장했어요.",working:"갱신 중",remaining:"남은 채널",note:"미확인은 0명으로 분류하지 않습니다. 공개 구독자 수는 실제 수치와 다소 차이가 있을 수 있어요."},
 en:{title:"I love small channels. Let’s discover more.",intro:"Explore channels from the saved roster. Subscriber counts reflect the last check.",all:"All under 10,000",everything:"All channels",over:"10,000 or more",unknown:"Unknown",tag:"Tag",any:"All tags",search:"Search channel names",random:"Random 12",list:"View all",empty:"No channels match these filters.",hint:"Try another range or explore unknown counts.",loading:"Loading channels…",failed:"Could not load channels.",prev:"Previous",next:"Next",stats:"Subscriber updates",refresh:"Refresh outdated counts",stop:"Stop after this batch",configured:"Only counts older than 7 days are refreshed, 50 channels per batch. Visitors use saved data.",missing:"YouTube API setup pending · Recommendations currently use saved JSON data.",locked:"Unlock admin access in Import & sync to refresh.",saved:"Saved JSON",api:"Official API",noDate:"Date unknown",retry:"Reload",count:"subscribers",summary:"Roster / Known counts / Under 10,000",done:"Update complete",stopped:"Stopped · Completed updates were saved.",working:"Updating",remaining:"Remaining",note:"Unknown counts are not treated as zero. Public subscriber counts may be rounded."},
 ja:{title:"小さなチャンネルが大好き。おすすめを探そう。",intro:"保存されたチャンネル一覧から探しましょう。登録者数は最終確認時の情報です。",all:"1万人未満すべて",everything:"全チャンネル",over:"1万人以上",unknown:"未確認",tag:"タグ",any:"すべてのタグ",search:"チャンネル名を検索",random:"ランダム12件",list:"すべて表示",empty:"条件に合うチャンネルがありません。",hint:"別の範囲や未確認のチャンネルも見てみましょう。",loading:"読み込み中…",failed:"チャンネルを読み込めませんでした。",prev:"前へ",next:"次へ",stats:"登録者数の更新",refresh:"古い情報を更新",stop:"この処理後に停止",configured:"7日以上経過した情報を50件ずつ更新します。閲覧者には保存済み情報を表示します。",missing:"YouTube APIの設定待ち · 現在はJSONの保存情報を使用します。",locked:"更新するにはインポート・同期で管理者ロックを解除してください。",saved:"JSON保存情報",api:"公式API確認",noDate:"確認日不明",retry:"再読み込み",count:"人",summary:"候補 / 登録者数確認済み / 1万人未満",done:"更新完了",stopped:"停止しました。完了分は保存済みです。",working:"更新中",remaining:"残り",note:"未確認を0人として扱いません。公開登録者数は概数の場合があります。"},
};
export default function SmallChannelDiscovery({adminKey,language="ko",picksOnly=false}:{adminKey:string;language?:"ko"|"en"|"ja";picksOnly?:boolean}) {
 const tagNames:Record<string,string>=localizedChannelTags(language);
 const t=copy[language], [data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [band,setBand]=useState("all"),[tag,setTag]=useState("all"),[query,setQuery]=useState(""),[page,setPage]=useState(1),[picked,setPicked]=useState<SmallChannel[]|null>(null),[refreshing,setRefreshing]=useState(false),[remaining,setRemaining]=useState(0);
 const [preview,setPreview]=useState<SmallChannel|null>(null);
 const stop=useRef(false),mounted=useRef(true);
 async function load(signal?:AbortSignal) {
   const response=await fetch(`/api/small-channels?scope=${picksOnly?'picks':'all'}`,{cache:"no-store",signal});
   const value=await response.json() as Snapshot & {error?:string};
   if(!response.ok) throw new Error(value.error || t.failed);
   if(mounted.current&&!signal?.aborted){setData(value);setRemaining(value.remaining);}
 }
 useEffect(()=>{const c=new AbortController();mounted.current=true;setLoading(true);setData(null);setError("");setPicked(null);setPage(1);setPreview(null);void load(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>{c.abort();mounted.current=false;stop.current=true;};},[picksOnly]);
 const channels=data?.channels || [];
 const tags=[...new Set(channels.flatMap(c=>c.tags))].sort(compareChannelTags);
 const filtered=channels.filter(c=>matchesBand(c.subscribers,band) && (tag==="all"||c.tags.includes(tag)) && c.title.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>(b.subscribers??-1)-(a.subscribers??-1)||a.title.localeCompare(b.title));
 const result=picked || filtered, pages=Math.max(1,Math.ceil(result.length/60)),currentPage=Math.min(page,pages),visible=result.slice((currentPage-1)*60,currentPage*60);
 function reset(){setPage(1);setPicked(null);}
 async function refresh() {
   if(refreshing || !adminKey || !data?.apiConfigured) return;
   setRefreshing(true);setError("");setNotice("");stop.current=false;
   try {
     while(!stop.current){
       const response=await fetch("/api/small-channels",{method:"POST",headers:{"Content-Type":"application/json","x-soteria-admin-key":adminKey},body:JSON.stringify({scope:picksOnly?"picks":"all"})});
       const value=await response.json() as {error?:string;remaining:number};
       if(!response.ok) throw new Error(value.error || t.failed);
       if(mounted.current)setRemaining(value.remaining);
       if(value.remaining===0) break;
     }
     if(mounted.current){await load();reset();setNotice(stop.current?t.stopped:t.done);}
   } catch(e){if(mounted.current){setError((e as Error).message);await load().catch(()=>{});}}
   finally{if(mounted.current)setRefreshing(false);}
 }
 return <div className="small-discovery notranslate" translate="no">
   <div className="room-heading"><div><div className="room-eyebrow">SMALL CHANNEL DISCOVERY</div><h1>{t.title}</h1><p>{t.intro}</p></div></div>
   {error && <p role="alert" className="room-message error">{error}<button className="room-button subtle" onClick={()=>{setError("");void load().catch(e=>setError(e.message));}}>{t.retry}</button></p>}
   {notice && <p role="status" className="room-message">{notice}</p>}
   <section className="small-controls glass">
    <small>{t.summary}</small><div className="small-totals">{channels.length.toLocaleString()} <span>/</span> {(data?.known||0).toLocaleString()} <span>/</span> {(data?.eligible||0).toLocaleString()}</div>
    <div className="small-bands" aria-label={t.stats}>{[{id:"everything",label:t.everything},{id:"10000plus",label:t.over},...[...subscriberBands].reverse().map(b=>({id:b.id,label:language==="ko"?b.label:b.label.replace("명",language==="ja"?"人":"")})),{id:"all",label:t.all},{id:"unknown",label:t.unknown}].map(b=><button key={b.id} aria-pressed={band===b.id} onClick={()=>{setBand(b.id);reset();}}>{b.label}<small>{channels.filter(c=>matchesBand(c.subscribers,b.id)).length.toLocaleString()}</small></button>)}</div>
    <div className="control-row"><label>{t.tag}<select value={tag} onChange={e=>{setTag(e.target.value);reset();}}><option value="all">{t.any}</option>{tags.map(tag=><option key={tag} value={tag}>{tagNames[tag]||tag}</option>)}</select></label><label className="wide">{t.search}<input value={query} onChange={e=>{setQuery(e.target.value);reset();}} placeholder={t.search}/></label><button className="room-button" disabled={!filtered.length||loading} onClick={()=>{setPicked(sampleUnique(filtered,12));setPage(1);}}><Shuffle size={16}/>{t.random}</button><button className="room-button subtle" aria-pressed={!picked} onClick={reset}>{t.list} · {filtered.length.toLocaleString()}</button></div>
   </section>
   {preview&&<ChannelPreview channel={preview} language={language} onClose={()=>setPreview(null)}/>}
   {loading ? <p role="status">{t.loading}</p> : <><div className="small-channel-grid">{visible.map(c=><article className="small-card-shell glass" key={c.id}><a className="small-channel-card" href={c.url} target="_blank" rel="noreferrer"><div className="small-avatar"><span>{c.title.slice(0,1)}</span>{c.avatar && <img src={c.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>}</div><div className="small-channel-copy"><h3>{c.title}</h3><strong>{c.subscribers===null?t.unknown:`${c.subscribers.toLocaleString()} ${t.count}`}</strong><p>{c.tags.slice(0,3).map(tag=>tagNames[tag]||tag).join(" · ")}</p><small>{c.source==="api"?t.api:c.source==="json"?t.saved:t.unknown} · {c.checkedAt?new Date(c.checkedAt).toLocaleDateString(language):t.noDate}</small></div><ExternalLink size={13}/></a><button className="room-button subtle small-preview-button" onClick={()=>setPreview(c)}>{language==="en"?"Preview":language==="ja"?"試聴":"미리듣기"}</button></article>)}</div>{!result.length&&<div className="room-empty glass"><Users size={28}/><h3>{t.empty}</h3><p>{t.hint}</p></div>}<nav className="subscription-pages" aria-label={t.list}><button className="room-button subtle" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>{t.prev}</button><span>{currentPage} / {pages}</span><button className="room-button subtle" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>{t.next}</button></nav></>}
   <p className="room-note">{t.note}</p>
   <details className="small-update glass"><summary>{t.stats}</summary><p>{data?.apiConfigured?t.configured:t.missing}</p>{!adminKey&&<p>{t.locked}</p>}<button className="room-button subtle" disabled={refreshing||!adminKey||!data?.apiConfigured||!data.remaining} onClick={()=>void refresh()}><RefreshCw size={15} className={refreshing?"spin":""}/>{refreshing?`${t.working} · ${t.remaining} ${remaining}`:t.refresh}</button>{refreshing&&<button className="room-button subtle" onClick={()=>{stop.current=true;}}>{t.stop}</button>}</details>
 </div>;
}
