"use client";
import { useEffect, useState } from "react";
import {
  Shuffle,
  ExternalLink,
  RefreshCw,
  Upload,
  Copy,
  Music2,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { Playlist, Track } from "../lib/music";
import { searchLibrary } from "../lib/archive";
import { inScope, scopes, sampleUnique, type Scope } from "../lib/collections";
import { SHEET_URL, type Channel } from "../lib/subscriptions";
type Snapshot = {
  channels: Channel[];
  updatedAt: number | null;
  source: string | null;
};
export default function RandomDiscovery({ library }: { library: Playlist[] }) {
  const [scope, setScope] = useState<Scope>("picks"),
    [count, setCount] = useState(10),
    [songs, setSongs] = useState<Track[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>({
      channels: [],
      updatedAt: null,
      source: null,
    }),
    [channels, setChannels] = useState<Channel[]>([]),
    [channelCount, setChannelCount] = useState(3);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pool = searchLibrary(
    library.filter((p) => inScope(p, scope)),
    "",
  );
  useEffect(() => {
    fetch("/api/subscriptions")
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setSnapshot(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function update(input: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
      setChannels([]);
      setNotice(`${d.channels.length.toLocaleString()}개 채널로 갱신했어요.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 1800000) {
      setError("CSV는 1.8MB 이하로 올려주세요.");
      return;
    }
    await update({ csv: await file.text() });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        songs.map((t) => `https://youtu.be/${t.id}`).join("\n"),
      );
      setNotice(`${songs.length}곡의 YouTube 링크를 복사했어요.`);
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  async function drawChannels() {
    const picked = sampleUnique(snapshot.channels, channelCount);
    setChannels(picked);
    try {
      const r = await fetch("/api/channel-avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: picked }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setChannels(
        picked.map((c) => ({ ...c, avatar: d.avatars?.[c.id] || c.avatar })),
      );
    } catch {
      setNotice(
        "채널을 뽑았어요. 일부 프로필 이미지는 표시되지 않을 수 있어요.",
      );
    }
  }
  return (
    <div>
      <div className="room-heading">
        <div>
          <div className="room-eyebrow">A LITTLE SERENDIPITY</div>
          <h1>아직 못 만난 취향을 찾아서.</h1>
          <p>보관실의 곡과 구독목록의 채널에서 무작위로 골라요.</p>
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
      <Tabs defaultValue="songs">
        <TabsList className="discovery-tabs">
          <TabsTrigger value="songs">
            <Music2 size={16} />곡 뽑기
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Users size={16} />
            구독 채널 뽑기
          </TabsTrigger>
        </TabsList>
        <TabsContent value="songs">
          <section className="discovery-control glass">
            <div>
              <h2>오늘 들을 곡을 뽑아볼까요?</h2>
              <p>
                후보 {pool.length.toLocaleString()}곡 · 같은 영상은 한 번만
                뽑아요.
              </p>
            </div>
            <div className="control-row">
              <label>
                뽑을 범위
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value as Scope);
                    setSongs([]);
                  }}
                >
                  {scopes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                곡 수
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <button
                className="room-button"
                disabled={
                  !pool.length ||
                  !Number.isInteger(count) ||
                  count < 1 ||
                  count > 100
                }
                onClick={() => {
                  setSongs(sampleUnique(pool, count));
                  setNotice(
                    pool.length < count
                      ? `후보가 ${pool.length}곡이라 모두 뽑았어요.`
                      : "새로운 곡을 뽑았어요.",
                  );
                }}
              >
                <Shuffle size={17} />
                무작위로 뽑기
              </button>
            </div>
          </section>
          {songs.length > 0 && (
            <>
              <div className="section-title">
                <h2>
                  이번에 만난 음악<span>{songs.length}곡</span>
                </h2>
                <button
                  className="room-button subtle"
                  onClick={() => void copy()}
                >
                  <Copy size={16} />
                  YouTube 링크 복사
                </button>
              </div>
              <div className="random-song-grid">
                {songs.map((t) => (
                  <a
                    className="random-song glass"
                    key={t.id}
                    href={`https://youtu.be/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src={t.thumbnail} alt="" loading="lazy" />
                    <div>
                      <strong className="notranslate" translate="no">
                        {t.title}
                      </strong>
                      <p className="notranslate" translate="no">
                        {t.artist}
                      </p>
                      <span>
                        YouTube에서 듣기 <ExternalLink size={13} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="channels">
          <section className="discovery-control glass">
            <div>
              <h2>구독목록에서 다음 채널 찾기</h2>
              <p>
                저장된 {snapshot.channels.length.toLocaleString()}개 채널 안에서
                뽑아요. 구독자 수 기준의 필터는 적용하지 않아요.
              </p>
            </div>
            <div className="control-row">
              <label>
                채널 수
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={channelCount}
                  onChange={(e) => setChannelCount(Number(e.target.value))}
                />
              </label>
              <button
                className="room-button"
                disabled={
                  !snapshot.channels.length ||
                  !Number.isInteger(channelCount) ||
                  channelCount < 1 ||
                  channelCount > 30
                }
                onClick={() => void drawChannels()}
              >
                <Shuffle size={17} />
                채널 뽑기
              </button>
            </div>
          </section>
          <div className="channel-grid">
            {channels.map((c, i) => (
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
                  <span className="channel-monogram">
                    {c.title.slice(0, 1)}
                  </span>
                )}
                <div>
                  <small>DISCOVERY {String(i + 1).padStart(2, "0")}</small>
                  <h3 className="notranslate" translate="no">
                    {c.title}
                  </h3>
                  <span>
                    채널에서 음악 찾아보기 <ExternalLink size={14} />
                  </span>
                </div>
              </a>
            ))}
          </div>
          <section className="subscription-settings glass">
            <h2>반년에 한 번, 구독목록 새로 넣기</h2>
            <p>
              마지막 가져오기:{" "}
              {snapshot.updatedAt
                ? new Date(snapshot.updatedAt).toLocaleDateString("ko-KR")
                : "아직 없음"}
              {snapshot.source ? ` · ${snapshot.source}` : ""}
            </p>
            {snapshot.updatedAt &&
              Date.now() - snapshot.updatedAt > 180 * 86400000 && (
                <p className="room-note">
                  6개월이 지났어요. 최신 구독목록으로 갱신해 주세요.
                </p>
              )}
            <div className="control-row">
              <button
                className="room-button subtle"
                disabled={busy}
                onClick={() => void update({ source: "sheet" })}
              >
                <RefreshCw size={16} className={busy ? "spin" : ""} />
                {busy ? "가져오는 중…" : "연결된 시트 다시 가져오기"}
              </button>
              <label className="room-button subtle upload-label">
                <Upload size={16} />새 CSV로 갱신
                <input
                  aria-label="구독목록 CSV 업로드"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <a href={SHEET_URL} target="_blank" rel="noreferrer">
                원본 시트 <ExternalLink size={14} />
              </a>
            </div>
            <p className="room-note">
              새 파일이 정상적으로 읽힐 때만 기존 목록을 교체합니다. 채널 URL과
              채널 제목 열을 사용해요.
            </p>
          </section>
          <div className="digging-guides">
            <a
              href="https://gall.dcinside.com/mini/board/view/?id=moesound&no=1025"
              target="_blank"
              rel="noreferrer"
            >
              소테리아의 곡 디깅하는 법 <ExternalLink size={14} />
            </a>
            <a
              href="https://gall.dcinside.com/mini/board/view/?id=moesound&no=979"
              target="_blank"
              rel="noreferrer"
            >
              재생목록을 만드는 법 <ExternalLink size={14} />
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
