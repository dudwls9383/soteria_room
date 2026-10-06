"use client";
import { useRoomAudio } from "./room-experience";
import SongBottleIllustration from "./song-bottle-illustration";
import { useEffect, useRef, useState } from "react";
import { youtubeVideoId } from "../lib/thumbnails";
import {bottleKey,unseenBottles} from '../lib/bottle-draw';
import type { FormEvent } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Play, Send, Shuffle, Trash2, X } from "lucide-react";
import { useAutoDismissMessage } from "./use-auto-dismiss-message";

type Recommendation = {
  id: string;
  nickname: string;
  title: string;
  artist: string;
  url: string;
  note: string;
  createdAt: number;
};

const emptyForm = { nickname: "", title: "", artist: "", url: "", note: "" };

function videoId(url: string) {
  return youtubeVideoId(url)||"";
}

function shareLine(item: Recommendation) {
  return [
    `${item.title}${item.artist ? ` - ${item.artist}` : ""}`,
    item.url,
    item.note ? `“${item.note}”` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function SongBottleLite({adminKey="",language='ko'}:{adminKey?:string;language?:'ko'|'en'|'ja'}) {
  const audio=useRoomAudio();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [seen,setSeen]=useState<string[]>([]),[historyReady,setHistoryReady]=useState(false),[drawnId,setDrawnId]=useState('');
  const ja=language==='ja',en=language==='en';
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('room-bottle-seen-v1')||'[]');if(Array.isArray(saved))setSeen(saved.filter(x=>typeof x==='string').slice(-10000));}catch{}setHistoryReady(true);},[]);
  const unseen=unseenBottles(items,seen);
  function remember(next:string[]){setSeen(next);try{localStorage.setItem('room-bottle-seen-v1',JSON.stringify(next.slice(-10000)));}catch{/* Private browsing still keeps session-level history. */}}
  function drawBottle(){if(!unseen.length)return;const random=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;const item=unseen[Math.floor(random*unseen.length)];setDrawnId(item.id);remember([...seen,bottleKey(item)]);}
  const [form, setForm] = useState(emptyForm);
  const [metadataState,setMetadataState]=useState("");
  const lastAutofill=useRef({title:"",artist:""});
  const manualEdits=useRef({title:false,artist:false});
  useEffect(()=>{
    const id=youtubeVideoId(form.url);
    setMetadataState("");
    if(!id)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setMetadataState("영상 정보를 확인하는 중…");
      try {
        const response=await fetch(`/api/video-preview?url=${encodeURIComponent(form.url)}`,{signal:controller.signal});
        const data=await response.json() as {title:string;artist:string;error?:string};
        if(!response.ok)throw new Error(data.error);
        if(controller.signal.aborted)return;
        setForm(current=>{
          if(youtubeVideoId(current.url)!==id)return current;
          const title=!manualEdits.current.title && (!current.title || current.title===lastAutofill.current.title) ? data.title : current.title;
          const artist=!manualEdits.current.artist && (!current.artist || current.artist===lastAutofill.current.artist) ? data.artist : current.artist;
          lastAutofill.current={title:data.title,artist:data.artist};
          return {...current,title,artist};
        });
        setMetadataState("영상 제목과 채널 이름을 가져왔어요. 필요하면 수정하세요.");
      }catch(e){if(!controller.signal.aborted)setMetadataState((e as Error).message||"영상 정보를 가져오지 못했어요. 직접 입력해 주세요.");}
    },500);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[form.url]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useAutoDismissMessage();
  const [notice, setNotice] = useAutoDismissMessage();
  const [confirmDelete,setConfirmDelete]=useState("");
  const [deleting,setDeleting]=useState("");
  const [copiedId, setCopiedId] = useState("");
  const [playing, setPlaying] = useState<Recommendation | null>(null);

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/recommendations");
      const data = (await response.json()) as {
        recommendations?: Recommendation[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setItems(data.recommendations || []);
    } catch (event) {
      setError((event as Error).message || "추천을 불러오지 못했어요.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        recommendation?: Recommendation;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setForm(emptyForm);
      manualEdits.current={title:false,artist:false};lastAutofill.current={title:"",artist:""};
      setNotice("추천을 병에 담아 보냈어요.");
      await load();
    } catch (event) {
      setError((event as Error).message || "추천을 남기지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function copyItem(item: Recommendation) {
    await navigator.clipboard.writeText(shareLine(item));
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  useEffect(()=>{ if(!adminKey)setConfirmDelete(""); },[adminKey]);
  async function deleteItem(item:Recommendation) {
    if(!adminKey||deleting)return;
    setDeleting(item.id);setError("");
    try {
      const response=await fetch("/api/recommendations",{method:"DELETE",headers:{"Content-Type":"application/json","x-soteria-admin-key":adminKey},body:JSON.stringify({id:item.id})});
      const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"추천을 삭제하지 못했어요.");
      setItems(current=>current.filter(r=>r.id!==item.id));setConfirmDelete("");setNotice("추천을 삭제했어요.");
      // Deleting a recommendation does not remove a listener's queued song.
    }catch(e){setError((e as Error).message);}finally{setDeleting("");}
  }

  function listen(item:Recommendation) { const id=videoId(item.url); if(id)audio.play({id,title:item.title,artist:item.artist,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}); }
  function playerPanel(){return null;}

  return (
    <div>
      <div className="room-heading song-bottle-heading">
        <div>
          <div className="room-eyebrow">SONG BOTTLE LIGHT</div>
          <h1>곡추천을 가볍게 남기는 병.</h1>
          <p>좋았던 곡 하나와 짧은 메모만 남겨도 충분해요.</p>
        </div>
        <SongBottleIllustration />
      </div>
      {error && (
        <p className="room-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="room-message" role="status">
          {notice}
        </p>
      )}
      <div className="bottle-layout">
        <form className="bottle-form glass" onSubmit={submit}>
          <h2>추천 남기기</h2>
          <label>
            이름
            <input
              value={form.nickname}
              onChange={(event) =>
                setForm({ ...form, nickname: event.target.value })
              }
              maxLength={24}
              placeholder="익명도 괜찮아요"
            />
          </label>
          <label>
            YouTube 링크
            <input
              value={form.url}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
              type="url"
              placeholder="https://youtu.be/..."
              required
            />
          </label>
          <p className="room-note" role="status">{metadataState || "링크를 붙이면 영상 제목과 채널 이름을 자동으로 가져와요."}</p>
          <label>
            곡 제목
            <input
              value={form.title}
              onChange={(event) =>
                {manualEdits.current.title=true;setForm({ ...form, title: event.target.value });}
              }
              maxLength={120}
              placeholder="추천하고 싶은 곡"
              required
            />
          </label>
          <label>
            아티스트
            <input
              value={form.artist}
              onChange={(event) =>
                {manualEdits.current.artist=true;setForm({ ...form, artist: event.target.value });}
              }
              maxLength={80}
              placeholder="선택"
            />
          </label>

          <label>
            짧은 메모
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              maxLength={240}
              placeholder="받을 사람에게 전할 짧은 메모"
            />
          </label>
          <button className="room-button" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            추천 보내기
          </button>
          <p className="room-note">
            로그인 없이 남기는 작은 추천함이에요. 최신 추천만 가볍게 보여줍니다.
          </p>
        </form>
        <section className="bottle-list">
          <div className="bottle-draw-bar notranslate" translate="no">
            <button className="room-button" disabled={!historyReady||!unseen.length} onClick={drawBottle}><Shuffle size={15}/>{ja?'ボトルを一つ引く':en?'Draw a bottle':'한 병 뽑기'}</button>
            <p aria-live="polite">{!items.length?(ja?'おすすめが届くのを待っています':en?'Waiting for recommendations':'도착한 추천을 기다리고 있어요'):unseen.length?(ja?`まだ引いていない${unseen.length}曲`:en?`${unseen.length} unseen songs`:`아직 뽑지 않은 ${unseen.length}곡`):(ja?'届いた曲をすべて引きました':en?'You have drawn every available song':'도착한 곡을 모두 뽑았어요')}{drawnId&&items.some(x=>x.id===drawnId)&&<span> · {ja?'引いたボトルを先頭に表示':en?'Your bottle is shown first':'뽑은 병을 맨 앞에 표시해요'}</span>}</p>
            {!!items.length&&!unseen.length&&<button className="room-button subtle" onClick={()=>{remember([]);setDrawnId('');}}>{ja?'もう一度引く準備':en?'Start a new round':'처음부터 다시 뽑기'}</button>}
            <small>{ja?'この端末で引いた曲を除外します。履歴を消すと重複する場合があります。':en?'Excludes songs drawn on this device. Clearing browser history may allow repeats.':'이 기기에서 뽑은 곡을 제외해요. 브라우저 기록을 지우면 다시 나올 수 있어요.'}</small>
          </div>
          <div className="section-title compact-title">
            <h2>
              도착한 추천<span>{items.length}곡</span>
            </h2>
          </div>
          {playerPanel()}
          <div className="bottle-grid">
            {[...items.filter(item=>item.id===drawnId),...items.filter(item=>item.id!==drawnId)].map((item) => {
              const id = videoId(item.url);
              return (
                <article className={`bottle-card glass ${item.id===drawnId?'bottle-drawn':''}`} key={item.id}>
                  {id ? (
                    <button
                      className="bottle-cover"
                      onClick={() => listen(item)}
                      aria-label={`${item.title} 사이트에서 재생`}
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                        alt=""
                        loading="lazy"
                      />
                      <span>
                        <Play size={13} />
                      </span>
                    </button>
                  ) : (
                    <div className="bottle-fallback">♪</div>
                  )}
                  <div>
                    <small>
                      {item.nickname} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </small>
                    <h3 className="notranslate" translate="no">
                      {item.title}
                    </h3>
                    {item.artist && (
                      <p className="notranslate" translate="no">
                        {item.artist}
                      </p>
                    )}
                    {item.note && <blockquote className="notranslate" translate="no">{item.note}</blockquote>}
                    <div className="bottle-actions">
                      {id && (<>
                        <button onClick={() => {const id=videoId(item.url);if(id)audio.add([{id,title:item.title,artist:item.artist,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}]);}}>목록에 담기</button><button onClick={() => listen(item)}>
                          <Play size={12} />
                          재생
                        </button></>
                      )}
                      <a href={item.url} target="_blank" rel="noreferrer">
                        YouTube <ExternalLink size={12} />
                      </a>
                      <button onClick={() => void copyItem(item)}>
                        {copiedId === item.id ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                        {copiedId === item.id ? "복사됨" : "복사"}
                      </button>
                      {adminKey&&<button className="bottle-delete" disabled={!!deleting} onClick={()=>setConfirmDelete(item.id)}><Trash2 size={12}/>관리자 삭제</button>}
                    </div>
                  </div>
                  {adminKey&&confirmDelete===item.id&&<div className="bottle-delete-confirm" role="group" aria-label="추천 삭제 확인"><p>이 추천을 삭제할까요? 삭제 후 되돌릴 수 없어요.</p><div><button className="room-button subtle" disabled={!!deleting} onClick={()=>setConfirmDelete("")}>취소</button><button className="room-button" disabled={!!deleting} onClick={()=>void deleteItem(item)}>{deleting===item.id?"삭제 중…":"삭제 확인"}</button></div></div>}
                </article>
              );
            })}
            {!items.length && (
              <div className="room-empty glass">
                <Send size={30} />
                <h3>아직 도착한 추천이 없어요.</h3>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
