"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  ImageOff,
  LoaderCircle,
  MessageCircle,
  Music2,
  Play,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useRoomAudio } from "./room-experience";

type Source = "blog" | "somunia" | "moesound";
type Filter = Source | "all";
type Language = "ko" | "ja" | "en";
type ConnectedPost = {
  source: Source;
  title: string;
  url: string;
  date: string;
  description: string;
  publishedAt: number | null;
  image?: string;
  category?: string;
  comments?: number;
  views?: number;
};
type SourceStatus = {
  id: Source;
  updatedAt: number | null;
  stale: boolean;
  error?: string;
  retryAt?: number;
};
type Feed = {
  posts: ConnectedPost[];
  sources: SourceStatus[];
  updatedAt: number | null;
  nextRefreshAt?: number;
};
type Preview = {
  description: string;
  image?: string;
  video?: { id: string; title: string; artist: string; thumbnail: string };
};

const spaces = [
  { id: "blog", href: "https://blog.naver.com/dudwls9383", icon: BookOpen },
  { id: "somunia", href: "https://gall.dcinside.com/mgallery/board/lists/?id=somunia", icon: MessageCircle },
  { id: "moesound", href: "https://gall.dcinside.com/mini/board/lists?id=moesound", icon: Music2 },
] as const;
const PAGE_SIZE = 18;
const CACHE_KEY = "soteria-connected-feed-v1";
const CACHE_AGE = 10 * 60 * 1000;

