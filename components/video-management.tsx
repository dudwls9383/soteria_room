"use client";
import { useEffect, useRef, useState } from "react";
export default function VideoManagement({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const stop = useRef(false),
    mounted = useRef(true);
  async function load() {
    const r = await fetch("/api/video-facts");
    const d: any = await r.json();
    if (!r.ok) throw new Error(d.error);
    if (mounted.current) setData(d);
  }
  useEffect(() => {
    mounted.current = true;
    void load().catch((e) => setError(e.message));
    return () => {
      mounted.current = false;
      stop.current = true;
    };
  }, []);
  async function refresh() {
    setBusy(true);
    setError("");
    stop.current = false;
    let done = 0;
    try {
      do {
        const r = await fetch("/api/video-facts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-soteria-admin-key": adminKey,
          },
          body: "{}",
        });
        const d: any = await r.json();
        if (!r.ok) throw new Error(d.error);
        done += d.updated;
        if (mounted.current)
          setNotice(`${done}곡 확인 · ${d.remaining}곡 남음`);
        if (!d.remaining) break;
      } while (!stop.current);
      await load();
    } catch (e) {
      if (mounted.current) {
        setError((e as Error).message);
        await load().catch(() => {});
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="media-management glass">
      <h2>영상 정보 · 재생 불가 관리</h2>
      <p>
        조회수·게시일·길이와 사이트 내 재생 가능 여부를 50곡씩 확인합니다.
        확인한 정보는 7일 동안 재사용하며, 방문할 때마다 YouTube를 조회하지
        않아요.
      </p>
      <p>
        {data
          ? `${data.known.toLocaleString()} / ${data.total.toLocaleString()}곡 확인`
          : "정보를 불러오는 중…"}
        {data?.checkedAt > 0 &&
          ` · 마지막 확인 ${new Date(data.checkedAt).toLocaleString("ko-KR")}`}
      </p>
      <button
        className="room-button"
        disabled={
          busy || !adminKey || !data?.apiConfigured || data.known >= data.total
        }
        onClick={() => void refresh()}
      >
        {busy ? "영상 정보 확인 중…" : "영상 정보 갱신"}
      </button>
      {busy && (
        <button
          className="room-button subtle"
          onClick={() => {
            stop.current = true;
          }}
        >
          다음 묶음부터 중단
        </button>
      )}
      {!adminKey && <small>갱신하려면 관리자 잠금을 열어 주세요.</small>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>
          재생 확인이 필요한 영상 · {data?.unavailable.length || 0}개
        </summary>
        <p>
          추천에서는 잠시 제외하고 원래 재생목록은 유지합니다. 국가·연령 제한은
          실제 재생 환경에 따라 달라질 수 있어요.
        </p>
        <div className="media-failures">
          {data?.unavailable.map((v: any) => (
            <p key={v.id}>
              <a
                className="notranslate"
                translate="no"
                href={`https://youtu.be/${v.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {v.title}
              </a>
              <small>
                {v.availability === "missing"
                  ? "삭제·비공개 또는 응답 없음"
                  : "사이트 내 재생 제한"}{" "}
                · {new Date(v.checkedAt).toLocaleDateString("ko-KR")}
              </small>
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
