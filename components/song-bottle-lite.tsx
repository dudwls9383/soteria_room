"use client";
import { useRoomAudio } from "./room-experience";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Play, Send, X } from "lucide-react";

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
  return (
    url.match(/youtu\.be\/([\w-]{6,})/)?.[1] ||
    url.match(/[?&]v=([\w-]{6,})/)?.[1] ||
    ""
  );
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

export default function SongBottleLite() {
  const audio=useRoomAudio();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  function listen(item:Recommendation) { const id=videoId(item.url); if(id)audio.play({id,title:item.title,artist:item.artist,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}); }
  function playerPanel(){return null;}

  return (
    <div>
      <div className="room-heading">
        <div>
          <div className="room-eyebrow">SONG BOTTLE LIGHT</div>
          <h1>곡추천을 가볍게 남기는 병.</h1>
          <p>좋았던 곡 하나와 짧은 메모만 남겨도 충분해요.</p>
        </div>
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
            곡 제목
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
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
                setForm({ ...form, artist: event.target.value })
              }
              maxLength={80}
              placeholder="선택"
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
          <label>
            짧은 메모
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              maxLength={240}
              placeholder="어떤 순간에 들으면 좋은지 남겨주세요"
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
          <div className="section-title compact-title">
            <h2>
              도착한 추천<span>{items.length}곡</span>
            </h2>
          </div>
          {playerPanel()}
          <div className="bottle-grid">
            {items.map((item) => {
              const id = videoId(item.url);
              return (
                <article className="bottle-card glass" key={item.id}>
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
                    {item.note && <blockquote>{item.note}</blockquote>}
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
                    </div>
                  </div>
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
