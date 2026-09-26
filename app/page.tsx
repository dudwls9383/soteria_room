"use client";
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Library,
  Languages,
  Link2,
  ListMusic,
  LoaderCircle,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import WorldCup from "../components/world-cup";
import RandomDiscovery from "../components/random-discovery";
import {
  inScope,
  kindOf,
  displayTitle,
  comparePlaylists,
  scopes,
  seriesLists,
  yearOf,
  type Scope,
} from "../lib/collections";
import type { Playlist, Track } from "../lib/music";
import type { ChannelPlaylist } from "../lib/channel";
import { monthOf, searchLibrary } from "../lib/archive";
import "./room.css";

type Saved = Playlist & { updatedAt: number };
type Post = { title: string; url: string; date: string; description?: string };
type TranslateLanguage = "ko" | "ja" | "en";
const DAY = 86400000;
const linkPage = "https://lit.link/en/soteria";
const translateOptions: { value: TranslateLanguage; label: string }[] = [
  { value: "ko", label: "KO" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "EN" },
];
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          element: string,
        ) => void;
      };
    };
  }
}
const pageCopy: Record<
  string,
  { eyebrow: string; title: string; description: string }
> = {
  pick: {
    eyebrow: "CURATED BY SOTERIA",
    title: "오늘은 어떤 음악일까요.",
    description: "한 번 더 듣고, 고르고, 다듬어 둔 큐레이션.",
  },
  archive: {
    eyebrow: "COLLECTED & CURATED",
    title: "모아 둔 음악, 골라 둔 음악.",
    description: "월별 수집 목록과 선별한 월의 픽을 나누어 살펴보세요.",
  },
  recap: {
    eyebrow: "MY RECAP · 2026—2021",
    title: "나의 계절을 채운 음악.",
    description: "My Recap 2026~2021 · 채널에서 묶어 둔 22개의 리캡.",
  },
  kawaii: {
    eyebrow: "KAWAII VOICE PLAYLIST",
    title: "카와이 보이스, 하나의 시리즈.",
    description: "room부터 괴멸적 카와보 플리까지 · 10개의 큐레이션.",
  },
};
// 새 기능은 이 목록과 아래 TabsContent를 추가하면 독립 탭으로 확장할 수 있습니다.
const modules = [
  { id: "pick", name: "재생목록 픽", icon: Sparkles, group: "음악 보관실" },
  { id: "search", name: "유튜브 재생목록 검색기", icon: Search },
  { id: "archive", name: "월별 수집 · 큐레이션", icon: CalendarDays },
  { id: "recap", name: "My Recap", icon: AudioLines },
  { id: "kawaii", name: "Kawaii Voice 시리즈", icon: ListMusic },
  { id: "random", name: "랜덤 디깅", icon: Shuffle, group: "작은 프로젝트" },
  { id: "worldcup", name: "음악 월드컵", icon: Trophy },
  { id: "blog", name: "블로그 포스트", icon: BookOpen, group: "연결된 공간" },
  { id: "somunia", name: "소무니아 갤러리", icon: MessageCircle },
  { id: "moesound", name: "카와이 보이스 갤러리", icon: MessageCircle },
  { id: "settings", name: "가져오기 · 동기화", icon: Settings2, group: "관리" },
];
const sources: Record<string, string> = {
  blog: "https://blog.naver.com/dudwls9383",
  somunia: "https://gall.dcinside.com/mgallery/board/lists/?id=somunia",
  moesound: "https://gall.dcinside.com/mini/board/lists?id=moesound",
};
async function request(path: string, input?: object) {
  const res = await fetch(
    path,
    input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : undefined,
  );
  const data: any = await res.json();
  if (!res.ok)
    throw new Error(data.error || "불러오지 못했습니다. 다시 시도해 주세요.");
  return data;
}
// 제목에 명시된 월만 분류합니다. 수집 날짜를 발행 월로 오인하지 않도록 합니다.
export default function Room() {
  const [tab, setTab] = useState("pick"),
    [library, setLibrary] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("month");
  const [selected, setSelected] = useState<Saved | null>(null);
  const [channel, setChannel] = useState<ChannelPlaylist[]>([]),
    [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, title: "" });
  const [failures, setFailures] = useState<
    { id: string; title: string; message: string }[]
  >([]);
  const [url, setUrl] = useState(""),
    [importing, setImporting] = useState(false),
    [lastSync, setLastSync] = useState(0);
  const [featuredId, setFeaturedId] = useState(""),
    [cupVisited, setCupVisited] = useState(false),
    [cupPlaylist, setCupPlaylist] = useState<Playlist | null>(null);
  const [posts, setPosts] = useState<Post[]>([]),
    [postLoading, setPostLoading] = useState(false),
    [postError, setPostError] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [searchScope, setSearchScope] = useState<Scope>("picks");
  const [archiveScope, setArchiveScope] = useState<Scope>("monthly");
  const [year, setYear] = useState("all");
  const [homeKind, setHomeKind] = useState("all");
  const [language, setLanguage] = useState<TranslateLanguage>("ko");
  const lock = useRef(false),
    libraryRef = useRef(library);
  libraryRef.current = library;
  const allTracks = searchLibrary(library, "");
  const unique = { size: allTracks.length };
  const tracks = searchLibrary(
    library.filter((p) => inScope(p, searchScope)),
    query,
  );
  const baseLibrary = library.filter((p) =>
    tab === "pick"
      ? !["monthly", "recap", "kawaii"].includes(kindOf(p)) &&
        (homeKind === "all" || kindOf(p) === homeKind)
      : tab === "archive"
        ? inScope(p, archiveScope)
        : tab === "recap" || tab === "kawaii"
          ? kindOf(p) === tab
          : true,
  );
  const years = [...new Set(baseLibrary.map((p) => yearOf(p)).filter(Boolean))]
    .sort()
    .reverse() as string[];
  const visible = baseLibrary
    .filter(
      (p) =>
        (year === "all" || yearOf(p) === year) &&
        (filter === "all" || monthOf(p.title).endsWith("." + filter)) &&
        displayTitle(p).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => comparePlaylists(a, b, sort, direction));
  const selectedSeries =
    tab === "recap"
      ? seriesLists.recap
      : tab === "kawaii"
        ? seriesLists.kawaii
        : [];
  const missingSeries = selectedSeries.filter(
    (p) => !library.some((x) => x.id === p.id),
  );
  const latestPick = [...library]
    .filter((p) => p.title.includes("픽") && monthOf(p.title).startsWith("20"))
    .sort((a, b) => monthOf(b.title).localeCompare(monthOf(a.title)))[0];
  const featured =
    library.find((p) => p.id === featuredId) ||
    latestPick ||
    visible[0] ||
    baseLibrary[0];
  function navigate(id: string) {
    setTab(id);
    window.scrollTo(0, 0);
    setQuery("");
    setFilter("all");
    setYear("all");
    setSelected(null);
    if (id === "worldcup") setCupVisited(true);
    history.replaceState(null, "", `#${id}`);
  }
  function selectLanguage(nextLanguage: TranslateLanguage) {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    if (nextLanguage === "ko") {
      document.cookie = "googtrans=;path=/;max-age=0";
    } else {
      document.cookie = `googtrans=/ko/${nextLanguage};path=/;max-age=31536000;SameSite=Lax`;
    }
    window.location.reload();
  }
  async function reload() {
    const data = await request("/api/library");
    setLibrary(data.playlists);
    libraryRef.current = data.playlists;
  }
  // 순차 가져오기로 요청을 제한하고 실패한 목록만 보고합니다. 다음 실행은 최근 저장분을 건너뜁니다.
  async function synchronize(force = false, retryOnly = false) {
    if (lock.current) return;
    lock.current = true;
    setSyncing(true);
    const previousFailures = failures;
    if (!retryOnly) setFailures([]);
    setError("");
    setNotice("");
    setProgress({
      done: 0,
      total: 0,
      title: retryOnly
        ? "실패한 재생목록만 다시 확인하고 있어요"
        : "채널의 공개 재생목록을 찾고 있어요",
    });
    const failed: { id: string; title: string; message: string }[] = [];
    try {
      let discovered: ChannelPlaylist[];
      if (retryOnly) {
        discovered = previousFailures.map((p) => ({
          id: p.id,
          title: p.title,
          thumbnail: "",
        }));
      } else {
        const data = await request("/api/channel");
        discovered = [
          ...new Map(
            [
              ...data.playlists,
              ...seriesLists.recap.map((p) => ({ ...p, thumbnail: "" })),
            ].map((p) => [p.id, p]),
          ).values(),
        ] as ChannelPlaylist[];
        setChannel(discovered);
      }
      const pending = retryOnly
        ? discovered
        : discovered.filter(
            (p) =>
              force ||
              !libraryRef.current.some(
                (s) => s.id === p.id && Date.now() - s.updatedAt < DAY,
              ),
          );
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        setProgress({ done: i, total: pending.length, title: p.title });
        try {
          const imported = await request("/api/playlist", {
            url: `https://www.youtube.com/playlist?list=${p.id}`,
            force,
          });
          setLibrary((current) => {
            const next = [
              { ...imported, updatedAt: Date.now() },
              ...current.filter((x) => x.id !== imported.id),
            ];
            libraryRef.current = next;
            return next;
          });
        } catch (e) {
          failed.push({
            id: p.id,
            title: p.title,
            message: (e as Error).message,
          });
          setFailures([...failed]);
        }
        setProgress({ done: i + 1, total: pending.length, title: p.title });
      }
      setFailures(failed);
      if (!failed.length) {
        const now = Date.now();
        localStorage.setItem("soteria-last-sync", String(now));
        setLastSync(now);
      }
      setNotice(
        failed.length
          ? `${pending.length - failed.length}개 갱신 · ${failed.length}개 다시 확인 필요`
          : retryOnly
            ? "실패했던 재생목록을 모두 다시 가져왔어요."
            : `채널의 재생목록 ${discovered.length}개를 확인했어요.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setSyncing(false);
    }
  }
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (modules.some((m) => m.id === hash)) {
      setTab(hash);
      if (hash === "worldcup") setCupVisited(true);
    }
    const last = Number(localStorage.getItem("soteria-last-sync") || 0);
    setLastSync(last);
    void reload()
      .then(() => {
        if (
          Date.now() - last > DAY ||
          seriesLists.recap.some(
            (p) => !libraryRef.current.some((x) => x.id === p.id),
          )
        )
          void synchronize();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      if (
        Date.now() - Number(localStorage.getItem("soteria-last-sync") || 0) >
        DAY
      )
        void synchronize();
    }, 3600000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const translated = document.cookie.match(
      /(?:^|;\s*)googtrans=\/ko\/(ja|en)/,
    );
    if (translated?.[1] === "ja" || translated?.[1] === "en") {
      setLanguage(translated[1]);
      document.documentElement.lang = translated[1];
    }
    if (document.getElementById("google-translate-script")) return;
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "ko",
          includedLanguages: "ko,ja,en",
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);
  useEffect(() => {
    if (!sources[tab]) return;
    let active = true;
    setPosts([]);
    setPostLoading(true);
    setPostError("");
    request(`/api/posts?source=${tab}`)
      .then((data) => {
        if (active) setPosts(data.posts);
      })
      .catch((e) => {
        if (active) setPostError(e.message);
      })
      .finally(() => {
        if (active) setPostLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);
  async function importOne(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setError("");
    try {
      const p = await request("/api/playlist", { url, force: true });
      await reload();
      setSelected({ ...p, updatedAt: Date.now() });
      setNotice(`‘${p.title}’을 가져왔어요.`);
      setUrl("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }
  async function copyLinks(items: Track[]) {
    try {
      await navigator.clipboard.writeText(
        items.map((t) => `https://youtu.be/${t.id}`).join("\n"),
      );
      setNotice(`${items.length}곡의 공유링크를 복사했어요.`);
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  async function copyPlaylistShare(p: Saved) {
    try {
      await navigator.clipboard.writeText(
        `https://www.youtube.com/playlist?list=${p.id}`,
      );
      setNotice("재생목록 공유링크를 복사했어요.");
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  function openPlaylist(p: Saved) {
    setSelected(p);
  }
  useEffect(() => {
    if (selected)
      document
        .getElementById("playlist-detail")
        ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [selected]);
  function card(p: Saved, i: number) {
    return (
      <article className="room-card" key={p.id}>
        <button
          className={`room-cover tone-${i % 4}`}
          onClick={() => openPlaylist(p)}
          aria-label={`${p.title} 곡 목록 보기`}
        >
          {(p.thumbnail || p.tracks[0]) && (
            <img
              src={p.thumbnail || p.tracks[0]?.thumbnail}
              alt=""
              loading="lazy"
            />
          )}
          <span className="cover-shade" />
          <span className="cover-count">
            <ListMusic size={14} />
            {p.tracks.length}곡
          </span>
          <span className="cover-open">
            <ArrowUpRight size={23} />
          </span>
        </button>
        <div className="card-meta">
          <span>
            {kindOf(p) === "recap"
              ? "MY RECAP"
              : kindOf(p) === "kawaii"
                ? "KAWAII VOICE"
                : kindOf(p) === "monthly"
                  ? "수집 목록"
                  : kindOf(p) === "picks"
                    ? "월의 픽"
                    : "큐레이션"}
          </span>
        </div>
        <button
          className="card-title notranslate"
          translate="no"
          onClick={() => openPlaylist(p)}
        >
          {displayTitle(p)}
        </button>
        <p>
          SOTERIA ROOM{" "}
          <span>
            · {p.tracks.length}곡 ·{" "}
            {p.views == null
              ? "조회수 미제공"
              : `${p.views.toLocaleString()}회 조회`}
          </span>
        </p>
      </article>
    );
  }
  return (
    <Tabs
      value={tab}
      onValueChange={navigate}
      orientation="vertical"
      className="room-layout"
    >
      <aside className="room-sidebar glass">
        <a
          className="room-brand"
          href="#pick"
          onClick={(e) => {
            e.preventDefault();
            navigate("pick");
          }}
        >
          <span className="room-mark">
            <AudioLines size={25} />
          </span>
          <span>
            SOTERIA<span className="room-brand-sub">R O O M</span>
          </span>
        </a>
        <div className="sidebar-caption">나의 음악 보관실</div>
        <TabsList className="room-nav" aria-label="프로젝트 선택">
          {modules.map((m) => (
            <div className="nav-entry" key={m.id}>
              {m.group && (
                <div className="nav-group">
                  {m.group}
                  <ChevronDown size={12} />
                </div>
              )}
              <TabsTrigger value={m.id} className="room-nav-item">
                <m.icon size={18} />
                <span>{m.name}</span>
              </TabsTrigger>
            </div>
          ))}
        </TabsList>
        <div className="sidebar-bottom">
          <div className="source-avatar">s.</div>
          <div>
            <strong>soteria_room</strong>
            <a
              href="https://www.youtube.com/@soteria_room"
              target="_blank"
              rel="noreferrer"
            >
              YouTube 채널 <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </aside>
      <div className="room-workspace">
        <header className="room-topbar">
          <div>
            <span className="breadcrumb">내 공간</span>
            <span className="slash">/</span>
            {modules.find((m) => m.id === tab)?.name}
          </div>
          <div className="top-actions">
            <div
              id="google_translate_element"
              className="translate-widget"
              aria-hidden="true"
            />
            <div className="language-switcher" aria-label="번역 언어 선택">
              <Languages size={15} />
              {translateOptions.map((option) => (
                <button
                  key={option.value}
                  className={language === option.value ? "active" : ""}
                  onClick={() => selectLanguage(option.value)}
                  aria-pressed={language === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <a
              className="link-page-button"
              href={linkPage}
              target="_blank"
              rel="noreferrer"
            >
              <Link2 size={15} />
              link
            </a>
            <span className="local-badge">LOCAL ROOM</span>
            <button
              className="icon-button"
              onClick={() => navigate("settings")}
              aria-label="재생목록 추가"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>
        <div className="room-body">
          {error && (
            <div className="room-message error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="오류 닫기">
                <X size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="room-message" role="status">
              <Check size={16} />
              {notice}
              <button onClick={() => setNotice("")} aria-label="알림 닫기">
                <X size={17} />
              </button>
            </div>
          )}
          {syncing && (
            <div className="sync-bar" role="status">
              <LoaderCircle size={16} className="spin" />
              <span>
                {progress.total
                  ? `${progress.done} / ${progress.total}개 가져오는 중`
                  : "채널 확인 중"}
                <small>{progress.title}</small>
              </span>
              {progress.total > 0 && (
                <progress value={progress.done} max={progress.total} />
              )}
            </div>
          )}
          {["pick", "archive", "recap", "kawaii"].map((id) => (
            <TabsContent value={id} key={id}>
              <div className="room-heading">
                <div>
                  <div className="room-eyebrow">{pageCopy[id].eyebrow}</div>
                  <h1>{pageCopy[id].title}</h1>
                  <p>{pageCopy[id].description}</p>
                </div>
                <button
                  className="room-button subtle"
                  onClick={() => navigate("settings")}
                >
                  <Plus size={17} />
                  재생목록 추가
                </button>
              </div>
              {id === "pick" && (
                <section className="pick-grid">
                  <div className="featured glass">
                    {(featured?.thumbnail || featured?.tracks[0]) && (
                      <img
                        className="featured-backdrop"
                        src={
                          featured?.thumbnail || featured?.tracks[0]?.thumbnail
                        }
                        alt=""
                      />
                    )}
                    <div className="featured-overlay" />
                    <div className="featured-copy">
                      <span className="glass-pill">
                        <Sparkles size={14} />
                        PLAYLIST PICK
                      </span>
                      <h2 className="notranslate" translate="no">
                        {featured?.title || "당신의 취향이\n머무는 곳."}
                      </h2>
                      <p>
                        {featured
                          ? `${featured.tracks.length}곡 · SOTERIA ROOM`
                          : "채널에서 재생목록을 가져오면 이곳에 펼쳐져요."}
                      </p>
                      <div className="featured-actions">
                        <button
                          className="room-button bright"
                          onClick={() =>
                            featured
                              ? openPlaylist(featured)
                              : void synchronize()
                          }
                          disabled={!featured && syncing}
                        >
                          {featured
                            ? "재생목록 열기"
                            : syncing
                              ? "가져오는 중…"
                              : "채널에서 가져오기"}
                          <ArrowUpRight size={17} />
                        </button>
                        <button
                          className="glass-circle"
                          disabled={!library.length}
                          onClick={() => {
                            const other = baseLibrary.filter(
                              (p) => p.id !== featured?.id,
                            );
                            if (other.length)
                              setFeaturedId(
                                other[Math.floor(Math.random() * other.length)]
                                  .id,
                              );
                          }}
                          aria-label="다른 재생목록 뽑기"
                        >
                          <Shuffle size={19} />
                        </button>
                      </div>
                    </div>
                    <div className="featured-number">
                      01<span> / MY PLAYLISTS</span>
                    </div>
                  </div>
                  <div className="pick-side">
                    <div className="room-stats glass">
                      <span className="room-eyebrow">IN MY ROOM</span>
                      <div>
                        <strong>{library.length.toLocaleString()}</strong>
                        <span>개의 재생목록</span>
                      </div>
                      <div className="stats-bottom">
                        <AudioLines size={19} />
                        <b>{unique.size.toLocaleString()}</b>곡의 서로 다른 발견
                      </div>
                    </div>
                    <button
                      className="cup-shortcut glass"
                      onClick={() => navigate("worldcup")}
                    >
                      <span className="cup-orb">
                        <Trophy size={24} />
                      </span>
                      <span>
                        <small>음악 월드컵</small>
                        <strong>마지막에 남을 한 곡은?</strong>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </section>
              )}
              <section className="library-section">
                <div className="section-title">
                  <h2>
                    {id === "archive"
                      ? "분류해서 꺼내 듣기"
                      : id === "recap"
                        ? "My Recap"
                        : id === "kawaii"
                          ? "Kawaii Voice Playlist"
                          : "큐레이션 재생목록"}
                    <span>
                      {visible.length}
                      {missingSeries.length
                        ? ` / ${selectedSeries.length}`
                        : ""}
                    </span>
                  </h2>
                  <div className="sort-controls">
                    <label>
                      정렬
                      <select
                        aria-label="재생목록 정렬 기준"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="month">기간</option>
                        <option value="title">제목</option>
                        <option value="views">재생목록 조회수</option>
                        <option value="count">곡 수</option>
                        <option value="updated">갱신일</option>
                      </select>
                    </label>
                    <select
                      aria-label="정렬 방향"
                      value={direction}
                      onChange={(e) =>
                        setDirection(e.target.value as "asc" | "desc")
                      }
                    >
                      <option value="desc">내림차순</option>
                      <option value="asc">오름차순</option>
                    </select>
                  </div>
                </div>
                {id === "pick" && (
                  <div className="collection-switch">
                    <button
                      className={homeKind === "all" ? "active" : ""}
                      onClick={() => setHomeKind("all")}
                    >
                      전체 큐레이션
                    </button>
                    <button
                      className={homeKind === "picks" ? "active" : ""}
                      onClick={() => setHomeKind("picks")}
                    >
                      월의 픽
                    </button>
                    <button
                      className={homeKind === "other" ? "active" : ""}
                      onClick={() => setHomeKind("other")}
                    >
                      그 밖의 큐레이션
                    </button>
                  </div>
                )}
                {id === "archive" && (
                  <div className="archive-types">
                    <button
                      className={
                        archiveScope === "monthly" ? "active glass" : "glass"
                      }
                      onClick={() => {
                        setArchiveScope("monthly");
                        setYear("all");
                        setFilter("all");
                      }}
                    >
                      <Library size={22} />
                      <span>
                        <strong>월별·연간 수집 목록</strong>
                        <small>
                          202X.XX · a bundle of songs · 들었던 곡을 다시 찾는
                          보관함
                        </small>
                      </span>
                    </button>
                    <button
                      className={
                        archiveScope === "picks" ? "active glass" : "glass"
                      }
                      onClick={() => {
                        setArchiveScope("picks");
                        setYear("all");
                        setFilter("all");
                      }}
                    >
                      <Sparkles size={22} />
                      <span>
                        <strong>월의 픽 · 큐레이션</strong>
                        <small>한 달 동안 다시 듣고 선별한 재생목록</small>
                      </span>
                    </button>
                  </div>
                )}
                <div className="library-tools">
                  <div className="date-filters">
                    <label>
                      연도
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      >
                        <option value="all">전체 연도</option>
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                    </label>
                    {!["recap", "kawaii"].includes(id) && (
                      <label>
                        월
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        >
                          <option value="all">전체 월</option>
                          {Array.from({ length: 12 }, (_, i) =>
                            String(i + 1).padStart(2, "0"),
                          ).map((m) => (
                            <option key={m} value={m}>
                              {Number(m)}월
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <label className="room-search compact">
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="재생목록 찾기"
                      aria-label="재생목록 찾기"
                    />
                  </label>
                </div>
                {missingSeries.length > 0 && (
                  <div className="room-note">
                    {missingSeries.length}개 목록을 가져오는 중이거나 확인이
                    필요합니다.{" "}
                    <button
                      className="room-button subtle"
                      disabled={syncing}
                      onClick={() => void synchronize()}
                    >
                      미수집 목록 가져오기
                    </button>
                    <details>
                      <summary>아직 저장되지 않은 목록</summary>
                      {missingSeries.map((p) => (
                        <p key={p.id}>
                          <a
                            href={`https://www.youtube.com/playlist?list=${p.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="notranslate" translate="no">
                              {p.title}
                            </span>{" "}
                            ↗
                          </a>
                        </p>
                      ))}
                    </details>
                  </div>
                )}
                {loading ? (
                  <div className="room-empty">
                    <LoaderCircle className="spin" />
                    보관실을 열고 있어요.
                  </div>
                ) : visible.length ? (
                  id === "archive" && sort === "month" ? (
                    <div className="archive-groups">
                      {[
                        ...new Set(
                          visible.map(
                            (p) =>
                              p.title.match(/20\d{2}/)?.[0] || "기간 미분류",
                          ),
                        ),
                      ].map((y) => (
                        <section key={y}>
                          <h3>
                            {y}
                            <span>
                              {
                                visible.filter(
                                  (p) =>
                                    (p.title.match(/20\d{2}/)?.[0] ||
                                      "기간 미분류") === y,
                                ).length
                              }
                              개 목록
                            </span>
                          </h3>
                          <div className="playlist-grid">
                            {visible
                              .filter(
                                (p) =>
                                  (p.title.match(/20\d{2}/)?.[0] ||
                                    "기간 미분류") === y,
                              )
                              .map(card)}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="playlist-grid">{visible.map(card)}</div>
                  )
                ) : (
                  <div className="room-empty glass">
                    <Library size={34} />
                    <h3>
                      {library.length
                        ? "조건에 맞는 재생목록이 없어요."
                        : "첫 재생목록을 기다리고 있어요."}
                    </h3>
                    <p>
                      {library.length
                        ? "검색어와 필터를 바꿔보세요."
                        : "공개 재생목록을 자동으로 가져와 이 PC에 보관합니다."}
                    </p>
                    <button
                      className="room-button"
                      onClick={() => navigate("settings")}
                    >
                      가져오기 열기
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            </TabsContent>
          ))}
          <TabsContent value="search">
            <div className="room-heading">
              <div>
                <div className="room-eyebrow">YOUTUBE PLAYLIST SEARCHER</div>
                <h1>그 노래, 어디 있었더라.</h1>
                <p>제목, 채널 이름, 재생목록 이름으로 모든 곡을 찾아요.</p>
              </div>
            </div>
            <div className="scope-control">
              <label>
                검색할 범위
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value as Scope)}
                >
                  {scopes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <span>같은 영상은 한 번만 표시하고 소속 목록은 함께 남겨요.</span>
            </div>
            <label className="room-search large glass">
              <Search size={23} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="기억나는 제목이나 아티스트를 입력하세요"
                aria-label="곡 검색"
              />
            </label>
            <div className="section-title">
              <h2>
                검색 결과<span>{tracks.length}곡</span>
              </h2>
              <button
                className="room-button subtle"
                disabled={!tracks.length}
                onClick={() => void copyLinks(tracks)}
              >
                <Copy size={16} />
                공유링크 모두 복사
              </button>
            </div>
            <div className="track-list glass">
              {tracks.slice(0, 200).map((t, i) => (
                <a
                  className="room-track"
                  key={t.id}
                  href={`https://www.youtube.com/watch?v=${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="track-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <img src={t.thumbnail} alt="" loading="lazy" />
                  <span>
                    <strong className="notranslate" translate="no">
                      {t.title}
                    </strong>
                    <small>
                      <span className="notranslate" translate="no">
                        {t.artist} · {t.playlists.join(" / ")}
                      </span>
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              ))}
              {!tracks.length && (
                <div className="room-empty">
                  <Search size={30} />
                  <h3>
                    {library.length
                      ? "찾는 곡이 아직 없어요."
                      : "재생목록을 먼저 가져와 주세요."}
                  </h3>
                </div>
              )}
            </div>
            {tracks.length > 200 && (
              <p className="room-note">
                화면에는 앞의 200곡을 표시해요. 검색어로 좁히거나 전체 링크를
                복사할 수 있어요.
              </p>
            )}
          </TabsContent>
          <TabsContent value="random">
            <RandomDiscovery library={library} />
          </TabsContent>
          <TabsContent
            value="worldcup"
            forceMount
            hidden={tab !== "worldcup"}
            className="worldcup-module"
          >
            {cupVisited && (
              <WorldCup
                initialPlaylist={cupPlaylist}
                active={tab === "worldcup"}
              />
            )}
          </TabsContent>
          {["blog", "somunia", "moesound"].map((id) => (
            <TabsContent value={id} key={id}>
              <div className="room-heading">
                <div>
                  <div className="room-eyebrow">CONNECTED SPACES</div>
                  <h1>{modules.find((m) => m.id === id)?.name}</h1>
                  <p>
                    {id === "blog"
                      ? "음악과 함께 남겨 둔 이야기."
                      : "함께 듣고, 이야기하는 공간."}
                  </p>
                </div>
                <a
                  className="room-button"
                  href={sources[id]}
                  target="_blank"
                  rel="noreferrer"
                >
                  원문 공간 열기
                  <ExternalLink size={16} />
                </a>
              </div>
              {postLoading ? (
                <div className="room-empty">
                  <LoaderCircle className="spin" />
                  최근 글을 불러오고 있어요.
                </div>
              ) : postError ? (
                <div className="room-empty glass">
                  <BookOpen size={30} />
                  <h3>현재 글 목록을 불러올 수 없어요.</h3>
                  <p>{postError}</p>
                  <a
                    className="room-button"
                    href={sources[id]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    원문에서 보기
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              ) : (
                <div className="posts-grid">
                  {posts.map((p) => (
                    <a
                      className="post-card glass"
                      key={p.url}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>
                        {p.date || "최근 글"}
                        <ArrowUpRight size={17} />
                      </span>
                      <h2 className="notranslate" translate="no">
                        {p.title}
                      </h2>
                      {p.description && <p>{p.description}</p>}
                      <small>원문 읽기</small>
                    </a>
                  ))}
                  {!posts.length && (
                    <div className="room-empty">
                      표시할 최근 글이 없습니다. 원문 공간에서 확인해 주세요.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
          <TabsContent value="settings">
            <div className="room-heading">
              <div>
                <div className="room-eyebrow">KEEP YOUR ROOM UP TO DATE</div>
                <h1>새로운 음악을 들여오는 곳.</h1>
                <p>한 번 연결한 채널은 다음 달에도 그대로.</p>
              </div>
            </div>
            <div className="settings-grid">
              <section className="settings-card glass">
                <div className="setting-icon">
                  <RefreshCw size={22} />
                </div>
                <h2>채널 전체 자동 가져오기</h2>
                <a
                  className="source-link"
                  href="https://www.youtube.com/@soteria_room/playlists"
                  target="_blank"
                  rel="noreferrer"
                >
                  @soteria_room <ExternalLink size={14} />
                </a>
                <p>
                  앱을 열 때 확인하고, 실행 중에는 하루 간격으로 공개 재생목록과
                  수록곡을 갱신해요. 실패한 목록은 기존 내용을 유지합니다.
                </p>
                <button
                  className="room-button"
                  disabled={syncing}
                  onClick={() => void synchronize(true)}
                >
                  <RefreshCw size={16} className={syncing ? "spin" : ""} />
                  {syncing ? "채널 동기화 중…" : "지금 전체 동기화"}
                </button>
                <button
                  className="room-button subtle"
                  disabled={syncing || !failures.length}
                  onClick={() => void synchronize(true, true)}
                >
                  <RefreshCw
                    size={16}
                    className={syncing && failures.length ? "spin" : ""}
                  />
                  실패한 것만 다시 가져오기
                </button>
                <small>
                  마지막 전체 성공:{" "}
                  {lastSync
                    ? new Date(lastSync).toLocaleString("ko-KR")
                    : "아직 없음"}
                </small>
                {channel.length > 0 && (
                  <small>
                    채널에서 발견한 공개 재생목록 {channel.length}개
                  </small>
                )}
              </section>
              <section className="settings-card glass">
                <div className="setting-icon">
                  <Plus size={22} />
                </div>
                <h2>링크로 직접 가져오기</h2>
                <p>
                  다른 채널이나 일부 공개 재생목록도 링크로 추가할 수 있어요.
                  같은 목록을 다시 넣으면 최신 내용으로 갱신합니다.
                </p>
                <form onSubmit={importOne}>
                  <label htmlFor="import-url">YouTube 재생목록 주소</label>
                  <input
                    id="import-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    type="url"
                    placeholder="https://youtube.com/playlist?list=…"
                    required
                  />
                  <button
                    className="room-button"
                    disabled={importing || syncing}
                  >
                    {importing ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    가져오기
                  </button>
                </form>
              </section>
            </div>
            {failures.length > 0 && (
              <section className="settings-card glass">
                <div className="section-title compact-title">
                  <h2>다시 확인할 목록 · {failures.length}</h2>
                  <button
                    className="room-button subtle"
                    disabled={syncing}
                    onClick={() => void synchronize(true, true)}
                  >
                    <RefreshCw size={16} className={syncing ? "spin" : ""} />
                    실패 목록만 재시도
                  </button>
                </div>
                {failures.map((f, i) => (
                  <div className="sync-failure" key={i}>
                    <strong>{f.title}</strong>
                    <p>{f.message}</p>
                  </div>
                ))}
              </section>
            )}
            <div className="room-note">
              가져온 정보와 월드컵 결과는 이 PC에 저장돼요. 비공개 목록은 가져올
              수 없으며 비공개·삭제된 영상은 표시되지 않을 수 있어요.
            </div>
          </TabsContent>
          {selected && (
            <section
              id="playlist-detail"
              className="playlist-detail glass"
              aria-label="선택한 재생목록"
            >
              <div className="section-title">
                <div>
                  <span className="room-eyebrow">INSIDE THE PLAYLIST</span>
                  <h2 className="notranslate" translate="no">
                    {selected.title}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setSelected(null)}
                  aria-label="곡 목록 닫기"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="detail-actions">
                <a
                  className="room-button"
                  href={`https://www.youtube.com/playlist?list=${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  공유링크 열기
                  <ExternalLink size={16} />
                </a>
                <button
                  className="room-button subtle"
                  onClick={() => {
                    setCupPlaylist(selected);
                    navigate("worldcup");
                  }}
                >
                  <Trophy size={16} />이 목록으로 월드컵
                </button>
                <button
                  className="room-button subtle"
                  onClick={() => void copyPlaylistShare(selected)}
                >
                  <Copy size={16} />
                  공유링크 복사
                </button>
                <span>{selected.tracks.length}곡</span>
              </div>
              <div className="detail-tracks">
                {selected.tracks.map((t, i) => (
                  <a
                    className="room-track"
                    key={t.id}
                    href={`https://youtu.be/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="track-index">{i + 1}</span>
                    <img src={t.thumbnail} alt="" loading="lazy" />
                    <span>
                      <strong className="notranslate" translate="no">
                        {t.title}
                      </strong>
                      <small className="notranslate" translate="no">
                        {t.artist}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </a>
                ))}
              </div>
            </section>
          )}
          <footer className="room-footer">
            <span>SOTERIA ROOM</span>
            <span>음악을 모으고, 취향을 이어가는 공간.</span>
            <AudioLines size={18} />
          </footer>
        </div>
      </div>
    </Tabs>
  );
}
