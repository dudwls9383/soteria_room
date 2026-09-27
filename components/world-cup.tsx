"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronLeft,
  Crown,
  ExternalLink,
  Headphones,
  Link2,
  ListMusic,
  LoaderCircle,
  Play,
  Trophy,
  X,
} from "lucide-react";
import type { Playlist, Track } from "../lib/music";
type Match = { left: string; right: string; winner: string; round: number };
type Game = {
  id: string;
  playlist: Playlist;
  tracks: Track[];
  queue: Track[];
  next: Track[];
  index: number;
  matches: Match[];
  champion?: Track;
  demo?: boolean;
};
type Rank = Track & {
  wins: number;
  appearances: number;
  crowns: number;
  games: number;
};
const sizes = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const roundLabel = (n: number) =>
  n === 2 ? "결승" : n === 4 ? "준결승" : `${n}강`;
export default function Home({
  initialPlaylist,
  active = true,
}: {
  initialPlaylist?: Playlist | null;
  active?: boolean;
}) {
  const [view, setView] = useState<"setup" | "play" | "result" | "ranking">(
    "setup",
  );
  const [url, setUrl] = useState("");
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [size, setSize] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  // 보관실에서 선택한 목록을 그대로 받아 기존 대진·저장 흐름을 재사용합니다.
  useEffect(() => {
    if (initialPlaylist) {
      setPlaylist(initialPlaylist);
      setUrl(`https://www.youtube.com/playlist?list=${initialPlaylist.id}`);
      setSize(
        Math.max(
          2,
          Math.min(
            32,
            2 ** Math.floor(Math.log2(initialPlaylist.tracks.length || 1)),
          ),
        ),
      );
      setView("setup");
    }
  }, [initialPlaylist]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [rankLoading, setRankLoading] = useState(false);
  useEffect(() => {
    if (!active) setPlaying(null);
  }, [active]);
  const [rankError, setRankError] = useState("");
  const [sort, setSort] = useState("crowns");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [quit, setQuit] = useState(false);
  const locked = useRef(false);
  const total = game ? game.tracks.length - 1 : 0;
  const current = game ? game.queue.slice(game.index, game.index + 2) : [];
  const stateRef = useRef({
    view,
    round: game?.queue.length || 0,
    candidates: current,
    selected: game?.matches.length || 0,
  });
  stateRef.current = {
    view,
    round: game?.queue.length || 0,
    candidates: current,
    selected: game?.matches.length || 0,
  };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "get_worldcup_state",
            title: "현재 월드컵 확인",
            description:
              "Read the current screen, round, two candidate songs and completed choice count. Does not choose a song.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("No arguments are accepted.");
              return stateRef.current;
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  async function loadPlaylist() {
    if (!url.trim()) {
      setError("유튜브 재생목록 링크를 먼저 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/playlist-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: any = await res.json();
      if (!res.ok)
        throw new Error(data.error || "재생목록을 가져오지 못했어요.");
      setPlaylist(data);
      setSize(
        Math.max(
          2,
          Math.min(32, 2 ** Math.floor(Math.log2(data.tracks.length || 1))),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!playlist) return;
    if (playlist.tracks.length < size) {
      setError(
        "선택한 대진에 필요한 곡이 부족해요. 2곡 이상 있는 목록을 골라주세요.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      let tracks: Track[], id: string;
      if (playlist.id === "demo") {
        tracks = [...playlist.tracks];
        for (let i = tracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
        }
        tracks = tracks.slice(0, size);
        id = crypto.randomUUID();
      } else {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: playlist.id, size }),
        });
        const data: any = await res.json();
        if (!res.ok) throw new Error(data.error);
        tracks = data.tracks;
        id = data.id;
      }
      setGame({
        id,
        playlist,
        tracks,
        queue: tracks,
        next: [],
        index: 0,
        matches: [],
        demo: playlist.id === "demo",
      });
      setSaved(false);
      setSaveError("");
      setPlaying(null);
      setView("play");
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "게임을 시작하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  function choose(winner: Track) {
    if (!game || game.champion || locked.current || current.length !== 2)
      return;
    locked.current = true;
    const matches = [
      ...game.matches,
      {
        left: current[0].id,
        right: current[1].id,
        winner: winner.id,
        round: game.queue.length,
      },
    ];
    let next = [...game.next, winner],
      queue = game.queue,
      index = game.index + 2;
    if (index >= queue.length) {
      queue = next;
      next = [];
      index = 0;
    }
    const updated = {
      ...game,
      matches,
      next,
      queue,
      index,
      champion: queue.length === 1 ? queue[0] : undefined,
    };
    setGame(updated);
    setPlaying(null);
    if (updated.champion) {
      setView("result");
      if (!game.demo) void saveResult(updated);
      window.scrollTo(0, 0);
    }
    setTimeout(() => {
      locked.current = false;
    }, 240);
  }
  async function saveResult(g: Game) {
    setBusy(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/games/${g.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winners: g.matches.map((m) => m.winner) }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "결과 저장을 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function showRanking() {
    setView("ranking");
    setPlaying(null);
    setRankLoading(true);
    setRankError("");
    try {
      const res = await fetch("/api/ranking");
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRanks(data.tracks);
    } catch (e) {
      setRankError(
        e instanceof Error ? e.message : "랭킹을 불러오지 못했어요.",
      );
    } finally {
      setRankLoading(false);
    }
  }
  function navigate(target: "setup" | "ranking") {
    if (view === "play") {
      setQuit(true);
      return;
    }
    if (target === "ranking") void showRanking();
    else {
      setView("setup");
      setPlaying(null);
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !active ||
        view !== "play" ||
        quit ||
        e.repeat ||
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)
      )
        return;
      if (e.key === "1" && current[0]) choose(current[0]);
      if (e.key === "2" && current[1]) choose(current[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (view !== "play") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [view]);
  useEffect(() => {
    if (!quit) return;
    const previous = document.activeElement as HTMLElement | null;
    const siblings = Array.from(
      document.querySelectorAll<HTMLElement>(".site-header,main,.site-footer"),
    );
    siblings.forEach((el) => {
      el.inert = true;
    });
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".modal button"),
    );
    buttons[1]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setQuit(false);
      }
      if (e.key === "Tab") {
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      siblings.forEach((el) => {
        el.inert = false;
      });
      document.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [quit]);
  function cover(track: Track) {
    return (
      <img
        src={track.thumbnail}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
    );
  }
  const personal =
    game?.tracks
      .map((t) => {
        const wins = game.matches.filter((m) => m.winner === t.id).length;
        const lost = game.matches.find(
          (m) => (m.left === t.id || m.right === t.id) && m.winner !== t.id,
        );
        return {
          ...t,
          wins,
          rank: game.champion?.id === t.id ? 1 : lost ? lost.round / 2 + 1 : 0,
          stage:
            game.champion?.id === t.id
              ? "우승"
              : lost?.round === 2
                ? "준우승"
                : `${lost?.round}강`,
        };
      })
      .sort((a, b) => a.rank - b.rank) || [];
  const sortedRanks = [...ranks].sort((a, b) =>
    sort === "wins"
      ? b.wins / (b.appearances || 1) - a.wins / (a.appearances || 1) ||
        b.appearances - a.appearances
      : b.crowns - a.crowns || b.wins - a.wins,
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("setup")}
          aria-label="PICKTRACK 홈"
        >
          <span className="brand-icon">
            <AudioLines size={23} />
          </span>
          PICKTRACK<span className="brand-period">.</span>
        </button>
        <nav aria-label="주 메뉴">
          <button
            className={view !== "ranking" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("setup")}
          >
            월드컵 만들기
          </button>
          <button
            className={view === "ranking" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("ranking")}
          >
            <Trophy size={16} />
            전체 랭킹
          </button>
        </nav>
        <span className="header-note">YOUR PLAYLIST. YOUR PICK.</span>
      </header>
      {view === "setup" && (
        <main className="setup-page">
          <div className="page-title">
            <div className="eyebrow">
              <span />
              MUSIC WORLD CUP
            </div>
            <h1>
              마지막까지 남을
              <br /> 당신의 <span>한 곡.</span>
            </h1>
            <p>내 재생목록으로 시작하는 음악 이상형 월드컵</p>
          </div>
          <div className="setup-grid worldcup-setup-grid">
            <section className="setup-card setup-card-wide">
              <div className="setup-steps">
                <section className="setup-step-block">
                  <div className="section-heading">
                    <span className="step-number">01</span>
                    <h2>재생목록 가져오기</h2>
                    <ListMusic size={21} />
                  </div>
                  <label htmlFor="playlist-url">유튜브 재생목록 링크</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void loadPlaylist();
                    }}
                  >
                    <div className="url-field">
                      <Link2 size={19} />
                      <input
                        id="playlist-url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/playlist?list=…"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="load-button"
                      disabled={busy}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={18} />
                      ) : (
                        <ListMusic size={18} />
                      )}{" "}
                      {busy ? "재생목록 불러오는 중…" : "재생목록 불러오기"}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                  <p className="help">
                    공개 또는 일부 공개 재생목록을 사용할 수 있어요.
                  </p>
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  {playlist?.warning && (
                    <p className="help">{playlist.warning}</p>
                  )}
                  <div className="loaded-summary setup-status">
                    <span className="ready-check">
                      {playlist ? <Check size={16} /> : <ListMusic size={16} />}
                    </span>
                    <div>
                      <strong>
                        {playlist
                          ? playlist.title
                          : "재생목록을 먼저 가져와 주세요"}
                      </strong>
                      <span>
                        {playlist
                          ? `${playlist.tracks.length}곡 준비 완료 · 선택한 수만큼 무작위로 참여해요.`
                          : "유튜브 재생목록 링크를 넣으면 준비 상태가 표시돼요."}
                      </span>
                    </div>
                  </div>
                </section>
                <section className="setup-step-block">
                  <div className="section-heading">
                    <span className="step-number">02</span>
                    <h2>몇 강으로 시작할까요?</h2>
                  </div>
                  <div className="round-options">
                    {[4, 8, 16, 32, 64].map((n) => (
                      <button
                        key={n}
                        className={size === n ? "selected" : ""}
                        disabled={!playlist || playlist.tracks.length < n}
                        onClick={() => setSize(n)}
                      >
                        {n}강{size === n && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                  <div className="more-rounds">
                    <label htmlFor="all-rounds">다른 대진 규모</label>
                    <select
                      id="all-rounds"
                      value={size}
                      disabled={!playlist}
                      onChange={(e) => setSize(Number(e.target.value))}
                    >
                      {sizes.map((n) => (
                        <option
                          value={n}
                          key={n}
                          disabled={!playlist || playlist.tracks.length < n}
                        >
                          {n}강
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="help">
                    재생목록에서 무작위로 {size}곡을 뽑아 대진을 만들어요.
                  </p>
                  <button
                    className="primary start-button"
                    disabled={
                      !playlist || busy || playlist.tracks.length < size
                    }
                    onClick={() => void start()}
                  >
                    <Play size={18} fill="currentColor" />
                    월드컵 시작하기
                    <ArrowRight size={18} />
                  </button>
                  <div className="start-caption">
                    {size}곡 · {size - 1}번의 선택 · 단 하나의 우승곡
                  </div>
                </section>
              </div>
            </section>
            <section className="trophy-panel" aria-hidden="true">
              <div className="trophy-glow" />
              <div className="trophy-image">
                <Trophy size={118} strokeWidth={1.35} />
              </div>
              <div>
                <span>MUSIC WORLD CUP</span>
                <strong>SOTERIA CUP</strong>
              </div>
            </section>
          </div>
          <div className="how-strip">
            <div>
              <span>01</span>
              <p>재생목록을 넣고</p>
            </div>
            <i />
            <div>
              <span>02</span>
              <p>더 좋아하는 곡을 고르면</p>
            </div>
            <i />
            <div>
              <span>03</span>
              <p>나의 우승곡이 전체 랭킹에</p>
              <Trophy size={17} />
            </div>
          </div>
        </main>
      )}
      {view === "play" && game && (
        <main className="play-page">
          <div className="game-top">
            <button className="text-button" onClick={() => setQuit(true)}>
              <ChevronLeft size={17} />
              나가기
            </button>
            <span>{game.playlist.title}</span>
            <span className="tiny-badge">
              {game.demo ? "체험 모드" : `${game.tracks.length}강 월드컵`}
            </span>
          </div>
          <div className="match-heading">
            <div className="eyebrow">MAKE YOUR PICK</div>
            <h1>
              {roundLabel(game.queue.length)}
              <span>
                {game.index / 2 + 1} / {game.queue.length / 2}
              </span>
            </h1>
            <p>지금, 더 듣고 싶은 한 곡은?</p>
          </div>
          <div className="progress-track">
            <div style={{ width: `${(game.matches.length / total) * 100}%` }} />
          </div>
          <div className="battle-grid">
            {current.map((track, i) => (
              <section className={`track-card side-${i}`} key={track.id}>
                <div className="track-media">
                  {playing === track.id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${track.id}?autoplay=1&playsinline=1`}
                      title={track.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      className="play-cover"
                      onClick={() => setPlaying(track.id)}
                      aria-label={`${track.title} 재생`}
                    >
                      {cover(track)}
                      <span className="play-circle">
                        <Play size={26} fill="currentColor" />
                      </span>
                      <span className="listen-label">눌러서 듣기</span>
                    </button>
                  )}
                </div>
                <div className="track-info">
                  <span className="track-number">TRACK 0{i + 1}</span>
                  <h2>{track.title}</h2>
                  <div className="artist-line">
                    <span>{track.artist}</span>
                    <a
                      href={`https://www.youtube.com/watch?v=${track.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${track.title} 유튜브에서 열기`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <button className="pick-button" onClick={() => choose(track)}>
                    이 곡 선택하기<kbd>{i + 1}</kbd>
                  </button>
                </div>
              </section>
            ))}
            <span className="versus">VS</span>
          </div>
          <div className="battle-footer">
            <span>
              <Headphones size={16} />한 번에 한 곡씩 재생돼요. 재생이 안 되면
              유튜브에서 들어보세요.
            </span>
            <span>
              {game.matches.length} / {total} 선택 완료
            </span>
          </div>
        </main>
      )}
      {view === "result" && game?.champion && (
        <main className="results-page">
          <div className="winner-hero">
            <div className="winner-image">
              {cover(game.champion)}
              <span>
                <Crown size={26} />
              </span>
            </div>
            <div className="winner-copy">
              <div className="eyebrow">YOUR NUMBER ONE</div>
              <h1>당신의 우승곡</h1>
              <h2>{game.champion.title}</h2>
              <p>
                {game.champion.artist} · {game.tracks.length}강 월드컵 우승
              </p>
              <a
                className="outline"
                href={`https://www.youtube.com/watch?v=${game.champion.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <Play size={16} />
                유튜브에서 듣기
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
          <div className="result-status" role="status">
            {game.demo
              ? "체험이 끝났어요. 체험 결과는 전체 랭킹에 반영되지 않아요."
              : busy
                ? "전체 랭킹에 결과를 저장하고 있어요…"
                : saved
                  ? "우승곡과 모든 맞대결 결과가 전체 랭킹에 반영됐어요."
                  : saveError}
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                game.demo
                  ? setView("setup")
                  : saveError
                    ? void saveResult(game)
                    : void showRanking()
              }
            >
              {game.demo
                ? "내 재생목록으로 시작"
                : saveError
                  ? "저장 다시 시도"
                  : "전체 랭킹 보기"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="table-heading">
            <div>
              <h2>나의 최종 랭킹</h2>
              <p>같은 단계에서 탈락한 곡은 공동 순위예요.</p>
            </div>
            <button className="outline" onClick={() => setView("setup")}>
              새 월드컵 만들기
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="ranking-table">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>곡</th>
                  <th>최종 성적</th>
                  <th>선택 횟수</th>
                </tr>
              </thead>
              <tbody>
                {personal.map((t) => (
                  <tr key={t.id}>
                    <td className={t.rank === 1 ? "rank-first" : "rank-number"}>
                      {t.rank === 1 ? <Crown size={22} /> : t.rank}
                    </td>
                    <td>
                      <div className="table-track">
                        {cover(t)}
                        <div>
                          <a
                            href={`https://www.youtube.com/watch?v=${t.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t.title}
                          </a>
                          <span>{t.artist}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={t.rank === 1 ? "gold-badge" : "stage-badge"}
                      >
                        {t.stage}
                      </span>
                    </td>
                    <td>{t.wins}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="match-history">
            <summary>내 선택 기록 · {game.matches.length}경기</summary>
            {game.matches.map((m, i) => (
              <div key={i}>
                <span>{roundLabel(m.round)}</span>
                <p>{game.tracks.find((t) => t.id === m.winner)?.title}</p>
                <Check size={16} />
              </div>
            ))}
          </details>
        </main>
      )}
      {view === "ranking" && (
        <main className="ranking-page">
          <div className="ranking-title">
            <div>
              <div className="eyebrow">THE PEOPLE'S PICKS</div>
              <h1>
                취향이 모여, <span>랭킹이 되다.</span>
              </h1>
              <p>모든 재생목록의 완료된 월드컵 결과를 합산했어요.</p>
            </div>
            <div className="ranking-emblem">
              <Trophy size={40} />
            </div>
          </div>
          <div className="rank-toolbar">
            <h2>
              전체 인기 랭킹 <span>{ranks.length}곡</span>
            </h2>
            <div className="segmented">
              <button
                onClick={() => setSort("crowns")}
                className={sort === "crowns" ? "selected" : ""}
              >
                우승 횟수
              </button>
              <button
                onClick={() => setSort("wins")}
                className={sort === "wins" ? "selected" : ""}
              >
                맞대결 승률
              </button>
            </div>
          </div>
          {rankLoading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" />
              <h2>랭킹을 불러오고 있어요</h2>
            </div>
          ) : rankError ? (
            <div className="empty-state" role="alert">
              <h2>잠시 랭킹을 불러올 수 없어요</h2>
              <p>{rankError}</p>
              <button className="outline" onClick={() => void showRanking()}>
                다시 시도
              </button>
            </div>
          ) : !ranks.length ? (
            <div className="empty-state">
              <Trophy size={38} />
              <h2>첫 번째 우승곡을 기다리고 있어요</h2>
              <p>내 재생목록으로 월드컵을 끝내면 여기에 기록돼요.</p>
              <button className="primary" onClick={() => setView("setup")}>
                월드컵 만들기
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="ranking-table">
              <table>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>곡</th>
                    <th>우승</th>
                    <th>맞대결 승률</th>
                    <th>참여 월드컵</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRanks.map((t, i) => (
                    <tr key={t.id}>
                      <td className={i === 0 ? "rank-first" : "rank-number"}>
                        {i === 0 ? <Crown size={22} /> : i + 1}
                      </td>
                      <td>
                        <div className="table-track">
                          {cover(t)}
                          <div>
                            <a
                              href={`https://www.youtube.com/watch?v=${t.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t.title}
                            </a>
                            <span>{t.artist}</span>
                          </div>
                        </div>
                      </td>
                      <td>{t.crowns}회</td>
                      <td>
                        <strong>
                          {Math.round((t.wins / (t.appearances || 1)) * 100)}%
                        </strong>
                        <span className="stat-detail">
                          {t.wins}승 / {t.appearances}경기
                        </span>
                      </td>
                      <td>{t.games}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="ranking-note">
            승률 = 선택받은 횟수 ÷ 맞대결 횟수 · 체험 결과 제외 · 곡의 유튜브
            영상별로 집계
          </p>
        </main>
      )}
      <footer className="site-footer">
        <span>
          PICKTRACK<span className="brand-period">.</span>
        </span>
        <p>좋아하는 음악, 끝까지 골라보세요.</p>
        <span>Powered by YouTube</span>
      </footer>
      {quit && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-title"
          >
            <button
              className="close-modal"
              onClick={() => setQuit(false)}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 id="quit-title">월드컵을 나갈까요?</h2>
            <p>
              진행 중인 선택은 저장되지 않고,
              <br />
              전체 랭킹에도 반영되지 않아요.
            </p>
            <div>
              <button
                className="outline"
                autoFocus
                onClick={() => setQuit(false)}
              >
                계속 고르기
              </button>
              <button
                className="primary"
                onClick={() => {
                  setQuit(false);
                  setView("setup");
                  setPlaying(null);
                  setGame(null);
                }}
              >
                나가기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
