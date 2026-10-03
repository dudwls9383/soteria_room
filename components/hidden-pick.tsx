"use client";
import { useEffect, useState } from "react";
import { Play, Plus } from "lucide-react";
import { useRoomAudio } from "./room-experience";
export default function HiddenPick() {
  const audio = useRoomAudio(),
    [data, setData] = useState<any>(null),
    [views, setViews] = useState("10000"),
    [seconds, setSeconds] = useState("600"),
    [before, setBefore] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    fetch(
      `/api/music?mode=hidden&views=${views}&seconds=${seconds}&before=${before}`,
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
  }, [views, seconds, before]);
  return (
    <section className="hidden-pick pick-shelf">
      <div className="pick-shelf-heading">
        <div>
          <span className="room-eyebrow">HIDDEN GEMS · YouTube</span>
          <h2>숨은 곡 Pick</h2>
        </div>
      </div>
      <p className="pick-reason">
        모아둔 큐레이션에서 조회수가 낮은 곡부터 보여드려요. 조회수 미확인
        영상은 숫자 조건에 포함하지 않습니다.
      </p>
      <div className="control-row glass">
        <label>
          조회수
          <select value={views} onChange={(e) => setViews(e.target.value)}>
            {[1000, 5000, 10000, 50000, 100000].map((n) => (
              <option value={n} key={n}>
                {n.toLocaleString()}회 이하
              </option>
            ))}
          </select>
        </label>
        <label>
          영상 길이
          <select value={seconds} onChange={(e) => setSeconds(e.target.value)}>
            <option value="300">5분 이하</option>
            <option value="600">10분 이하</option>
            <option value="1200">20분 이하</option>
          </select>
        </label>
        <label>
          게시연도
          <select value={before} onChange={(e) => setBefore(e.target.value)}>
            <option value="">전체</option>
            {[2025, 2023, 2020, 2015].map((y) => (
              <option value={y} key={y}>
                {y}년 이전·포함
              </option>
            ))}
          </select>
        </label>
      </div>
      {busy && <p role="status">숨은 곡을 찾는 중…</p>}
      {error && <p role="alert">{error}</p>}
      {data && !busy && (
        <>
          <small>
            {data.known.toLocaleString()}곡 정보 확인 · 조건에 맞는{" "}
            {data.total.toLocaleString()}곡
            {data.checkedAt > 0 &&
              ` · ${new Date(data.checkedAt).toLocaleDateString("ko-KR")} 기준`}
          </small>
          {!data.music.length ? (
            <p className="room-message">
              조건에 맞는 확인된 곡이 없어요. 조건을 넓히거나 가져오기 ·
              동기화에서 영상 정보를 갱신해 주세요.
            </p>
          ) : (
            <div className="pick-album-grid">
              {data.music.map((t: any) => (
                <article className="pick-album glass" key={t.id}>
                  <button
                    className="pick-cover"
                    aria-label={`${t.title} 재생`}
                    onClick={() => audio.play(t)}
                  >
                    <img src={t.thumbnail} alt="" loading="lazy" />
                    <span>
                      <Play size={19} />
                    </span>
                  </button>
                  <div className="pick-album-copy">
                    <h3 className="notranslate" translate="no">
                      {t.title}
                    </h3>
                    <p className="notranslate" translate="no">
                      {t.artist}
                    </p>
                    <small>
                      {t.fact.views.toLocaleString()}회 ·{" "}
                      {Math.floor(t.fact.seconds / 60)}:
                      {String(t.fact.seconds % 60).padStart(2, "0")}
                    </small>
                    <button
                      className="room-button subtle"
                      onClick={() => audio.add([t])}
                    >
                      <Plus size={14} />
                      목록에 담기
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