// Keep interface copy separate from original post titles and excerpts.
const copy = {
  ko: {
    title: "음악을 찾고, 이야기하는 곳.", intro: "음악을 찾고 취향을 기록하는 세 공간을 한곳에서.",
    all: "전체", blog: "블로그", somunia: "소무니아 갤러리", moesound: "카와이 보이스 갤러리",
    blogNote: "음악과 취향의 기록", somuniaNote: "소무니아를 함께 듣는 이야기", moesoundNote: "새로운 목소리를 발견하는 곳",
    space: "원래 공간으로", recent: "최근 이야기", search: "제목과 내용 검색", clear: "검색 지우기", count: "개의 글", read: "원문 읽기",
    refresh: "목록 새로고침", refreshing: "목록 확인 중", update: "마지막 확인", noDate: "최근 글", cache: "목록은 약 10분 간격으로 갱신돼요.",
    waiting: "뒤에 다시 확인할 수 있어요", loading: "세 공간의 최근 이야기를 불러오고 있어요.", empty: "아직 표시할 글이 없어요.", emptyNote: "원래 공간에서도 최근 글을 확인할 수 있어요.",
    noResults: "검색에 맞는 글이 없어요.", noResultsNote: "다른 단어를 검색하거나 전체 글로 돌아가 보세요.", reset: "검색 초기화",
    more: "글 더 보기", end: "불러온 최근 글을 모두 봤어요.", remaining: "개 남음", preview: "미리보기", closePreview: "미리보기 닫기", previewLoading: "이 글을 살펴보고 있어요.",
    previewError: "미리보기를 가져오지 못했어요. 원문에서 확인하거나 잠시 후 다시 시도해 주세요.", noPreview: "글 내용을 미리 볼 수 없어요. 원문에서 확인해 주세요.",
    previewNote: "글에 담긴 이야기와 YouTube 링크를 잠깐 살펴보세요.", retry: "다시 시도", play: "재생", add: "듣기 목록에 담기", added: "목록에 담았어요", video: "글에 담긴 영상", imageMissing: "이미지 대신 글로 만나보세요.",
    partial: "일부 공간의 새 글을 확인하지 못했어요.", saved: "마지막으로 확인한 글을 보여드려요.", failed: "글 목록을 가져오지 못했어요.", failedNote: "잠시 후 다시 시도하거나 위의 원래 공간에서 확인해 주세요.",
    comments: "댓글", views: "조회", filter: "연결 공간 선택", original: "제목과 글 내용은 원문 언어로 표시돼요.",
  },
  en: {
    title: "Where music becomes a conversation.", intro: "Three spaces for discovering music and recording taste, together.",
    all: "All", blog: "Blog", somunia: "Somunia Gallery", moesound: "Kawaii Voice Gallery",
    blogNote: "Music and personal notes", somuniaNote: "Conversations about Somunia", moesoundNote: "Discovering new voices",
    space: "Visit space", recent: "Recent stories", search: "Search titles and excerpts", clear: "Clear search", count: " posts", read: "Read original",
    refresh: "Refresh posts", refreshing: "Checking posts", update: "Last checked", noDate: "Recent post", cache: "Posts refresh about every 10 minutes.",
    waiting: "until the next refresh", loading: "Loading recent stories from the three spaces…", empty: "No recent posts to show yet.", emptyNote: "You can also check the original spaces above.",
    noResults: "No matching posts.", noResultsNote: "Try another word or return to all posts.", reset: "Reset search",
    more: "Show more posts", end: "You’ve reached the end of the loaded posts.", remaining: " remaining", preview: "Preview", closePreview: "Close preview", previewLoading: "Taking a look at this post…",
    previewError: "Could not load this preview. Open the original or try again shortly.", noPreview: "No excerpt is available. Please read the original post.",
    previewNote: "Take a quick look at the story and any YouTube link in the post.", retry: "Try again", play: "Play", add: "Add to queue", added: "Added to queue", video: "Video in this post", imageMissing: "Enjoy the story without an image.",
    partial: "Could not check new posts from some spaces.", saved: "Showing the last available posts.", failed: "Could not load the posts.", failedNote: "Try again shortly or visit an original space above.",
    comments: "Comments", views: "Views", filter: "Choose a connected space", original: "Post titles and excerpts are shown in their original language.",
  },
  ja: {
    title: "音楽を見つけ、語り合う場所。", intro: "音楽を探し、好みを記録する3つの場所をひとつに。",
    all: "すべて", blog: "ブログ", somunia: "ソムニア・ギャラリー", moesound: "カワイイボイス・ギャラリー",
    blogNote: "音楽と好みの記録", somuniaNote: "ソムニアについて語る場所", moesoundNote: "新しい声との出会い",
    space: "元のサイトへ", recent: "最近の話題", search: "タイトルと本文を検索", clear: "検索を消去", count: "件の投稿", read: "原文を読む",
    refresh: "投稿を更新", refreshing: "投稿を確認中", update: "最終確認", noDate: "最近の投稿", cache: "投稿は約10分間隔で更新されます。",
    waiting: "後に再確認できます", loading: "3つの場所から最近の話題を読み込んでいます。", empty: "表示できる投稿はまだありません。", emptyNote: "上の元サイトでも最近の投稿を確認できます。",
    noResults: "一致する投稿がありません。", noResultsNote: "別の言葉で検索するか、すべての投稿に戻ってください。", reset: "検索をリセット",
    more: "もっと見る", end: "読み込んだ投稿をすべて表示しました。", remaining: "件残っています", preview: "プレビュー", closePreview: "プレビューを閉じる", previewLoading: "この投稿を確認しています。",
    previewError: "プレビューを読み込めませんでした。原文を読むか、少し待ってから再試行してください。", noPreview: "本文のプレビューはありません。原文をご確認ください。",
    previewNote: "投稿の内容とYouTubeリンクを少しだけ確認できます。", retry: "再試行", play: "再生", add: "再生リストに追加", added: "リストに追加しました", video: "投稿内の動画", imageMissing: "画像なしで記事をお楽しみください。",
    partial: "一部の場所で新しい投稿を確認できませんでした。", saved: "最後に確認できた投稿を表示しています。", failed: "投稿を読み込めませんでした。", failedNote: "少し待ってから再試行するか、上の元サイトをご覧ください。",
    comments: "コメント", views: "閲覧", filter: "連携先を選ぶ", original: "投稿のタイトルと本文は原文の言語で表示します。",
  },
};

