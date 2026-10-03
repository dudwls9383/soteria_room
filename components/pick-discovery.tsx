"use client";
import { useRoomAudio } from "./room-experience";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, RefreshCw, X } from "lucide-react";
import type { PickSnapshot } from "../lib/picks";
import type { MusicRecord } from "../lib/music-index";
import HiddenPick from "./hidden-pick";

const titles: Record<string, string> = { month: "이번 달의 Pick", quarter: "분기별 Pick", year: "그해의 음악", archive: "오래전에 모아둔 음악" };
export default function PickDiscovery({adminKey=""}:{adminKey?:string}) {
  const audio=useRoomAudio();
  const [data, setData] = useState<PickSnapshot | null>(null);
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [request, setRequest] = useState({ section: "", nonce: "" });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<MusicRecord | null>(null);
  const player = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ mode: "picks", year, quarter, refresh: request.section, nonce: request.nonce });
    fetch(`/api/music?${params}`, { signal: controller.signal }).then(async r => {
      const next = await r.json() as PickSnapshot & { error?: string };
      if (!r.ok) throw new Error(next.error || "Pick을 불러오지 못했어요.");
      // 한 구역을 다시 뽑아도 다른 구역의 선택은 그대로 유지합니다.
      setData(old => old && request.section ? { ...next, sections: old.sections.map(s => s.id === request.section ? next.sections.find(n => n.id === s.id)! : s) } : next);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [year, quarter, request]);
  function listen(track: MusicRecord) {
    setPlaying(track); audio.play(track);
    requestAnimationFrame(() => player.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  return <div className="pick-room" aria-busy={busy}>
    <div className="pick-intro"><div><h2>오늘, 바로 듣는 Pick</h2><p>월의 픽에서 시기별로 골라두었어요. 매일 새로운 음악을 만나보세요.</p></div>{data && <span className="pick-date">{data.day} · KST</span>}</div>
    {error && <div className="room-message error" role="alert">{error} <button className="room-button subtle" onClick={() => setRequest({ section: "", nonce: String(Date.now()) })}>다시 시도</button></div>}
    {busy && !data && <p className="room-message" role="status">Pick을 불러오는 중…</p>}
    {data && <>
      {data.sections.map(section => <div key={section.id}>{section.id === "quarter" && (<div className="pick-period-controls glass control-row">
        <label>연도<select value={year || data.year} disabled={busy || !data.years.length} onChange={e => { setYear(e.target.value); setRequest({ section: "", nonce: "" }); }}>{data.years.map(y => <option key={y}>{y}</option>)}</select></label>
        <label>분기<select value={quarter || String(data.quarter)} disabled={busy} onChange={e => { setQuarter(e.target.value); setRequest({ section: "", nonce: "" }); }}>{[1,2,3,4].map(q => <option key={q} value={q}>{q}분기</option>)}</select></label>
        <p>연도는 두 목록에, 분기는 분기별 Pick에만 적용돼요.</p>
      </div>)} {section.id === "archive" && <HiddenPick adminKey={adminKey} />}<section className="pick-shelf">
        <div className="pick-shelf-heading"><div><span className="room-eyebrow">{section.period || "—"} · {section.total.toLocaleString()}곡</span><h2>{section.id === "month" && data.fallback ? "최근 수집 월의 Pick" : titles[section.id]}</h2></div><button className="room-button subtle" disabled={busy || section.total <= section.music.length} onClick={() => setRequest({ section: section.id, nonce: String(Date.now()) })}><RefreshCw size={15} />다른 곡 보기</button></div>
        <button className="room-button subtle" disabled={!section.music.length} onClick={()=>audio.add(section.music)}>이 Pick을 듣기 목록에 담기</button><p className="pick-reason">{section.id === "archive" ? "가장 오래된 수집 연도에서 골랐어요. 발매연도 기준은 아니에요." : "표시된 기간의 재생목록에서 골랐어요."}</p>
        {!section.total ? <p className="room-message">이 기간에 수집한 음악이 아직 없어요.</p> : <div className="pick-album-grid">{section.music.map(track => <article className={`pick-album glass ${playing?.id === track.id ? "active" : ""}`} key={track.id}>
          <button className="pick-cover" onClick={() => listen(track)} aria-label={`${track.title} · 사이트에서 듣기`}><img src={track.thumbnail} alt="" loading="lazy" /><span><Play size={19} fill="currentColor" /></span></button>
          <div className="pick-album-copy"><h3 className="notranslate" translate="no">{track.title}</h3><p className="notranslate" translate="no">{track.artist}</p><small className="notranslate" translate="no">{track.playlists.slice(0,2).join(" / ")}</small><a href={`https://youtu.be/${track.id}`} target="_blank" rel="noreferrer">YouTube에서 듣기 <ExternalLink size={12} /></a></div>
        </article>)}</div>}
      </section></div>)}
    </>}
  </div>;
}
