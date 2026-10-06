"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Flower2,
  Sun,
  Leaf,
  Snowflake,
  CalendarDays,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  RotateCcw,
  RotateCw,
  Settings2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  RectangleHorizontal,
  PictureInPicture2,
} from "lucide-react";
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
    [mini, setMini] = useState(false),
    [list, setList] = useState(false),
    [paused, setPaused] = useState(true);
  const [ready, setReady] = useState(false),
    [volume, setVolume] = useState(80);
  const [strength, setStrength] = useState(35),
    [settingsOpen, setSettingsOpen] = useState(false),
    [modeOpen, setModeOpen] = useState(false),
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
  const modePicker = useRef<HTMLDivElement>(null), modeButton = useRef<HTMLButtonElement>(null);
  const modes = [
    { id: "full", label: "전체 모드", icon: Maximize2 },
    { id: "normal", label: "기본 모드", icon: RectangleHorizontal },
    { id: "mini", label: "미니 모드", icon: PictureInPicture2 },
  ] as const;
  const selectedMode = theater ? "full" : mini ? "mini" : "normal";
  const ModeIcon = modes.find(mode => mode.id === selectedMode)!.icon;
  function chooseMode(mode: "full" | "normal" | "mini") {
    if (!current && queue[0]) play(queue[0]);
    setTheater(mode === "full");
    setMini(mode === "mini");
    if (mode === "full") setList(true);
    if (mode === "mini") setList(false);
    setSettingsOpen(false);
    setModeOpen(false);
    requestAnimationFrame(() => modeButton.current?.focus());
  }
  useEffect(() => {
    if (!modeOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!modePicker.current?.contains(event.target as Node)) setModeOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [modeOpen]);
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
    if (announce) setList(true);
    if (announce)
      setNotice(
        added.length
          ? `${added.length}곡을 듣기 목록에 담았어요.`
          : "이미 듣기 목록에 있는 곡이에요.",
      );
  }
  function play(track: Track) {
    window.dispatchEvent(new Event("room-youtube-play"));
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
            if(e.data===1)window.dispatchEvent(new Event("room-youtube-play"));
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
      {current && ambient !== "off" && strength > 0 && (
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
          className={`listening-room glass ${theater ? "theater" : ""} ${mini && !theater ? "mini-player" : ""} ${list ? "" : "list-hidden"}`}
          role={theater ? "dialog" : undefined}
          aria-modal={theater ? true : undefined}
          aria-label="임시 듣기 목록"
        >
          <div className="listening-heading">
            <strong className={current ? "notranslate" : undefined} translate={current ? "no" : undefined}>
              {current?.title || "임시 듣기 목록"}
            </strong>
            <div className="player-mode-picker" ref={modePicker}
              onKeyDown={event => { if (event.key === "Escape") {event.stopPropagation(); setModeOpen(false); requestAnimationFrame(()=>modeButton.current?.focus());} }}>
              {modeOpen ? <div className="player-mode-choices" role="group" aria-label="화면 모드" id="player-mode-choices">
                {modes.map(mode => {const Icon=mode.icon; return <button key={mode.id}
                  aria-label={mode.label} title={mode.label} aria-pressed={selectedMode===mode.id} autoFocus={selectedMode===mode.id}
                  onClick={()=>chooseMode(mode.id)}><Icon size={18}/></button>;})}
              </div> : <button ref={modeButton} aria-label="화면 모드 선택" aria-expanded={false}
                aria-controls="player-mode-choices" title={modes.find(mode=>mode.id===selectedMode)!.label}
                onClick={()=>setModeOpen(true)}><ModeIcon size={18}/></button>}
            </div>
            {mini && <button aria-label="재생 설정" aria-expanded={settingsOpen}
              onClick={()=>setSettingsOpen(v=>!v)}><Settings2 size={16}/></button>}
            <button aria-expanded={list} aria-controls="listening-queue"
              aria-label={list ? "듣기 목록 접기" : "듣기 목록 펼치기"}
              onClick={() => setList((v) => !v)}>
              {list ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
              <span>목록 {queue.length}</span>
            </button>
            <button
              aria-label="플레이어 닫기"
              onClick={() => {
                // YouTube adds control methods only after iframe initialization.
                // Closing during that interval must still clear the whole queue.
                player.current?.pauseVideo?.();
                setCurrent(null);
                setQueue([]);
                latest.current = { queue: [], current: null };
                setList(false);
                setTheater(false);
                setMini(false);
                setSettingsOpen(false);
                setModeOpen(false);
                setNotice("");
                failed.current.clear();
                setFailures({});
                setError("");
              }}
            >
              ×
            </button>
          </div>
          {current && (
            <>
              <div className="listening-body">
                <div className="listening-stage">
                  <div className="listening-video">
                    <div ref={mount} />
                  </div>
                </div>
              </div>
              <div className="listening-controls">
                <label className="playback-progress">
                  <span>{clock(time)}</span>
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
                  <span>{clock(duration)}</span>
                </label>
                <div className="playback-row">
                  <div className="playback-track notranslate" translate="no">
                    <img src={current.thumbnail} alt="" />
                    <div>
                      <strong>{current.title}</strong>
                      <small>{current.artist}</small>
                    </div>
                  </div>
                  <div className="playback-transport">
                    <button
                      aria-label="셔플"
                      title="셔플"
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
                      <Shuffle size={18} />
                    </button>
                    <button
                      aria-label="이전"
                      title="이전"
                      disabled={!ready}
                      onClick={() => next(-1)}
                    >
                      <SkipBack size={20} />
                    </button>
                    <button
                      aria-label="10초 뒤로"
                      title="10초 뒤로"
                      disabled={!ready}
                      onClick={() =>
                        player.current?.seekTo(Math.max(0, time - 10), true)
                      }
                    >
                      <RotateCcw size={17} />
                    </button>
                    <button
                      className="transport-play"
                      aria-label={paused ? "재생" : "일시정지"}
                      title={paused ? "재생" : "일시정지"}
                      disabled={!ready}
                      onClick={() =>
                        paused
                          ? player.current?.playVideo()
                          : player.current?.pauseVideo()
                      }
                    >
                      {paused ? (
                        <Play size={22} fill="currentColor" />
                      ) : (
                        <Pause size={22} fill="currentColor" />
                      )}
                    </button>
                    <button
                      aria-label="10초 앞으로"
                      title="10초 앞으로"
                      disabled={!ready}
                      onClick={() =>
                        player.current?.seekTo(
                          Math.min(duration, time + 10),
                          true,
                        )
                      }
                    >
                      <RotateCw size={17} />
                    </button>
                    <button
                      aria-label="다음"
                      title="다음"
                      disabled={!ready}
                      onClick={() => next()}
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>
                  <div className="playback-options">
                    <label>
                      볼륨
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
                    <button
                      aria-label="재생 설정"
                      title="재생 설정"
                      aria-expanded={settingsOpen}
                      onClick={() => setSettingsOpen((v) => !v)}
                    >
                      <Settings2 size={20} />
                    </button>
                  </div>
                </div>
                {settingsOpen && (
                  <div className="player-settings glass">
                    <div className="player-settings-heading"><strong>재생 설정</strong>
                      <button aria-label="재생 설정 닫기" onClick={()=>setSettingsOpen(false)}>×</button>
                    </div>
                    <label>
                      앰비언트
                      <select
                        value={ambient}
                        onChange={(e) => setAmbient(e.target.value)}
                      >
                        <option value="off">끔</option>
                        <option value="soft">은은하게</option>
                        <option value="immersive">몰입</option>
                      </select>
                    </label>
                    <label>
                      앰비언트 강도 · {strength}%
                      <input
                        aria-label="앰비언트 강도"
                        type="range"
                        min="0"
                        max="100"
                        value={strength}
                        disabled={ambient === "off"}
                        onChange={(e) => setStrength(Number(e.target.value))}
                      />
                    </label>
                    <label className="player-option">
                      <input
                        type="checkbox"
                        checked={skipFailed}
                        onChange={(e) => setSkipFailed(e.target.checked)}
                      />
                      재생 불가 영상 건너뛰기
                    </label>
                    <a
                      href={`https://youtu.be/${current.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      YouTube에서 듣기
                    </a>
                    <small>
                      화질은 YouTube 재생기의 설정에서 조절할 수 있어요.
                    </small>
                  </div>
                )}
                {error && <p role="alert">{error}</p>}
              </div>
            </>
          )}
          {list && (
            <div className="listening-queue" id="listening-queue">
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
                  <div className="queue-actions"><button
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
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </AudioContext.Provider>
  );
}
