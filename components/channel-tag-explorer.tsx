"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  RefreshCw,
  Search,
  Shuffle,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import type {
  TaggedChannel,
  ChannelTagSummary,
  PicksCategory,
} from "../lib/channel-tags";
import { sampleUnique } from "../lib/collections";

type Snapshot = {
  tag: string;
  query: string;
  channels: TaggedChannel[];
  summaries: ChannelTagSummary[];
  picksCategories: PicksCategory[];
  updatedAt: number | null;
  source: string | null;
};

const galleryGuideLinks = [
  {
    title: "소테리아의 곡 디깅하는 법",
    category: "Tip",
    description: "카와보 갤에서 음악을 찾고 정리하는 흐름을 적어 둔 글.",
    url: "https://gall.dcinside.com/mini/board/view/?id=moesound&no=1025&search_head=90&page=1",
  },
  {
    title: "재생목록을 만드는 법",
    category: "Tip",
    description: "좋은 곡을 모아 플레이리스트로 정리하는 기준을 다룬 글.",
    url: "https://gall.dcinside.com/mini/board/view/?id=moesound&no=979&search_head=90&page=1",
  },
];
const tagChoices = [
  "ASMR",
  "KawaVo",
  "ShotaVo",
  "VocalFemale",
  "VocalMale",
  "Composer",
  "Japan",
  "Korea",
];
export default function ChannelTagExplorer({
  initialTag = "ASMR",
}: {
  initialTag?: string;
}) {
  const [tag, setTag] = useState(initialTag);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    tag: initialTag,
    query: "",
    channels: [],
    summaries: [],
    picksCategories: [],
    updatedAt: null,
    source: null,
  });
  const [picked, setPicked] = useState<TaggedChannel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    fetch(
      `/api/channel-tags?tag=${encodeURIComponent(tag)}&q=${encodeURIComponent(query)}&limit=360`,
      {
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setSnapshot(d);
        setPicked([]);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [tag, query]);
  const current = snapshot.summaries.find((s) => s.id === tag);
  const picks = useMemo(
    () => snapshot.picksCategories.filter((c) => c.kind === "Picks"),
    [snapshot.picksCategories],
  );
  const meta = useMemo(
    () => snapshot.picksCategories.filter((c) => c.kind !== "Picks"),
    [snapshot.picksCategories],
  );
  const display = picked.length ? picked : snapshot.channels.slice(0, 36);
  async function uploadTagJson(file?: File) {
    if (!file) return;
    if (file.size > 2200000) {
      setError("JSON은 2.2MB 이하로 올려주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/channel-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: await file.text(), source: file.name }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setTag("ASMR");
      setQuery("");
      setSnapshot(d);
      setPicked([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="room-heading">
        <div>
          <div className="room-eyebrow">CHANNEL TAG DB</div>
          <h1>채널 보관실.</h1>
          <p>
            {current?.label || tag} 태그의 채널을 둘러보고, 확장 프로그램
            JSON으로 주기적으로 갱신해요.
          </p>
        </div>
      </div>
      {error && (
        <p className="room-message error" role="alert">
          {error}
        </p>
      )}
      <section className="tag-dashboard glass">
        <div>
          <span className="room-eyebrow">TAG COLLECTION</span>
          <h2>{current?.label || tag}</h2>
          <p>
            {(current?.count || snapshot.channels.length).toLocaleString()}개
            채널 · {snapshot.source || "기본 데이터"}
            {snapshot.updatedAt
              ? ` · ${new Date(snapshot.updatedAt).toLocaleDateString("ko-KR")}`
              : ""}
          </p>
        </div>
        <div className="tag-actions">
          <label>
            태그
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              {tagChoices.map((id) => {
                const item = snapshot.summaries.find((s) => s.id === id);
                return (
                  <option key={id} value={id}>
                    {item?.label || id}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            검색
            <span className="tag-search-field">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="채널명 또는 태그"
              />
            </span>
          </label>
          <button
            className="room-button"
            disabled={!snapshot.channels.length || busy}
            onClick={() =>
              setPicked(
                sampleUnique(
                  snapshot.channels,
                  Math.min(6, snapshot.channels.length),
                ),
              )
            }
          >
            <Shuffle size={16} /> 추천 채널 뽑기
          </button>
          <label className="room-button subtle upload-label">
            {busy ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <Upload size={16} />
            )}
            태그 JSON 갱신
            <input
              aria-label="YouTube Subscription Manager JSON 업로드"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => {
                void uploadTagJson(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <section className="tag-categories glass">
        <div>
          <h2>카와보 갤 Picks 목차</h2>
          <p>
            글 말머리와 목차를 기준으로 추천 채널을 나눌 수 있도록 먼저 틀을
            잡아두었어요.
          </p>
          <div className="category-chip-grid compact">
            {picks.map((c) => (
              <span key={c.id} className={c.tag === tag ? "active" : ""}>
                {c.label}
              </span>
            ))}
            {meta.map((c) => (
              <span key={c.id} className="muted">
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <div className="gallery-guide-grid">
          {galleryGuideLinks.map((link) => (
            <a
              className="gallery-guide-card"
              href={link.url}
              target="_blank"
              rel="noreferrer"
              key={link.url}
            >
              <span>
                <BookOpen size={14} /> {link.category}
              </span>
              <strong>{link.title}</strong>
              <p>{link.description}</p>
              <small>
                카와이 보이스 갤러리에서 보기 <ExternalLink size={13} />
              </small>
            </a>
          ))}
        </div>
      </section>
      <div className="section-title">
        <h2>
          {picked.length ? "이번 추천 채널" : "채널 목록"}
          <span>{display.length.toLocaleString()}개</span>
        </h2>
        {busy && <span className="room-note">불러오는 중…</span>}
      </div>
      <div className="channel-grid tagged-channel-grid">
        {display.map((c, i) => (
          <a
            className="channel-card glass"
            href={c.url}
            key={c.id}
            target="_blank"
            rel="noreferrer"
          >
            {c.avatar ? (
              <img
                className="channel-avatar"
                src={c.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="channel-monogram">{c.title.slice(0, 1)}</span>
            )}
            <div>
              <small>
                {picked.length
                  ? `PICK ${String(i + 1).padStart(2, "0")}`
                  : c.tags.slice(0, 2).join(" · ") || "CHANNEL"}
              </small>
              <h3 className="notranslate" translate="no">
                {c.title}
              </h3>
              <p className="tag-list">
                <Tags size={12} />
                {c.tags.slice(0, 4).join(" · ")}
              </p>
              <span>
                채널 열기 <ExternalLink size={14} />
              </span>
            </div>
          </a>
        ))}
      </div>
      {!display.length && (
        <div className="room-empty glass">
          <Users size={32} />
          <h3>조건에 맞는 채널이 없어요.</h3>
        </div>
      )}
    </div>
  );
}
