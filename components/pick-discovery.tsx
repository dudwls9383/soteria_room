"use client";
import { useRoomAudio } from "./room-experience";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { PickSnapshot } from "../lib/picks";
import type { MusicRecord } from "../lib/music-index";
import HiddenPick from "./hidden-pick";
import SongCard from "./song-card";

const titles: Record<string, string> = { month: "이번 달의 Pick", quarter: "분기별 Pick", year: "그해의 음악", archive: "오래전에 모아둔 음악" };
export default function PickDiscovery({adminKey=""}:{adminKey?:string}) {
  const audio=useRoomAudio();
  const [data, setData] = useState<PickSnapshot | null>(null);
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [memoryYear,setMemoryYear]=useState("");
  const [request, setRequest] = useState({ section: "", nonce: "" });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<MusicRecord | null>(null);
  const player = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ mode: "picks", year, quarter, memoryYear, refresh: request.section, nonce: request.nonce });
    fetch(`/api/music?${params}`, { signal: controller.signal }).then(async r => {
      const next = await r.json() as PickSnapshot & { error?: string };
      if (!r.ok) throw new Error(next.error || "Pick을 불러오지 못했어요.");
      // 한 구역을 다시 뽑아도 다른 구역의 선택은 그대로 유지합니다.
      setData(old => old && request.section ? { ...next, sections: old.sections.map(s => s.id === request.section ? next.sections.find(n => n.id === s.id)! : s) } : next);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [year, quarter, memoryYear, request]);
  function listen(track: MusicRecord) {
    setPlaying(track); audio.play(track);
    requestAnimationFrame(() => player.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  return <div className="pick-room" aria-busy={busy}>
    <div className="pick-intro"><p>월의 픽에서 시기별로 골라두었어요. 매일 새로운 음악을 만나보세요.</p>{data && <span className="pick-date">{data.day} · KST</span>}</div>
    {error && <div className="room-message error" role="alert">{error} <button className="room-button subtle" onClick={() => setRequest({ section: "", nonce: String(Date.now()) })}>다시 시도</button></div>}
    {busy && !data && <p className="room-message" role="status">Pick을 불러오는 중…</p>}
    {data && <>
      {data.sections.map(section => <div key={section.id}>{section.id === "quarter" && (<div className="pick-period-controls glass control-row">
        <label>연도<select value={year || data.year} disabled={busy || !data.years.length} onChange={e => { setYear(e.target.value); setRequest({ section: "", nonce: "" }); }}>{data.years.map(y => <option key={y}>{y}</option>)}</select></label>
        <label>분기<select value={quarter || String(data.quarter)} disabled={busy} onChange={e => { setQuarter(e.target.value); setRequest({ section: "", nonce: "" }); }}>{[1,2,3,4].map(q => <option key={q} value={q}>{`${q}분기`}</option>)}</select></label>
        <p>연도는 두 목록에, 분기는 분기별 Pick에만 적용돼요.</p>
      </div>)} {section.id === "archive" && <HiddenPick adminKey={adminKey} />}<section className="pick-shelf">
        <div className="pick-shelf-heading"><div><span className="room-eyebrow">{section.period || "—"} · {section.total.toLocaleString()}곡</span><h2>{section.id === "month" && data.fallback ? "최근 수집 월의 Pick" : titles[section.id]}</h2></div><div className="shelf-actions"><button className="room-button subtle" disabled={!section.music.length} onClick={()=>audio.add(section.music)}>모두 담기</button><button className="room-button subtle" disabled={busy || section.total <= section.music.length} onClick={() => setRequest({ section: section.id, nonce: String(Date.now()) })}><RefreshCw size={15} />다른 곡 보기</button></div></div>
        {section.id==='archive'&&<><div className="pick-memory-years" role="group" aria-label="이맘때의 음악 선택">{data.memories.map(m=><button key={m.period} className="room-button subtle" aria-pressed={section.period===m.period} disabled={busy} onClick={()=>{setMemoryYear(m.period.slice(0,4));setRequest({section:'',nonce:''});}}>{`${Number(data.day.slice(0,4))-Number(m.period.slice(0,4))}년 전 이맘때 · ${Number(m.period.slice(-2))}월`}</button>)}</div><p className="pick-reason">오늘과 같은 달의 월의 픽을 다시 꺼냈어요. 월 단위 수집 기록이며 정확히 같은 날짜나 곡의 발매일은 아니에요.</p></>}
        {!section.total ? <p className="room-message">이 기간에 수집한 음악이 아직 없어요.</p> : <div className="pick-album-grid">{section.music.map(track => <SongCard key={track.id} track={track} active={playing?.id === track.id} onPlay={() => listen(track)} meta={<span className="notranslate" translate="no">{track.playlists.slice(0,2).join(" / ")}</span>} />)}</div>}
      </section></div>)}
    </>}
  </div>;
}
