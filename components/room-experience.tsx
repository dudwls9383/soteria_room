"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Flower2, Sun, Leaf, Snowflake, CalendarDays } from "lucide-react";
import { playbackError } from "../lib/video-facts";
import type { Track } from "../lib/music";
type Player = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(n: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(n: number): void;
  getVideoData(): {
    video_id?: string;
  };
  destroy(): void;
};
type API = {
  Player: new (element: HTMLElement, options: unknown) => Player;
};
declare global {
  interface Window {
    YT?: API;
    onYouTubeIframeAPIReady?: () => void;
  }
}
const AudioContext = createContext<{
  play: (track: Track) => void;
  add: (tracks: Track[]) => void;
  suspend: () => void;
}>({ play: () => {}, add: () => {}, suspend: () => {} });
export const useRoomAudio = () => useContext(AudioContext);
// One player lives outside tab panels: changing tabs never destroys playback.
export default function RoomExperience({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]),
    [current, setCurrent] = useState<Track | null>(null);
  const [season, setSeason] = useState("auto"),
    [ambient, setAmbient] = useState("soft"),
    [intro, setIntro] = useState(false);
  const [theater, setTheater] = useState(false),
    [list, setList] = useState(false),
    [paused, setPaused] = useState(true);
  const [ready, setReady] = useState(false),
    [volume, setVolume] = useState(80);
  const [strength, setStrength] = useState(35),
    [simple, setSimple] = useState(false),
    [notice, setNotice] = useState("");
  const [failures, setFailures] = useState<Record<string, string>>({}),
    [skipFailed, setSkipFailed] = useState(true);
  const failed = useRef(new Set<string>()),
    skipRef = useRef(true);
  skipRef.current = skipFailed;
  const [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [error, setError] = useState("");
  const mount = useRef<HTMLDivElement>(null),
    player = useRef<Player | null>(null),
    latest = useRef({ queue, current });
  const readyRef = useRef(false);
  readyRef.current = ready;
  latest.current = { queue, current };
  // Full-room mode changes CSS only: the iframe stays mounted and keeps playing.
  useEffect(() => {
    if (!theater) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", escape);
    };
  }, [theater]);
  useEffect(() => {
    if (!current && !queue.length) setTheater(false);
  }, [current, queue.length]);
  function add(tracks: Track[], announce = true) {
    const ids = new Set(latest.current.queue.map((t) => t.id));
    const added = tracks.filter((t) => !ids.has(t.id) && !!ids.add(t.id));
    const updated = [...latest.current.queue, ...added];
    latest.current = { ...latest.current, queue: updated };
    setQueue(updated);
    setList(true);
    if (announce)
      setNotice(
        added.length
          ? `${added.length}곡을 듣기 목록에 담았어요.`
          : "이미 듣기 목록에 있는 곡이에요.",
      );
  }
  function play(track: Track) {
    failed.current.delete(track.id);
    setFailures((old) => {
      const n = { ...old };
      delete n[track.id];
      return n;
    });
    add([track], false);
    setCurrent(track);
    setError("");
    if (ready && current?.id === track.id) player.current?.playVideo();
  }
  function next(step = 1) {
    const { queue: q, current: c } = latest.current;
    if (!q.length) return;
    const i = q.findIndex((t) => t.id === c?.id),
      target = q[(i + step + q.length) % q.length];
    setError("");
    if (target.id === c?.id) {
      if (readyRef.current) {
        player.current?.seekTo(0, true);
        player.current?.playVideo();
      }
    } else setCurrent(target);
  }
  // Failed tracks are retained for review. Automatic skipping only visits unfailed IDs,
  // so a queue containing only blocked videos cannot loop indefinitely.
  function handleError(code: number) {
    const { queue: q, current: c } = latest.current;
    if (!c) return;
    const actual = player.current?.getVideoData()?.video_id;
    if (actual && actual !== c.id) return;
    const message = playbackError(code);
    setError(message);
    setPaused(true);
    failed.current.add(c.id);
    setFailures((old) => ({ ...old, [c.id]: message }));
    if (skipRef.current && [100, 101, 150].includes(code)) {
      const i = q.findIndex((t) => t.id === c.id);
      const target = [...q.slice(i + 1), ...q.slice(0, i)].find(
        (t) => !failed.current.has(t.id),
      );
      if (target) {
        setNotice("재생할 수 없는 영상을 건너뛰었어요.");
        setCurrent(target);
      } else setError(message + " 재생 가능한 다음 곡이 없어 멈췄어요.");
    }
  }
  useEffect(() => {
    try {
      setSeason(localStorage.getItem("room-season") || "auto");
      setAmbient(localStorage.getItem("room-ambient") || "soft");
      const stored = localStorage.getItem("room-ambient-strength");
      if (stored !== null)
        setStrength(Math.min(100, Math.max(0, Number(stored) || 0)));
      if (!sessionStorage.getItem("room-entered")) {
        setIntro(true);
        sessionStorage.setItem("room-entered", "1");
      }
    } catch {}
    const timer = setTimeout(() => setIntro(false), 1800);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    try {
      localStorage.setItem("room-ambient-strength", String(strength));
    } catch {}
  }, [strength]);
  useEffect(() => {
    const month = new Date().getMonth() + 1;
    const resolved =
      season === "auto"
        ? month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter"
        : season;
    document.documentElement.dataset.season = resolved;
    try {
      localStorage.setItem("room-season", season);
      localStorage.setItem("room-ambient", ambient);
    } catch {}
  }, [season, ambient]);
  useEffect(() => {
    if (!current) return;
    let active = true;
    const create = () => {
      if (!active || !mount.current || !window.YT) return;
      player.current = new window.YT.Player(mount.current, {
        videoId: latest.current.current?.id,
        playerVars: { autoplay: 1, playsinline: 1, origin: location.origin },
        events: {
          onReady: () => {
            setReady(true);
            player.current?.setVolume(volume);
          },
          onStateChange: (e: { data: number }) => {
            setPaused(e.data !== 1);
            if (e.data === 1) setError("");
            if (e.data === 0) next();
          },
          onError: (e: { data: number }) => handleError(e.data),
        },
      });
    };
    if (window.YT?.Player) create();
    else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        create();
      };
      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        )
      ) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.onerror = () =>
          setError("YouTube 재생기를 불러오지 못했어요. 연결을 확인해 주세요.");
        document.head.appendChild(s);
      }
    }
    return () => {
      active = false;
      setReady(false);
      player.current?.destroy();
      player.current = null;
    };
    // Create once for the listening session; subsequent songs use loadVideoById.
  }, [!!current]);
  useEffect(() => {
    if (current && ready && player.current) {
      setTime(0);
      setDuration(0);
      setError("");
      player.current.loadVideoById(current.id);
    }
  }, [current?.id, ready]);
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        setTime(player.current?.getCurrentTime() || 0);
        setDuration(player.current?.getDuration() || 0);
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const clock = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  return (
    <AudioContext.Provider
      value={{
        play,
        add,
        suspend: () => {
          if (ready) player.current?.pauseVideo();
        },
      }}
    >
      {current && !simple && ambient !== "off" && strength > 0 && (
        <div
          className={`room-ambient ${ambient}`}
          key={current.id}
          aria-hidden="true"
          style={{
            backgroundImage: `url("${current.thumbnail}")`,
            opacity: (strength / 100) * 0.65,
          }}
        />
      )}
      {intro && (
        <div className="room-entrance" aria-hidden="true">
          <strong>SOTERIA ROOM</strong>
          <span>▂ ▅ ▃ ▇ ▄</span>
        </div>
      )}
      <div inert={theater}>
        {children}
        <div className="season-switch" aria-label="계절 테마">
          {[
            ["auto", "자동", CalendarDays],
            ["spring", "봄", Flower2],
            ["summer", "여름", Sun],
            ["autumn", "가을", Leaf],
            ["winter", "겨울", Snowflake],
          ].map(([id, label, Icon]) => {
            const Symbol = Icon as typeof Sun;
            return (
              <button
                key={String(id)}
                title={String(label)}
                aria-label={`${label} 테마`}
                aria-pressed={season === id}
                onClick={() => setSeason(String(id))}
              >
                <Symbol size={18} />
                <span>{String(label)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {notice && (
        <div className="queue-notice glass" role="status">
          {notice}
        </div>
      )}
      {(current || queue.length > 0) && (
        <aside
          className={`listening-room glass ${theater ? "theater" : ""} ${simple ? "simple" : ""} ${list ? "" : "list-hidden"}`}
          role={theater ? "dialog" : undefined}
          aria-modal={theater ? true : undefined}
          aria-label="임시 듣기 목록"
        >
          <div className="listening-heading">
            <strong className="notranslate" translate="no">
              {current?.title || "임시 듣기 목록"}
            </strong>
            <button
              aria-pressed={theater}
              onClick={() => {
                if (!current && queue[0]) play(queue[0]);
                setTheater((v) => !v);
                setList(true);
              }}
            >
              {theater ? "기본 모드" : "전체 모드"}
            </button>
            <button onClick={() => setList((v) => !v)}>
              목록 {queue.length}
            </button>
            <button
              aria-label="재생 종료"
              onClick={() => {
                setCurrent(null);
                setTheater(false);
                setError("");
              }}
            >
              ×
            </button>
          </div>
          {current && (
            <div className="listening-body">
              <div className="listening-video">
                <div ref={mount} />
              </div>
              <div className="listening-controls">
                <p className="notranslate" translate="no">
                  {current.artist}
                </p>
                <div>
                  <button onClick={() => next(-1)}>이전</button>
                  <button
                    disabled={!ready}
                    onClick={() =>
                      paused
                        ? player.current?.playVideo()
                        : player.current?.pauseVideo()
                    }
                  >
                    {paused ? "재생" : "일시정지"}
                  </button>
                  <button onClick={() => next()}>다음</button>
                  <button
                    onClick={() =>
                      setQueue((q) => {
                        const shuffled = [...q];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [shuffled[i], shuffled[j]] = [
                            shuffled[j],
                            shuffled[i],
                          ];
                        }
                        return shuffled;
                      })
                    }
                  >
                    셔플
                  </button>
                </div>
                <label>
                  진행 {clock(time)} / {clock(duration)}
                  <input
                    aria-label="재생 위치"
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={Math.min(time, duration || 1)}
                    disabled={!duration}
                    onChange={(e) =>
                      player.current?.seekTo(Number(e.target.value), true)
                    }
                  />
                </label>
                <label>
                  볼륨{" "}
                  <input
                    aria-label="볼륨"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    disabled={!ready}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVolume(v);
                      player.current?.setVolume(v);
                    }}
                  />
                </label>
                <label>
                  앰비언트 강도 · {strength}%
                  <input
                    aria-label="앰비언트 강도"
                    type="range"
                    min="0"
                    max="100"
                    value={strength}
                    disabled={simple || ambient === "off"}
                    onChange={(e) => setStrength(Number(e.target.value))}
                  />
                </label>
                <label>
                  앰비언트{" "}
                  <select
                    disabled={simple}
                    value={ambient}
                    onChange={(e) => setAmbient(e.target.value)}
                  >
                    <option value="off">끔</option>
                    <option value="soft">은은하게</option>
                    <option value="immersive">몰입</option>
                  </select>
                </label>
                <label className="player-option">
                  <input
                    type="checkbox"
                    checked={simple}
                    onChange={(e) => setSimple(e.target.checked)}
                  />
                  간소화 화면
                </label>
                <label className="player-option">
                  <input
                    type="checkbox"
                    checked={skipFailed}
                    onChange={(e) => setSkipFailed(e.target.checked)}
                  />
                  재생 불가 영상 건너뛰기
                </label>
                {simple && (
                  <small>
                    배경 효과만 꺼집니다. 영상 데이터는 계속 사용해요. 화질은
                    YouTube 재생기의 설정에서 조절할 수 있어요.
                  </small>
                )}
                <a
                  href={`https://youtu.be/${current.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube에서 듣기 ↗
                </a>
                {error && <p role="alert">{error}</p>}
              </div>
            </div>
          )}
          {list && (
            <div className="listening-queue">
              <button
                onClick={() => {
                  setCurrent(null);
                  setQueue([]);
                  setFailures({});
                  failed.current.clear();
                }}
              >
                목록 비우기
              </button>
              <small>
                이 브라우저에서 잠깐 듣는 목록 · 새로고침하면 비워져요.
              </small>
              {queue.map((t, i) => (
                <div key={t.id}>
                  <button
                    aria-pressed={current?.id === t.id}
                    className="notranslate"
                    translate="no"
                    onClick={() => play(t)}
                  >
                    <span className="queue-number">
                      {current?.id === t.id ? "♫" : i + 1}
                    </span>
                    <span className="queue-track">
                      <strong>{t.title}</strong>
                      <small>{t.artist}</small>
                      {failures[t.id] && (
                        <small className="queue-error">{failures[t.id]}</small>
                      )}
                    </span>
                  </button>
                  <button
                    disabled={i === 0}
                    aria-label={`${t.title} 위로`}
                    onClick={() =>
                      setQueue((q) => {
                        const n = [...q];
                        [n[i - 1], n[i]] = [n[i], n[i - 1]];
                        return n;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={i === queue.length - 1}
                    aria-label={`${t.title} 아래로`}
                    onClick={() =>
                      setQueue((q) => {
                        const n = [...q];
                        [n[i + 1], n[i]] = [n[i], n[i + 1]];
                        return n;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    aria-label={`${t.title} 목록에서 삭제`}
                    onClick={() => {
                      setQueue((q) => q.filter((x) => x.id !== t.id));
                      failed.current.delete(t.id);
                      if (t.id === current?.id)
                        setCurrent(queue.find((x) => x.id !== t.id) || null);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </AudioContext.Provider>
  );
}
