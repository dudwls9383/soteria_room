"use client";
import { useEffect, useRef, useState } from "react";
import { useRoomAudio } from "./room-experience";
import type { SmallChannel } from "../lib/small-channels";
export default function ChannelPreview({
  channel,
  onClose,
  language,
}: {
  channel: SmallChannel;
  onClose: () => void;
  language: "ko" | "en" | "ja";
}) {
  const panel = useRef<HTMLElement>(null);
  const [retry, setRetry] = useState(0);
  const audio = useRoomAudio(),
    [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const text =
    language === "en"
      ? {
          title: "Channel preview",
          note: "Latest public uploads · These may include talk and streams, not only songs.",
          load: "Loading videos…",
          add: "Add to queue",
          play: "Play",
          empty: "No public uploads found.",
        }
      : language === "ja"
        ? {
            title: "チャンネル試聴",
            note: "最新の公開動画 · 歌以外の配信や雑談も含まれます。",
            load: "動画を読み込み中…",
            add: "リストに追加",
            play: "再生",
            empty: "公開動画がありません。",
          }
        : {
            title: "채널 미리듣기",
            note: "최근 공개 영상 · 노래 외에 방송이나 잡담도 포함될 수 있어요.",
            load: "최근 영상을 가져오는 중…",
            add: "목록에 담기",
            play: "재생",
            empty: "공개 영상이 없어요.",
          };
  useEffect(() => {
    const c = new AbortController();
    requestAnimationFrame(() =>
      panel.current?.scrollIntoView({
        block: "nearest",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
    setData(null);
    setError("");
    fetch("/api/channel-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: channel.id }),
      signal: c.signal,
    })
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [channel.id, retry]);
  return (
    <section ref={panel} className="channel-preview glass">
      <header>
        <div>
          <small>{text.title} · YouTube</small>
          <h2>{channel.title}</h2>
        </div>
        <button
          className="room-button subtle"
          aria-label={
            language === "ko"
              ? "미리듣기 닫기"
              : language === "ja"
                ? "試聴を閉じる"
                : "Close preview"
          }
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p>{text.note}</p>
      {error ? (
        <div>
          <p role="alert">
            {language === "ko"
              ? error
              : language === "ja"
                ? "動画を読み込めませんでした。しばらくしてから再試行してください。"
                : "Could not load videos. Please try again shortly."}
          </p>
          <button
            className="room-button subtle"
            onClick={() => setRetry((v) => v + 1)}
          >
            {language === "ko"
              ? "다시 시도"
              : language === "ja"
                ? "再試行"
                : "Retry"}
          </button>
        </div>
      ) : !data ? (
        <p role="status">{text.load}</p>
      ) : !data.tracks.length ? (
        <p>{text.empty}</p>
      ) : (
        <div className="channel-preview-grid">
          {data.tracks.map((t: any) => (
            <article key={t.id}>
              <img src={t.thumbnail} alt="" loading="lazy" />
              <h3>{t.title}</h3>
              <div>
                <button className="room-button" onClick={() => audio.play(t)}>
                  {text.play}
                </button>
                <button
                  className="room-button subtle"
                  onClick={() => audio.add([t])}
                >
                  {text.add}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
