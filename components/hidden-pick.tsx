"use client";
import { useEffect, useState } from "react";
import SongCard from "./song-card";
export default function HiddenPick({adminKey=""}:{adminKey?:string}) {
  const [data, setData] = useState<any>(null),
    [views, setViews] = useState("10000"),
    [seconds, setSeconds] = useState("600"),
    [before, setBefore] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);
  const [nonce,setNonce]=useState("");
  const [picksOnly,setPicksOnly]=useState(true);
  const [updating,setUpdating]=useState(false);
  const [updateNote,setUpdateNote]=useState("");
  async function updateViews() {
    setUpdating(true); setError("");
    try {
      const r=await fetch("/api/video-facts",{method:"POST",headers:{"Content-Type":"application/json","x-soteria-admin-key":adminKey},body:JSON.stringify({scope:"picks"})});
      const d:any=await r.json(); if(!r.ok)throw new Error(d.error);
      setUpdateNote(`${d.updated}곡 확인 · 남은 ${d.remaining}곡`);setNonce(crypto.randomUUID());setPage(1);
    } catch(e){setError((e as Error).message);}finally{setUpdating(false);}
  }
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    fetch(
      `/api/music?mode=hidden&scope=${picksOnly?'picks':'all'}&views=${views}&seconds=${seconds}&before=${before}&page=${page}&nonce=${nonce}`,
      { signal: c.signal },
    )
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [views, seconds, before, page, nonce, picksOnly]);
  return (
    <section className="hidden-pick pick-shelf">
      <div className="pick-shelf-heading">
        <div>
          <span className="room-eyebrow">HIDDEN GEMS · YouTube</span>
          <h2>숨은 곡 Pick</h2>
        </div>
      </div>
      <p className="pick-reason">
        저장된 곡에서 조회수가 낮은 곡부터 보여드려요. 조회수 미확인 영상은 숫자 조건에 포함하지 않습니다.
      </p>
      <div className="control-row glass">
        <label><span>검색 범위</span><span><input type="checkbox" checked={picksOnly} onChange={e=>{setPicksOnly(e.target.checked);setPage(1);setNonce("");}}/> 월의 픽 한정</span></label>
        <label>
          조회수
          <select
            value={views}
            onChange={(e) => {
              setViews(e.target.value);
              setPage(1);
            }}
          >
            {[100000, 50000, 10000, 5000, 1000, 800, 500, 200, 100, 50].map(
              (n) => (
                <option value={n} key={n}>
                  {n.toLocaleString()}회 이하
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          영상 길이
          <select
            value={seconds}
            onChange={(e) => {
              setSeconds(e.target.value);
              setPage(1);
            }}
          >
            <option value="300">5분 이하</option>
            <option value="600">10분 이하</option>
            <option value="1200">20분 이하</option>
          </select>
        </label>
        <label>
          영상 업로드 연도
          <select
            value={before}
            aria-describedby="hidden-upload-year-help"
            onChange={(e) => {
              setBefore(e.target.value);
              setPage(1);
            }}
          >
            <option value="">모든 업로드 연도</option>
            {[2025, 2023, 2020, 2015].map((y) => (
              <option value={y} key={y}>
                {y}년까지
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="pick-reason" id="hidden-upload-year-help">영상이 YouTube에 올라온 연도로 찾습니다. ‘2025년까지’는 2025년과 그 이전 영상이며, 곡의 발매연도와는 달라요.</p>
      {adminKey&&<details className="inline-admin"><summary>관리 도구</summary><button className="room-button subtle" disabled={updating} onClick={()=>void updateViews()}>{updating?"조회수 확인 중…":"월의 픽 조회수 갱신 · 50곡"}</button>{updateNote&&<p role="status">{updateNote}</p>}</details>}
      {busy && <p role="status">숨은 곡을 찾는 중…</p>}
      {error && <p role="alert">{error}</p>}
      {data && !busy && (
        <>
          <small>
            {`선택 범위에서 ${data.known.toLocaleString()}곡 정보 확인 · 조건에 맞는 ${data.total.toLocaleString()}곡`}
            {data.checkedAt > 0 &&
              ` · ${new Date(data.checkedAt).toLocaleDateString("ko-KR")} 기준`}
          </small>
          <div><button className="room-button subtle" disabled={busy || !data.total} onClick={()=>{setPage(1);setNonce(crypto.randomUUID());}}>랜덤곡 보기</button></div>
          {!data.music.length ? (
            <p className="room-message">
              조건에 맞는 확인된 곡이 없어요. 조건을 넓혀 주세요.
            </p>
          ) : (
            <div className="pick-album-grid">
              {data.music.map((t: any) => (
                <SongCard key={t.id} track={t} meta={<>{t.fact.views.toLocaleString()}회 · {Math.floor(t.fact.seconds / 60)}:{String(t.fact.seconds % 60).padStart(2, "0")}</>} />
              ))}
            </div>
          )}
          <nav className="subscription-pages" aria-label="숨은 곡 페이지">
            <button
              className="room-button subtle"
              disabled={busy || data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              이전
            </button>
            {Array.from(
              { length: Math.min(5, data.pages) },
              (_, i) =>
                Math.max(1, Math.min(data.page - 2, data.pages - 4)) + i,
            ).map((n) => (
              <button
                className="room-button subtle"
                key={n}
                aria-current={n === data.page ? "page" : undefined}
                disabled={busy || n === data.page}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <span>
              {data.page} / {data.pages}
            </span>
            <button
              className="room-button subtle"
              disabled={busy || data.page >= data.pages}
              onClick={() => setPage(data.page + 1)}
            >
              다음
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
