"use client";
import { useEffect, useState } from "react";
import {
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
} from "../lib/channel-tags";
import { sampleUnique } from "../lib/collections";
import {channelTagOrder,channelTagLabels,displayChannelTags} from "../lib/channel-labels";
import ResetDataButton from "./reset-data-button";

type Snapshot = {
  tag: string;
  query: string;
  channels: TaggedChannel[];
  summaries: ChannelTagSummary[];
  updatedAt: number | null;
  source: string | null;
};

const tagChoices=channelTagOrder;
export default function ChannelTagExplorer({
  initialTag = "ASMR",
  adminKey = "",
}: {
  initialTag?: string;
  adminKey?: string;
}) {
  const [tag, setTag] = useState(initialTag);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    tag: initialTag,
    query: "",
    channels: [],
    summaries: [],
    updatedAt: null,
    source: null,
  });
  const [picked, setPicked] = useState<TaggedChannel[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    fetch(
      `/api/channel-tags?tag=${encodeURIComponent(tag)}&q=${encodeURIComponent(query)}&limit=3000`,
      {
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setSnapshot(d);
        setPicked([]);
        setPage(1);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [tag, query]);
  const current = snapshot.summaries.find((s) => s.id === tag);
  const pageSize = 96;
  const totalChannels = snapshot.channels.length;
  const pageCount = Math.max(1, Math.ceil(totalChannels / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalChannels);
  const display = picked.length
    ? picked
    : snapshot.channels.slice(pageStart, pageEnd);
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
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
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-soteria-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({ json: await file.text(), source: file.name }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setTag("ASMR");
      setQuery("");
      setSnapshot(d);
      setPicked([]);
      setPage(1);
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
                    {channelTagLabels[id] || item?.label || id}
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
            onClick={() => {
              setPicked(
                sampleUnique(
                  snapshot.channels,
                  Math.min(6, snapshot.channels.length),
                ),
              );
              setPage(1);
            }}
          >
            <Shuffle size={16} /> 랜덤 불러오기
          </button>
          <button
            className="room-button subtle"
            disabled={!snapshot.channels.length || busy}
            onClick={() => {
              setPicked([]);
              setPage(1);
            }}
          >
            전체 불러오기
          </button>
          <label className="room-button subtle upload-label" aria-disabled={!adminKey} title={!adminKey ? "가져오기 · 동기화에서 관리 잠금을 열어 주세요." : undefined}>
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
              disabled={busy || !adminKey}
              onChange={(e) => {
                void uploadTagJson(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <div className="section-title">
        <ResetDataButton target="json" label="JSON 초기화" adminKey={adminKey} disabled={busy} onReset={() => {setSnapshot({tag,query,channels:[],summaries:[],updatedAt:Date.now(),source:"초기화됨"});setPicked([]);setPage(1);}} />
        <h2>
          {picked.length ? "이번 랜덤 채널" : "전체 채널 목록"}
          <span>
            {picked.length
              ? `${display.length.toLocaleString()}개 / 전체 ${totalChannels.toLocaleString()}개`
              : totalChannels
                ? `${pageStart + 1}-${pageEnd} / ${totalChannels.toLocaleString()}개`
                : busy ? "불러오는 중…" : "0개"}
          </span>
        </h2>
        {busy && <span className="room-note">불러오는 중…</span>}
      </div>
      <div
        className={picked.length ? "tagged-channel-list" : "tagged-channel-gallery"}
      >
        {display.map((c, i) =>
          picked.length ? (
            <a
              className="tagged-channel-row glass"
              href={c.url}
              key={c.id}
              target="_blank"
              rel="noreferrer"
            >
              <span className="channel-row-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              {c.avatar ? (
                <img
                  className="channel-row-avatar"
                  src={c.avatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="channel-row-monogram">
                  {c.title.slice(0, 1)}
                </span>
              )}
              <div className="channel-row-main">
                <h3 className="notranslate" translate="no">
                  {c.title}
                </h3>
                <p>
                  <Tags size={11} />
                  {displayChannelTags(c.tags).slice(0, 5).join(" · ") || "CHANNEL"}
                </p>
              </div>
              <span className="channel-row-open">
                채널 열기 <ExternalLink size={13} />
              </span>
            </a>
          ) : (
            <a
              className="tagged-channel-tile glass"
              href={c.url}
              key={c.id}
              target="_blank"
              rel="noreferrer"
            >
              <span className="channel-tile-number">
                {String(pageStart + i + 1)}
              </span>
              {c.avatar ? (
                <img
                  className="channel-tile-cover"
                  src={c.avatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="channel-tile-cover channel-tile-monogram">
                  {c.title.slice(0, 1)}
                </span>
              )}
              <strong className="notranslate" translate="no">
                {c.title}
              </strong>
              <p>
                <Tags size={10} />
                {displayChannelTags(c.tags).slice(0, 3).join(" · ") || "CHANNEL"}
              </p>
            </a>
          ),
        )}
      </div>
      {!picked.length && pageCount > 1 && (
        <div className="channel-pagination" aria-label="채널 목록 페이지">
          {pageNumbers.map((number) => (
            <button
              key={number}
              className={number === safePage ? "active" : ""}
              type="button"
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}
        </div>
      )}
      {!display.length && (
        <div className="room-empty glass">
          <Users size={32} />
          <h3>조건에 맞는 채널이 없어요.</h3>
        </div>
      )}
    </div>
  );
}