function localDate(value: number | null | undefined, language: Language) {
  if (!value || !Number.isFinite(value)) return "";
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-GB", {
    timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(value);
}
function normalize(value: string) { return value.normalize("NFKC").toLocaleLowerCase(); }

function PostImage({ src, label, compact = false }: { src?: string; label: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`connected-post-image${compact ? " compact" : ""}`}>
      {src && !failed ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="connected-image-fallback"><ImageOff size={22} aria-hidden="true" /><span>{label}</span></div>}
    </div>
  );
}

export default function ConnectedSpaces({ language, initialSource = "all" }: { language: Language; initialSource?: Filter }) {
  const text = copy[language];
  const audio = useRoomAudio();
  const [source, setSource] = useState<Filter>(initialSource);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [nextRefresh, setNextRefresh] = useState(0);
  const [now, setNow] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [addedUrl, setAddedUrl] = useState("");
  const request = useRef<AbortController | null>(null);
  const previewRequest = useRef<AbortController | null>(null);
  const previews = useRef(new Map<string, Preview>());

  function remember(value: Feed) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), feed: value })); } catch { /* Private browsing can disable session storage. */ }
  }
  async function load(refresh = false) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/posts?source=all${refresh ? "&refresh=1" : ""}`, { signal: controller.signal });
      const data = await response.json() as Feed;
      if (!response.ok || !Array.isArray(data.posts) || !Array.isArray(data.sources)) throw new Error("feed unavailable");
      setFeed(data);
      remember(data);
      const latestCheck = Math.max(0, ...data.sources.map(item => item.updatedAt || 0));
      const retryAt = Math.max(0, ...data.sources.map(item => item.retryAt || 0));
      // A refresh checks the shared cache; it never starts a crawl for every visitor.
      setNextRefresh(data.nextRefreshAt || retryAt || (latestCheck ? latestCheck + CACHE_AGE : Date.now() + 30_000));
      setNow(Date.now());
    } catch {
      if (!controller.signal.aborted) { setError(true); setNextRefresh(Date.now() + 30_000); setNow(Date.now()); }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    setNow(Date.now());
    try {
      const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null") as { savedAt: number; feed: Feed } | null;
      if (saved && Date.now() - saved.savedAt < CACHE_AGE && Array.isArray(saved.feed.posts) && Array.isArray(saved.feed.sources)) setFeed(saved.feed);
    } catch { /* Invalid old cache is ignored, then the real feed is requested. */ }
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { request.current?.abort(); previewRequest.current?.abort(); window.clearInterval(timer); };
    // The feed is independent of the selected source and interface language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setSource(initialSource); }, [initialSource]);
  useEffect(() => { setLimit(PAGE_SIZE); setPreviewUrl(""); previewRequest.current?.abort(); }, [source, query]);
  useEffect(() => {
    if (!addedUrl) return;
    const timer = window.setTimeout(() => setAddedUrl(""), 5000);
    return () => window.clearTimeout(timer);
  }, [addedUrl]);

  const posts = useMemo(() => {
    const term = normalize(query.trim());
    return (feed?.posts || []).filter(post => (source === "all" || post.source === source) && (!term || normalize(`${post.title} ${post.description} ${post.category || ""}`).includes(term)))
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  }, [feed, query, source]);
  const issues = (feed?.sources || []).filter(item => item.error || item.stale);
  const remaining = Math.max(0, Math.ceil((nextRefresh - now) / 1000));
  const wait = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  async function openPreview(post: ConnectedPost, retry = false) {
    if (previewUrl === post.url && !retry) { setPreviewUrl(""); previewRequest.current?.abort(); return; }
    previewRequest.current?.abort();
    setPreviewUrl(post.url); setPreview(null); setPreviewError(false); setPreviewBusy(false);
    const saved = previews.current.get(post.url);
    if (saved && !retry) { setPreview(saved); return; }
    const controller = new AbortController();
    previewRequest.current = controller;
    setPreviewBusy(true);
    try {
      const parameters = new URLSearchParams({ source: post.source, url: post.url });
      const response = await fetch(`/api/post-preview?${parameters}`, { signal: controller.signal });
      const data = await response.json() as Preview;
      if (!response.ok) throw new Error("preview unavailable");
      previews.current.set(post.url, data);
      setPreview(data);
    } catch {
      if (!controller.signal.aborted) setPreviewError(true);
    } finally {
      if (!controller.signal.aborted) setPreviewBusy(false);
    }
  }

  function renderPreview(post: ConnectedPost) {
    if (previewUrl !== post.url) return null;
    return (
      <div className="connected-preview" id={`connected-preview-${encodeURIComponent(post.url)}`}>
        <div className="connected-preview-top"><small>{text.previewNote}</small><button type="button" className="connected-icon-button" aria-label={text.closePreview} onClick={() => { setPreviewUrl(""); previewRequest.current?.abort(); }}><X size={17} /></button></div>
        {previewBusy ? <p className="connected-preview-loading" role="status"><LoaderCircle className="spin" size={17} />{text.previewLoading}</p> : previewError ? <div className="connected-preview-failure"><p role="status">{text.previewError}</p><button className="room-button subtle" type="button" onClick={() => void openPreview(post, true)}>{text.retry}</button></div> : <>
          {preview?.image && <PostImage src={preview.image} label={text.imageMissing} compact />}
          <p className="connected-preview-excerpt">{preview?.description || post.description || text.noPreview}</p>
          {preview?.video && <div className="connected-preview-video"><img src={preview.video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" /><div><small>{text.video}</small><strong>{preview.video.title || post.title}</strong>{preview.video.artist && <span>{preview.video.artist}</span>}<div className="connected-video-actions"><button className="room-button" type="button" onClick={() => audio.play(preview.video!)}><Play size={14} />{text.play}</button><button className="room-button subtle" type="button" onClick={() => { audio.add([preview.video!]); setAddedUrl(post.url); }}>{addedUrl === post.url ? <Check size={14} /> : <Plus size={14} />}{addedUrl === post.url ? text.added : text.add}</button></div></div></div>}
        </>}
        <a className="connected-original" href={post.url} target="_blank" rel="noreferrer">{text.read}<ArrowUpRight size={15} /></a>
      </div>
    );
  }

  return (
    <section className="connected-spaces notranslate" translate="no">
      <header className="room-heading connected-heading"><div><div className="room-eyebrow">CONNECTED SPACES</div><h1>{text.title}</h1><p>{text.intro}</p></div></header>
      <div className="connected-space-grid">
        {spaces.map(space => {
          const Icon = space.icon;
          const latest = (feed?.posts || []).filter(post => post.source === space.id).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))[0];
          return <article className={`connected-space-card glass source-${space.id}`} key={space.id}><div className="connected-space-top"><span className="connected-space-icon"><Icon size={20} /></span><div><h2>{text[space.id]}</h2><p>{text[`${space.id}Note`]}</p><a href={space.href} target="_blank" rel="noreferrer">{text.space}<ArrowUpRight size={13} /></a></div></div>{latest && <a className="connected-space-latest" href={latest.url} target="_blank" rel="noreferrer"><time>{latest.date || text.noDate}</time><span>{latest.title}<ArrowUpRight size={13} aria-hidden="true" /></span></a>}</article>;
        })}
      </div>

      <div className="connected-feed-toolbar">
        <div className="connected-source-filters glass" role="group" aria-label={text.filter}>
          {(["all", "blog", "somunia", "moesound"] as const).map(id => <button type="button" key={id} aria-pressed={source === id} className={source === id ? "active" : ""} onClick={() => setSource(id)}>{text[id]}{feed && <span>{feed.posts.filter(post => id === "all" || post.source === id).length}</span>}</button>)}
        </div>
        <label className="connected-search glass"><Search size={17} aria-hidden="true" /><input aria-label={text.search} value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} type="search" />{query && <button type="button" className="connected-icon-button" aria-label={text.clear} onClick={() => setQuery("")}><X size={15} /></button>}</label>
      </div>
      <div className="connected-feed-heading"><div><h2>{text.recent}</h2>{feed && <span>{posts.length.toLocaleString()}{text.count}</span>}</div><button type="button" className="room-button subtle connected-refresh" disabled={loading || remaining > 0} aria-label={remaining > 0 ? `${text.refresh} · ${wait} ${text.waiting}` : text.refresh} onClick={() => void load(true)}><RefreshCw size={14} className={loading ? "spin" : ""} />{loading ? text.refreshing : text.refresh}{!loading && remaining > 0 && <span>{wait}</span>}</button></div>
      <div className="connected-feed-meta"><span>{feed?.updatedAt ? `${text.update} · ${localDate(feed.updatedAt, language)}` : text.cache}</span>{feed?.updatedAt && <span>{text.cache}</span>}</div>
      {error && <div className="connected-feed-warning" role="status"><BookOpen size={17} aria-hidden="true" /><div><strong>{text.failed}</strong><p>{feed?.posts.length ? text.saved : text.failedNote}</p></div></div>}

      {loading && !feed ? <div className="connected-loading" aria-busy="true"><p role="status"><LoaderCircle size={17} className="spin" />{text.loading}</p><div className="connected-skeleton-grid">{Array.from({ length: 6 }, (_, index) => <div className="connected-skeleton glass" key={index}><span /><i /><i /></div>)}</div></div> : posts.length === 0 ? <div className="connected-empty glass"><BookOpen size={28} /><h3>{query.trim() ? text.noResults : error ? text.failed : text.empty}</h3><p>{query.trim() ? text.noResultsNote : error ? text.failedNote : text.emptyNote}</p>{query.trim() && <button type="button" className="room-button subtle" onClick={() => setQuery("")}>{text.reset}</button>}</div> : <>
        <div className={`connected-feed ${source === "blog" ? "blog-only" : "mixed"}`}>
          {posts.slice(0, limit).map(post => <article key={post.url} className={`connected-post glass ${post.source === "blog" ? "blog-post" : "gallery-post"}`}>
            {post.source === "blog" && <a className="connected-image-link" href={post.url} target="_blank" rel="noreferrer" aria-label={post.title}><PostImage src={post.image} label={text.imageMissing} /></a>}
            <div className="connected-post-body"><div className="connected-post-meta"><span className={`connected-source-label source-${post.source}`}>{text[post.source]}</span>{post.category && <span className="connected-category">{post.category}</span>}<time dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}>{post.date || text.noDate}</time></div><a className="connected-post-title" href={post.url} target="_blank" rel="noreferrer"><h3>{post.title}</h3><ArrowUpRight size={15} aria-hidden="true" /></a>{post.source === "blog" && post.description && <p className="connected-post-description">{post.description}</p>}<div className="connected-post-bottom"><div className="connected-post-stats">{typeof post.comments === "number" && <span title={text.comments}><MessageCircle size={12} aria-hidden="true" />{post.comments.toLocaleString()}</span>}{typeof post.views === "number" && <span title={text.views}><Eye size={12} aria-hidden="true" />{post.views.toLocaleString()}</span>}</div>{post.source === "blog" ? <a className="connected-original" href={post.url} target="_blank" rel="noreferrer">{text.read}<ArrowUpRight size={13} /></a> : <button className={`connected-preview-button${previewUrl === post.url ? " active" : ""}`} type="button" aria-expanded={previewUrl === post.url} aria-controls={`connected-preview-${encodeURIComponent(post.url)}`} onClick={() => void openPreview(post)}>{previewUrl === post.url ? text.closePreview : text.preview}<ChevronDown size={13} /></button>}</div></div>{renderPreview(post)}
          </article>)}
        </div>
        <div className="connected-feed-end">{limit < posts.length ? <button type="button" className="room-button glass" onClick={() => setLimit(value => value + PAGE_SIZE)}>{text.more}<span>{(posts.length - limit).toLocaleString()}{text.remaining}</span><ChevronDown size={15} /></button> : <p>{text.end}</p>}<small>{text.original}</small></div>
      </>}
    </section>
  );
}
