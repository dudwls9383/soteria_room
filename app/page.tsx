"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Headphones,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Library,
  Languages,
  ListMusic,
  LockKeyhole,
  LoaderCircle,
  MessageCircle,
  Menu,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Trophy,
  Trash2,
  X,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { unpackLibrary } from "../lib/library-wire";
import { reconcileTranslation, type TranslationRecord } from "../lib/live-translation";
import WorldCup from "../components/world-cup";
import RandomDiscovery from "../components/random-discovery";
import SmallChannelDiscovery from "../components/small-channel-discovery";
import ChannelTagExplorer from "../components/channel-tag-explorer";
import PlaylistShareTool from "../components/playlist-share-tool";
import SongBottleLite from "../components/song-bottle-lite";
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
import { playlistCount, type Playlist, type Track } from "../lib/music";
import ResetDataButton from "../components/reset-data-button";
import { monthOf, searchLibrary } from "../lib/archive";
import "./room.css";

type Saved = Playlist & { updatedAt: number };
type PlayableTrack = Track & { playlists?: string[] };
type Post = { title: string; url: string; date: string; description?: string };
type TranslateLanguage = "ko" | "ja" | "en";
const linkPage = "https://lit.link/en/soteria";
const translateOptions: { value: TranslateLanguage; label: string }[] = [
  { value: "ko", label: "KO" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "EN" },
];
function clearGoogleTranslateCookie() {
  document.cookie = "googtrans=;path=/;max-age=0";
  document.cookie = `googtrans=;path=/;domain=${location.hostname};max-age=0`;
}
const uiDictionary: Record<
  Exclude<TranslateLanguage, "ko">,
  Record<string, string>
> = {
  en: {
    "월별 큐레이션": "Monthly curation", "마이 리캡": "My Recap", "카와보 시리즈": "Kawaii Voice series", "전체 메뉴": "All sections",
    "내 공간": "My room",
    "음악 보관실": "Music archive",
    "작은 프로젝트": "Small projects",
    "연결된 공간": "Connected spaces",
    관리: "Management",
    "재생목록 픽": "Playlist picks",
    "유튜브 재생목록 검색기": "YouTube playlist searcher",
    "재생목록 링크 추출기": "Playlist link extractor",
    "월별 수집 · 큐레이션": "Monthly archive · Curation",
    "Kawaii Voice 시리즈": "Kawaii Voice series",
    "디깅": "Digging",
    "곡추천 병": "Song bottle",
    "채널 보관실": "Channel archive",
    "하꼬 추천": "Small channels",
    "음악 월드컵": "Music World Cup",
    "블로그 포스트": "Blog posts",
    "소무니아 갤러리": "Somunia Gallery",
    "카와이 보이스 갤러리": "Kawaii Voice Gallery",
    "가져오기 · 동기화": "Import · Sync",
    "오늘은 어떤 음악일까요.": "What music fits today?",
    "한 번 더 듣고, 고르고, 다듬어 둔 큐레이션.":
      "Curations I replayed, picked, and polished.",
    "모아 둔 음악, 골라 둔 음악.": "Collected music, selected music.",
    "월별 수집 목록과 선별한 월의 픽을 나누어 살펴보세요.":
      "Browse monthly collections separately from selected monthly picks.",
    "나의 계절을 채운 음악.": "Music that filled my seasons.",
    "My Recap 2026~2021 · 채널에서 묶어 둔 22개의 리캡.":
      "My Recap 2026–2021 · 22 recap playlists from the channel.",
    "카와이 보이스, 하나의 시리즈.": "Kawaii Voice as one series.",
    "room부터 괴멸적 카와보 플리까지 · 10개의 큐레이션.":
      "From room to intensely kawaii-voice playlists · 10 curations.",
    "채널 보관실.": "Channel archive.",
    "태그": "Tag",
    "검색": "Search",
    "채널명 또는 태그": "Channel name or tag",
    "랜덤 불러오기": "Random",
    "전체 불러오기": "Show all",
    "태그 JSON 갱신": "Update tag JSON",
    "이번 랜덤 채널": "Random channels",
    "전체 채널 목록": "All channels",
    "불러오는 중…": "Loading…",
    "채널 열기": "Open channel",
    "조건에 맞는 채널이 없어요.": "No channels match these conditions.",
    "재생목록 추가": "Add playlist",
    "YouTube 채널": "YouTube channel",
    "링크 프로필": "Link profile",
    공유: "Share",
    "PLAYLIST PICK": "PLAYLIST PICK",
    "당신의 취향이\n머무는 곳.": "A place where\nyour taste stays.",
    "채널에서 재생목록을 가져오면 이곳에 펼쳐져요.":
      "Once channel playlists are imported, they will appear here.",
    "재생목록 열기": "Open playlist",
    "가져오는 중…": "Importing…",
    "채널에서 가져오기": "Import from channel",
    "개의 재생목록": "playlists",
    "개의 곡": "tracks",
    정렬: "Sort",
    "재생목록 조회수": "Playlist views",
    내림차순: "Descending",
    오름차순: "Ascending",
    "월의 픽": "Monthly picks",
    "큐레이션 재생목록": "Curated playlists",
    "월의 픽 · 큐레이션": "Monthly picks · Curation",
    "한 달 동안 다시 듣고 선별한 재생목록":
      "Playlists replayed and selected over the month",
    "재생목록 찾기": "Find playlists",
    "조건에 맞는 재생목록이 없어요.": "No playlists match these conditions.",
    "첫 재생목록을 기다리고 있어요.": "Waiting for the first playlist.",
    "검색어와 필터를 바꿔보세요.": "Try changing the search or filters.",
    "공개 재생목록을 자동으로 가져와 이 PC에 보관합니다.":
      "Public playlists are imported automatically and stored on this PC.",
    "제목, 채널 이름, 재생목록 이름으로 모든 곡을 찾아요.":
      "Search all songs by title, channel, or playlist name.",
    "붙여넣기 좋은 재생목록 링크.": "Playlist links ready to paste.",
    "커뮤니티에 바로 공유할 수 있게 영상 링크를 한 번에 뽑아요.":
      "Extract video links so they are easy to share in a community.",
    "재생목록 선택": "Choose a playlist",
    "복사 형식": "Copy format",
    "링크만": "Links only",
    "제목 + 링크": "Title + link",
    "마크다운": "Markdown",
    "공유 텍스트 복사": "Copy share text",
    "복사 완료": "Copied",
    "추출 결과": "Extracted links",
    "곡추천을 가볍게 남기는 병.": "A light bottle for song recommendations.",
    "좋았던 곡 하나와 짧은 메모만 남겨도 충분해요.":
      "One good song and a short note are enough.",
    "추천 남기기": "Leave a recommendation",
    "이름": "Name",
    "익명도 괜찮아요": "Anonymous is fine",
    "곡 제목": "Song title",
    "추천하고 싶은 곡": "A song to recommend",
    "아티스트": "Artist",
    선택: "Optional",
    "YouTube 링크": "YouTube link",
    "짧은 메모": "Short note",
    "어떤 순간에 들으면 좋은지 남겨주세요":
      "Tell us when this song feels right.",
    "추천 보내기": "Send recommendation",
    "도착한 추천": "Arrived recommendations",
    "아직 도착한 추천이 없어요.": "No recommendations have arrived yet.",
    "검색할 범위": "Search scope",
    "곡 검색": "Song search",
    "검색 결과": "Search results",
    "YouTube 링크 모두 복사": "Copy all YouTube links",
    "지금 전체 동기화": "Sync everything now",
    "채널 동기화 중…": "Syncing channel…",
    "실패한 것만 다시 가져오기": "Retry failed only",
    "채널에서 발견한 공개 재생목록": "Public playlists found on the channel",
    "다른 채널이나 일부 공개 재생목록도 링크로 추가할 수 있어요.":
      "You can also add another channel or unlisted playlists by link.",
    "YouTube 재생목록 주소": "YouTube playlist URL",
    "선택한 재생목록": "Selected playlist",
    "YouTube에서 듣기": "Listen on YouTube",
    "사이트에서 첫 곡 듣기": "Play first track here",
    "NOW PLAYING": "NOW PLAYING",
    "이 목록으로 월드컵": "World Cup with this list",
    "YouTube 링크 복사": "Copy YouTube link",
    "오늘의 음악을 다시 발견하는 방.": "A room to rediscover today’s music.",
    "모아둔 음악에서는 Pick을, 구독목록에서는 랜덤 채널을 꺼내요.":
      "Pull Picks from saved music and random channels from subscriptions.",
    "Random Pick": "Random Pick",
    "랜덤 채널": "Random channels",
    "랜덤 뽑기": "Random draw",
    "오늘, 바로 듣는 Pick": "Your picks, ready to play",
    "수집한 시기별로 골라두었어요. 매일 새로운 음악을 만나보세요.": "Selected by collection period. Discover a fresh selection each day.",
    "이번 달의 Pick": "This month’s picks",
    "최근 수집 월의 Pick": "Latest collected month",
    "분기별 Pick": "Quarterly picks",
    "그해의 음악": "Music from that year",
    "오래전에 모아둔 음악": "From the early collection",
    "다른 곡 보기": "Show other songs",
    "분기": "Quarter",
    "1분기": "Q1", "2분기": "Q2", "3분기": "Q3", "4분기": "Q4",
    "분기별 Pick과 그해의 음악에 적용돼요.": "Applies to quarterly and yearly picks.",
    "표시된 기간의 재생목록에서 골랐어요.": "Selected from playlists collected in this period.",
    "가장 오래된 수집 연도에서 골랐어요. 발매연도 기준은 아니에요.": "From the earliest collection year, regardless of release date.",
    "이 기간에 수집한 음악이 아직 없어요.": "No music collected in this period yet.",
    "Pick을 불러오는 중…": "Loading picks…",
    "오늘의 Pick을 골라볼까요?": "Choose today’s Pick?",
    "뽑을 범위": "Pick scope",
    "곡 수": "Song count",
    "이번 Pick": "This Pick",
    "구독목록에서 랜덤 채널 찾기": "Find random channels from subscriptions",
    "채널 수": "Channel count",
    "채널 뽑기": "Pick channels",
    "채널에서 음악 찾아보기": "Find music on this channel",
    "반년에 한 번, 구독목록 새로 넣기": "Refresh subscriptions every half year",
    "마지막 가져오기:": "Last import:",
    "아직 없음": "Not yet",
    "6개월이 지났어요. 최신 구독목록으로 갱신해 주세요.":
      "Six months have passed. Please refresh with the latest subscriptions.",
    "연결된 시트 다시 가져오기": "Re-import connected sheet",
    "새 CSV로 갱신": "Refresh with new CSV",
    "원본 시트": "Original sheet",
    "소테리아의 곡 디깅하는 법": "How Soteria digs for songs",
    "재생목록을 만드는 법": "How to make playlists",
    "한국어 원문으로 표시합니다.": "Showing the Korean original.",
    "영어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다.":
      "Switched to English UI. Song and playlist titles stay in the original language.",
    "일본어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다.":
      "Switched to Japanese UI. Song and playlist titles stay in the original language.",
  },
  ja: {
    "월별 큐레이션": "月別キュレーション", "마이 리캡": "My Recap", "카와보 시리즈": "カワイイボイスシリーズ", "전체 메뉴": "メニュー",
    "내 공간": "マイルーム",
    "음악 보관실": "音楽アーカイブ",
    "작은 프로젝트": "小さなプロジェクト",
    "연결된 공간": "つながる場所",
    관리: "管理",
    "재생목록 픽": "プレイリストピック",
    "유튜브 재생목록 검색기": "YouTubeプレイリスト検索",
    "재생목록 링크 추출기": "プレイリストリンク抽出",
    "월별 수집 · 큐레이션": "月別収集 · キュレーション",
    "Kawaii Voice 시리즈": "カワイイボイスシリーズ",
    "디깅": "ディグ",
    "곡추천 병": "曲おすすめボトル",
    "채널 보관실": "チャンネル保管庫",
    "하꼬 추천": "小さなチャンネル発見",
    "음악 월드컵": "音楽ワールドカップ",
    "블로그 포스트": "ブログ記事",
    "소무니아 갤러리": "ソムニアギャラリー",
    "카와이 보이스 갤러리": "カワイイボイスギャラリー",
    "가져오기 · 동기화": "取り込み · 同期",
    "오늘은 어떤 음악일까요.": "今日はどんな音楽にしましょう。",
    "한 번 더 듣고, 고르고, 다듬어 둔 큐레이션.":
      "もう一度聴いて、選んで、整えたキュレーション。",
    "모아 둔 음악, 골라 둔 음악.": "集めた音楽、選んだ音楽。",
    "월별 수집 목록과 선별한 월의 픽을 나누어 살펴보세요.":
      "月別の収集リストと選び抜いた月のピックを分けて見られます。",
    "나의 계절을 채운 음악.": "私の季節を満たした音楽。",
    "My Recap 2026~2021 · 채널에서 묶어 둔 22개의 리캡.":
      "My Recap 2026〜2021 · チャンネルでまとめた22本のリキャップ。",
    "카와이 보이스, 하나의 시리즈.": "カワイイボイス、ひとつのシリーズ。",
    "room부터 괴멸적 카와보 플리까지 · 10개의 큐레이션.":
      "roomから壊滅的カワボプレイリストまで · 10本のキュレーション。",
    "채널 보관실.": "チャンネル保管庫。",
    "태그": "タグ",
    "검색": "検索",
    "채널명 또는 태그": "チャンネル名またはタグ",
    "랜덤 불러오기": "ランダム表示",
    "전체 불러오기": "すべて表示",
    "태그 JSON 갱신": "タグJSON更新",
    "이번 랜덤 채널": "今回のランダムチャンネル",
    "전체 채널 목록": "全チャンネル一覧",
    "불러오는 중…": "読み込み中…",
    "채널 열기": "チャンネルを開く",
    "조건에 맞는 채널이 없어요.": "条件に合うチャンネルがありません。",
    "재생목록 추가": "プレイリスト追加",
    "YouTube 채널": "YouTubeチャンネル",
    "링크 프로필": "リンクプロフィール",
    공유: "共有",
    "PLAYLIST PICK": "PLAYLIST PICK",
    "당신의 취향이\n머무는 곳.": "あなたの好みが\nとどまる場所。",
    "채널에서 재생목록을 가져오면 이곳에 펼쳐져요.":
      "チャンネルからプレイリストを取り込むと、ここに表示されます。",
    "재생목록 열기": "プレイリストを開く",
    "가져오는 중…": "取り込み中…",
    "채널에서 가져오기": "チャンネルから取得",
    "개의 재생목록": "件のプレイリスト",
    "개의 곡": "曲",
    정렬: "並び替え",
    "재생목록 조회수": "プレイリスト再生数",
    내림차순: "降順",
    오름차순: "昇順",
    "월의 픽": "月のピック",
    "큐레이션 재생목록": "キュレーションプレイリスト",
    "월의 픽 · 큐레이션": "月のピック · キュレーション",
    "한 달 동안 다시 듣고 선별한 재생목록": "1か月聴き直して選んだプレイリスト",
    "재생목록 찾기": "プレイリスト検索",
    "조건에 맞는 재생목록이 없어요.": "条件に合うプレイリストがありません。",
    "첫 재생목록을 기다리고 있어요.": "最初のプレイリストを待っています。",
    "검색어와 필터를 바꿔보세요.": "検索語やフィルターを変えてみてください。",
    "공개 재생목록을 자동으로 가져와 이 PC에 보관합니다.":
      "公開プレイリストを自動で取得し、このPCに保存します。",
    "제목, 채널 이름, 재생목록 이름으로 모든 곡을 찾아요.":
      "曲名、チャンネル名、プレイリスト名で全曲を検索します。",
    "붙여넣기 좋은 재생목록 링크.": "貼り付けやすいプレイリストリンク。",
    "커뮤니티에 바로 공유할 수 있게 영상 링크를 한 번에 뽑아요。":
      "コミュニティに共有しやすいように動画リンクをまとめて抽出します。",
    "커뮤니티에 바로 공유할 수 있게 영상 링크를 한 번에 뽑아요.":
      "コミュニティに共有しやすいように動画リンクをまとめて抽出します。",
    "재생목록 선택": "プレイリスト選択",
    "복사 형식": "コピー形式",
    "링크만": "リンクのみ",
    "제목 + 링크": "タイトル + リンク",
    "마크다운": "Markdown",
    "공유 텍스트 복사": "共有テキストをコピー",
    "복사 완료": "コピー完了",
    "추출 결과": "抽出結果",
    "곡추천을 가볍게 남기는 병.": "曲のおすすめを軽く残すボトル。",
    "좋았던 곡 하나와 짧은 메모만 남겨도 충분해요。":
      "好きだった曲ひとつと短いメモだけで十分です。",
    "좋았던 곡 하나와 짧은 메모만 남겨도 충분해요.":
      "好きだった曲ひとつと短いメモだけで十分です。",
    "추천 남기기": "おすすめを書く",
    "이름": "名前",
    "익명도 괜찮아요": "匿名でも大丈夫",
    "곡 제목": "曲名",
    "추천하고 싶은 곡": "おすすめしたい曲",
    "아티스트": "アーティスト",
    선택: "任意",
    "YouTube 링크": "YouTubeリンク",
    "짧은 메모": "短いメモ",
    "어떤 순간에 들으면 좋은지 남겨주세요":
      "どんな時に聴くと良いかを書いてください。",
    "추천 보내기": "おすすめを送る",
    "도착한 추천": "届いたおすすめ",
    "아직 도착한 추천이 없어요.": "まだおすすめは届いていません。",
    "검색할 범위": "検索範囲",
    "곡 검색": "曲検索",
    "검색 결과": "検索結果",
    "YouTube 링크 모두 복사": "YouTubeリンクをすべてコピー",
    "지금 전체 동기화": "今すぐ全体同期",
    "채널 동기화 중…": "チャンネル同期中…",
    "실패한 것만 다시 가져오기": "失敗分だけ再取得",
    "채널에서 발견한 공개 재생목록": "チャンネルで見つけた公開プレイリスト",
    "다른 채널이나 일부 공개 재생목록도 링크로 추가할 수 있어요.":
      "別チャンネルや限定公開プレイリストもリンクで追加できます。",
    "YouTube 재생목록 주소": "YouTubeプレイリストURL",
    "선택한 재생목록": "選択中のプレイリスト",
    "YouTube에서 듣기": "YouTubeで聴く",
    "사이트에서 첫 곡 듣기": "最初の曲をここで聴く",
    "NOW PLAYING": "NOW PLAYING",
    "이 목록으로 월드컵": "このリストでワールドカップ",
    "YouTube 링크 복사": "YouTubeリンクをコピー",
    "오늘의 음악을 다시 발견하는 방.": "今日の音楽を再発見する部屋。",
    "모아둔 음악에서는 Pick을, 구독목록에서는 랜덤 채널을 꺼내요.":
      "集めた音楽からPickを、購読リストからランダムチャンネルを取り出します。",
    "Random Pick": "Random Pick",
    "랜덤 채널": "ランダムチャンネル",
    "랜덤 뽑기": "ランダム抽選",
    "오늘, 바로 듣는 Pick": "すぐに聴ける今日のPick",
    "수집한 시기별로 골라두었어요. 매일 새로운 음악을 만나보세요.": "集めた時期ごとに選びました。毎日新しい音楽に出会えます。",
    "이번 달의 Pick": "今月のPick",
    "최근 수집 월의 Pick": "直近の収集月のPick",
    "분기별 Pick": "四半期ごとのPick",
    "그해의 음악": "あの年の音楽",
    "오래전에 모아둔 음악": "昔集めた音楽",
    "다른 곡 보기": "ほかの曲を見る",
    "분기": "四半期",
    "1분기": "第1四半期", "2분기": "第2四半期", "3분기": "第3四半期", "4분기": "第4四半期",
    "분기별 Pick과 그해의 음악에 적용돼요.": "四半期と年別のPickに適用されます。",
    "표시된 기간의 재생목록에서 골랐어요.": "表示期間のプレイリストから選びました。",
    "가장 오래된 수집 연도에서 골랐어요. 발매연도 기준은 아니에요.": "最も古い収集年から選びました。発売年ではありません。",
    "이 기간에 수집한 음악이 아직 없어요.": "この期間に集めた音楽はまだありません。",
    "Pick을 불러오는 중…": "Pickを読み込み中…",
    "오늘의 Pick을 골라볼까요?": "今日のPickを選んでみましょうか。",
    "뽑을 범위": "抽選範囲",
    "곡 수": "曲数",
    "이번 Pick": "今回のPick",
    "구독목록에서 랜덤 채널 찾기": "購読リストからランダムチャンネルを探す",
    "채널 수": "チャンネル数",
    "채널 뽑기": "チャンネル抽選",
    "채널에서 음악 찾아보기": "このチャンネルで音楽を探す",
    "반년에 한 번, 구독목록 새로 넣기": "半年に一度、購読リストを更新",
    "마지막 가져오기:": "最終取り込み:",
    "아직 없음": "まだありません",
    "6개월이 지났어요. 최신 구독목록으로 갱신해 주세요.":
      "6か月が経ちました。最新の購読リストに更新してください。",
    "연결된 시트 다시 가져오기": "連携シートを再取得",
    "새 CSV로 갱신": "新しいCSVで更新",
    "원본 시트": "元シート",
    "소테리아의 곡 디깅하는 법": "ソテリアの曲ディグ方法",
    "재생목록을 만드는 법": "プレイリストの作り方",
    "한국어 원문으로 표시합니다.": "韓国語の原文で表示します。",
    "영어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다.":
      "英語UIに切り替えました。曲名とプレイリスト名は原文のままです。",
    "일본어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다.":
      "日本語UIに切り替えました。曲名とプレイリスト名は原文のままです。",
  },
};
const originalTextNodes = new WeakMap<Text, TranslationRecord>();
const translatedAttributes = new WeakMap<Element, Map<string, TranslationRecord>>();
function translatedStaticText(
  value: string,
  language: Exclude<TranslateLanguage, "ko">,
) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const dictionary = uiDictionary[language];
  let translated = dictionary[trimmed];
  if (!translated) {
    translated = trimmed
      .replace(/^(\d+)곡$/, language === "ja" ? "$1曲" : "$1 songs")
      .replace(
        /^(\d+)개 가져오는 중$/,
        language === "ja" ? "$1件を取得中" : "Importing $1 items",
      )
      .replace(
        /^후보 ([\d,]+)곡 · 같은 영상은 한 번만\s*뽑아요\.$/,
        language === "ja"
          ? "候補 $1曲 · 同じ動画は一度だけ選びます。"
          : "$1 candidates · each video is picked only once.",
      )
      .replace(
        /^저장된 ([\d,]+)개 채널 안에서\s*뽑아요\. 구독자 수 기준의 필터는 적용하지 않아요\.$/,
        language === "ja"
          ? "保存済みの$1チャンネルから選びます。登録者数フィルターは使いません。"
          : "Pick from $1 saved channels. Subscriber-count filters are not applied.",
      )
      .replace(
        /^(\d+)곡 · SOTERIA ROOM$/,
        language === "ja" ? "$1曲 · SOTERIA ROOM" : "$1 songs · SOTERIA ROOM",
      )
      .replace(
        /^(.+) 태그의 채널을 둘러보고, 확장 프로그램\s*JSON으로 주기적으로 갱신해요\.$/,
        language === "ja"
          ? "$1タグのチャンネルを見て、拡張機能JSONで定期的に更新します。"
          : "Browse channels tagged $1 and refresh them with extension JSON.",
      )
      .replace(
        /^([\d,]+)개 채널 · (.+)$/,
        language === "ja" ? "$1チャンネル · $2" : "$1 channels · $2",
      )
      .replace(
        /^(\d+)-(\d+) \/ ([\d,]+)개$/,
        language === "ja" ? "$1-$2 / $3件" : "$1-$2 / $3 channels",
      )
      .replace(
        /^([\d,]+)개 \/ 전체 ([\d,]+)개$/,
        language === "ja"
          ? "$1件 / 全$2件"
          : "$1 channels / $2 total",
      );
  }
  if (!translated || translated === trimmed) return value;
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}
function shouldSkipTranslation(node: Node) {
  const element = node.parentElement;
  return Boolean(
    element?.closest(
      ".notranslate,[translate='no'],script,style,textarea,input,iframe",
    ),
  );
}
function applyUiLanguage(language: TranslateLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (
    let node = walker.nextNode() as Text | null;
    node;
    node = walker.nextNode() as Text | null
  ) {
    if (shouldSkipTranslation(node)) continue;
    const record = reconcileTranslation(node.nodeValue ?? "", originalTextNodes.get(node),
      source => language === "ko" ? source : translatedStaticText(source,language));
    originalTextNodes.set(node, record);
    if (node.nodeValue !== record.rendered) node.nodeValue = record.rendered;
  }
  for (const element of document.querySelectorAll<HTMLElement>(
    "[placeholder],[aria-label]",
  )) {
    if (element.closest(".notranslate,[translate='no']")) continue;
    for (const attr of ["placeholder", "aria-label"] as const) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const records = translatedAttributes.get(element) ?? new Map<string,TranslationRecord>();
      const record = reconcileTranslation(current, records.get(attr),
        source => language === "ko" ? source : translatedStaticText(source,language));
      records.set(attr,record);
      translatedAttributes.set(element,records);
      if (current !== record.rendered) element.setAttribute(attr,record.rendered);
    }
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
  { id: "archive", name: "월별 큐레이션", icon: CalendarDays },
  { id: "random", name: "디깅", icon: Shuffle },
  { id: "recap", name: "마이 리캡", icon: AudioLines },
  { id: "kawaii", name: "카와보 시리즈", icon: ListMusic },
  { id: "search", name: "유튜브 재생목록 검색기", icon: Search, group: "작은 프로젝트" },
  { id: "extract", name: "재생목록 링크 추출기", icon: Copy },
  { id: "worldcup", name: "음악 월드컵", icon: Trophy },
  { id: "small", name: "하꼬 추천", icon: Sparkles },
  { id: "asmr", name: "채널 보관실", icon: Headphones },
  { id: "bottle", name: "곡추천 병", icon: MessageCircle },
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
async function request(
  path: string,
  input?: object,
  options: { method?: "POST" | "DELETE"; adminKey?: string } = {},
) {
  const res = await fetch(
    path,
    input
      ? {
          method: options.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(options.adminKey
              ? { "x-soteria-admin-key": options.adminKey }
              : {}),
          },
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
  const [playing, setPlaying] = useState<PlayableTrack | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [quietSync, setQuietSync] = useState(false);
  const [totalTracks, setTotalTracks] = useState<number | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [syncStage, setSyncStage] = useState<"primary" | "secondary">("primary");
  const [stopping,setStopping] = useState(false);
  const [syncPaused,setSyncPaused] = useState(false);
  const [syncStopReason,setSyncStopReason] = useState("");
  const [syncLogs,setSyncLogs] = useState<{at:number;message:string}[]>([]);
  const [archiveRevision,setArchiveRevision] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const libraryRequest = useRef(0);
  const syncRun = useRef(0);
  const [progress, setProgress] = useState({ done: 0, total: 0, title: "" });
  const [failures, setFailures] = useState<
    { id: string; title: string; message: string }[]
  >([]);
  const [url, setUrl] = useState(""),
    [importing, setImporting] = useState(false),
    [lastSync, setLastSync] = useState(0);
  const [adminKey, setAdminKey] = useState("");
  const [adminDraft, setAdminDraft] = useState("");
  const [adminChecking, setAdminChecking] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [nextSync, setNextSync] = useState(0);
  const [featuredId, setFeaturedId] = useState(""),
    [cupVisited, setCupVisited] = useState(false),
    [cupPlaylist, setCupPlaylist] = useState<Playlist | null>(null);
  const [posts, setPosts] = useState<Post[]>([]),
    [postLoading, setPostLoading] = useState(false),
    [postError, setPostError] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [searchScope, setSearchScope] = useState<Scope>("picks");
  const [archiveScope, setArchiveScope] = useState<Scope>("picks");
  const [year, setYear] = useState("all");
  const [homeKind, setHomeKind] = useState("all");
  const [language, setLanguage] = useState<TranslateLanguage>("ko");
  const lock = useRef(false),
    libraryRef = useRef(library);
  libraryRef.current = library;
  const allTracks = useMemo(() => searchLibrary(library, ""), [library]);
  const unique = { size: totalTracks ?? allTracks.length };
  const tracks = useMemo(() => searchLibrary(
    library.filter((p) => inScope(p, searchScope)), query,
  ), [library, searchScope, query]);
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
  const featuredCandidates = tab === "pick" ? visible : baseLibrary;
  const featured =
    featuredCandidates.find((p) => p.id === featuredId) ||
    (featuredCandidates.some((p) => p.id === latestPick?.id)
      ? latestPick
      : undefined) ||
    featuredCandidates[0] ||
    baseLibrary[0];
  function navigate(id: string) {
    setTab(id);
    setMobileMenu(false);
    window.scrollTo(0, 0);
    setQuery("");
    setFilter("all");
    setYear("all");
    setSelected(null);
    setPlaying(null);
    if (id === "worldcup") setCupVisited(true);
    history.replaceState(null, "", `#${id}`);
  }
  function selectLanguage(nextLanguage: TranslateLanguage) {
    setLanguage(nextLanguage);
    clearGoogleTranslateCookie();
    applyUiLanguage(nextLanguage);
    setNotice(
      nextLanguage === "ko"
        ? "한국어 원문으로 표시합니다."
        : nextLanguage === "ja"
          ? "일본어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다."
          : "영어 UI로 바꿨어요. 곡 제목과 재생목록 제목은 원문을 유지합니다.",
    );
  }
  function acceptLibrary(data: any) {
    const playlists = data.version === 1 ? unpackLibrary(data) : data.playlists;
    setLibrary(playlists);
    setTotalTracks(data.totalTracks ?? null);
    libraryRef.current = playlists;
    setLoading(false);
  }
  async function reload(full = ["search","extract"].includes(tabRef.current)) {
    const requestId = ++libraryRequest.current;
    const response = await fetch(full ? "/api/library" : "/api/library?summary=1", {cache:"no-store"});
    if (!response.ok) throw new Error("보관실을 불러오지 못했어요. 다시 시도해 주세요.");
    const data = await response.json();
    if (requestId === libraryRequest.current) acceptLibrary(data);
  }
  useEffect(() => {
    if (!["search","extract"].includes(tab) || !libraryRef.current.some(p=>p.summaryOnly)) return;
    setFullLoading(true);
    void reload(true).catch(e=>setError(e.message)).finally(()=>setFullLoading(false));
  }, [tab, loading]);
  function acceptSync(data: any) {
    setSyncStage(data.stage || "primary");
    setSyncPaused(!!data.paused);
    setSyncStopReason(data.stopReason || "");
    setSyncLogs(data.logs || []);
    setLastSync(data.lastSuccessAt || 0);
    setSkipped(data.skipped || 0);
    setNextSync(data.nextSyncAt || 0);
    setFailures((data.failures || []).map((p: any) => ({...p,message:p.error})));
    setProgress({ done:data.done, total:data.total, title:data.title || "채널 갱신 중" });
  }
  async function synchronize(_force = false, retryOnly = false, quiet = false, stage: "primary" | "secondary" = "primary") {
    if (lock.current) return;
    lock.current = true;
    setSyncing(true);
    setSyncStage(stage);
    setQuietSync(quiet);
    const run = ++syncRun.current;
    if (!quiet) { setError(""); setNotice(""); }
    try {
      let steps = 0;
      while (true) {
        const data = await request("/api/sync", {retry:retryOnly,automatic:quiet,stage,continuing:steps>0});
        if (run !== syncRun.current) break;
        acceptSync(data);
        if (data.paused) { setNotice(data.stopReason || "동기화를 중단했어요."); await reload(); break; }
        if (data.waiting) {
          if (!quiet) setNotice("이미 서버에서 갱신 중이에요. 저장된 음악은 바로 이용할 수 있어요.");
          break;
        }
        if (data.cached || !data.pending.length) {
          await reload();
          if (!quiet) setNotice(data.failures.length
            ? `${data.failures.length}개 목록은 다시 확인이 필요해요. 기존 자료는 유지됩니다. 실패 목록은 기다리지 않고 다시 시도할 수 있어요.`
            : data.cached ? "오늘의 동기화가 이미 완료되어 최신 저장 목록을 불러왔어요." : "채널 동기화를 마쳤어요.");
          break;
        }
        if (++steps % 10 === 0) await reload();
      }
    } catch (e) { if (!quiet) setError((e as Error).message); }
    finally { if(run === syncRun.current) {lock.current = false; setSyncing(false);} }
  }
  async function stopSynchronization() {
    setStopping(true);
    ++syncRun.current;
    try {
      const data=await request("/api/sync",{action:"stop",stage:syncStage});
      acceptSync(data); setNotice(data.stopReason); await reload();
    } catch(e) {setError((e as Error).message);}
    finally {lock.current=false;setSyncing(false);setStopping(false);}
  }
  async function unlockAdmin(key = adminDraft) {
    setAdminChecking(true);
    try {
      await request("/api/admin", {}, {adminKey:key});
      setAdminKey(key);
      setAdminDraft("");
      sessionStorage.setItem("soteria-admin-key",key);
      setNotice("관리 잠금을 열었어요. 이 브라우저 탭에서만 유지됩니다.");
    } catch (e) {
      setAdminKey("");
      sessionStorage.removeItem("soteria-admin-key");
      setError((e as Error).message);
    } finally { setAdminChecking(false); }
  }
  useEffect(() => {
    let active = true;
    const hash = location.hash.slice(1);
    if (modules.some((m) => m.id === hash)) {
      setTab(hash);
      if (hash === "worldcup") setCupVisited(true);
    }
    const savedKey = sessionStorage.getItem("soteria-admin-key");
    if (savedKey) void unlockAdmin(savedKey);
    void (async () => {
      try {
        await reload();
        const status = await request("/api/sync");
        if (!active) return;
        acceptSync(status);
        // Daily refresh is activity-based: start after content is visible and
        // resume a persisted unfinished run; never gate reading on YouTube.
        if (!status.busy && !status.paused && (status.pending.length || Date.now() >= status.nextSyncAt)) void synchronize(false,false,true);
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    })();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || lock.current) return;
      void request("/api/sync").then(status => {
        if (!active) return;
        acceptSync(status);
        if (!status.busy && !status.paused && (status.pending.length || Date.now() >= status.nextSyncAt)) void synchronize(false,false,true);
      }).catch(() => {});
    }, 60 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    clearGoogleTranslateCookie();
  }, []);
  useEffect(() => {
    applyUiLanguage(language);
  });
  useEffect(() => {
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyUiLanguage(language));
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["placeholder","aria-label"]});
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [language]);
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
      if (!adminKey.trim()) throw new Error("관리 잠금을 먼저 열어 주세요.");
      const p = await request(
        "/api/playlist",
        { url, force: true },
        { adminKey },
      );
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

  async function deletePlaylist(p: Saved) {
    if (!adminKey.trim()) {
      setError("관리 잠금을 먼저 열어 주세요.");
      return;
    }
    if (!confirm(`‘${displayTitle(p)}’을 보관실에서 삭제할까요? 채널 전체 동기화를 다시 하면 기본 목록은 다시 돌아올 수 있어요.`)) return;
    setImporting(true);
    setError("");
    try {
      await request(
        "/api/playlist",
        { id: p.id },
        { method: "DELETE", adminKey },
      );
      setLibrary((current) => {
        const next = current.filter((item) => item.id !== p.id);
        libraryRef.current = next;
        return next;
      });
      setSelected(null);
      setPlaying(null);
      setNotice(`‘${displayTitle(p)}’을 보관실에서 삭제했어요.`);
      await reload();
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
      setNotice(`${items.length}곡의 YouTube 링크를 복사했어요.`);
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  async function copySiteShare() {
    try {
      await navigator.clipboard.writeText(location.href.split("#")[0]);
      setNotice("사이트 공유 링크를 복사했어요.");
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  async function copyPlaylistShare(p: Saved) {
    try {
      await navigator.clipboard.writeText(
        `https://www.youtube.com/playlist?list=${p.id}`,
      );
      setNotice("재생목록 YouTube 링크를 복사했어요.");
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  async function openPlaylist(p: Saved) {
    setSelected(p);
    if (!p.summaryOnly) return;
    try {
      const full = await request(`/api/playlist?id=${encodeURIComponent(p.id)}`);
      setSelected(current => current?.id === p.id ? {...p,...full,summaryOnly:false,trackCount:full.tracks.length} : current);
    } catch (e) { setError((e as Error).message); }
  }
  function coverUrl(p: Saved) { return `/api/playlist-cover?id=${encodeURIComponent(p.id)}`; }
  async function afterLibraryReset() {
    ++syncRun.current;
    ++libraryRequest.current;
    setSelected(null); setPlaying(null); setLibrary([]); setTotalTracks(0); setFailures([]);
    setLastSync(0); setProgress({done:0,total:0,title:""}); setSkipped(0);
    if ("caches" in window) await caches.delete("soteria-library-v1");
    await reload();
    acceptSync(await request("/api/sync"));
    setNotice("재생목록 DB를 비웠어요. 다시 동기화 버튼을 누르면 가져옵니다.");
  }
  function playTrack(track?: PlayableTrack) {
    if (!track) return;
    setPlaying(track);
  }
  function playerPanel() {
    if (!playing) return null;
    return (
      <section className="room-player inline-context-player glass">
        <div className="room-player-frame">
          <iframe
            title={playing.title}
            src={`https://www.youtube.com/embed/${playing.id}?autoplay=1&playsinline=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="room-player-copy">
          <span className="room-eyebrow">NOW PLAYING</span>
          <h3 className="notranslate" translate="no">
            {playing.title}
          </h3>
          <p className="notranslate" translate="no">
            {playing.artist}
          </p>
          {playing.playlists?.length ? (
            <small className="notranslate" translate="no">
              {playing.playlists.slice(0, 3).join(" / ")}
            </small>
          ) : null}
          <div className="player-actions">
            <a
              className="room-button subtle"
              href={`https://youtu.be/${playing.id}`}
              target="_blank"
              rel="noreferrer"
            >
              YouTube에서 듣기 <ExternalLink size={14} />
            </a>
            <button
              className="icon-button"
              aria-label="플레이어 닫기"
              onClick={() => setPlaying(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </section>
    );
  }
  useEffect(() => {
    if (selected)
      document
        .getElementById("playlist-detail")
        ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [selected]);
  function card(p: Saved, i: number) {
    const firstTrack = p.tracks[0];
    return (
      <article className="room-card" key={p.id}>
        <div className={`room-cover tone-${i % 4}`}>
          <button
            className="cover-main"
            onClick={() => openPlaylist(p)}
            aria-label={`${p.title} 곡 목록 보기`}
          >
            {(p.thumbnail || firstTrack) && (
              <img
                src={coverUrl(p)}
                alt=""
                loading={i < 4 ? "eager" : "lazy"}
                decoding="async"
                onError={(e) => { if (firstTrack && e.currentTarget.src !== firstTrack.thumbnail) e.currentTarget.src = firstTrack.thumbnail; }}
              />
            )}
            <span className="cover-shade" />
          </button>
          <span className="cover-count">
            <ListMusic size={14} />
            {playlistCount(p)}곡
          </span>
          <button
            className="cover-open"
            disabled={!firstTrack}
            onClick={() => playTrack(firstTrack)}
            aria-label={`${p.title} 첫 곡 재생`}
          >
            <Play size={18} />
          </button>
        </div>
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
            · {playlistCount(p)}곡 ·{" "}
            {p.views == null
              ? "조회수 미제공"
              : `${p.views.toLocaleString()}회 조회`}
          </span>
        </p>
      </article>
    );
  }
  function trackRow(t: PlayableTrack, i: number, context?: string) {
    return (
      <div className="room-track" key={`${context || "track"}-${t.id}-${i}`}>
        <span className="track-index">
          {context === "detail" ? i + 1 : String(i + 1).padStart(2, "0")}
        </span>
        <button
          className="track-play"
          onClick={() => playTrack(t)}
          aria-label={`${t.title} 사이트에서 재생`}
        >
          <img src={t.thumbnail} alt="" loading="lazy" />
          <span>
            <Play size={13} />
          </span>
        </button>
        <span className="track-copy">
          <strong className="notranslate" translate="no">
            {t.title}
          </strong>
          <small>
            <span className="notranslate" translate="no">
              {t.artist}
              {t.playlists?.length ? ` · ${t.playlists.join(" / ")}` : ""}
            </span>
          </small>
        </span>
        <button
          className="track-inline-play"
          onClick={() => playTrack(t)}
          aria-label={`${t.title} 재생`}
        >
          <Play size={15} />
        </button>
        <a
          className="track-open"
          href={`https://youtu.be/${t.id}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`${t.title} YouTube에서 열기`}
        >
          <ArrowUpRight size={17} />
        </a>
      </div>
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
          <div className="source-links">
            <strong>soteria_room</strong>
            <a
              href="https://www.youtube.com/@soteria_room"
              target="_blank"
              rel="noreferrer"
            >
              YouTube 채널 <ArrowUpRight size={12} />
            </a>
            <a href={linkPage} target="_blank" rel="noreferrer">
              링크 프로필 <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </aside>
      <div className="mobile-room-header glass">
        <a href="#pick" onClick={e => {e.preventDefault(); navigate("pick");}}><AudioLines size={22} /><strong>SOTERIA ROOM</strong></a>
        <Sheet open={mobileMenu} onOpenChange={setMobileMenu}>
          <SheetTrigger asChild><button className="room-button subtle"><Menu size={19} />전체 메뉴</button></SheetTrigger>
          <SheetContent side="left" className="mobile-room-menu">
            <SheetTitle>SOTERIA ROOM</SheetTitle>
            <SheetDescription>듣고 싶은 음악, 해보고 싶은 프로젝트를 골라보세요.</SheetDescription>
            <nav aria-label="전체 메뉴">{modules.map(m => <div key={m.id}>
              {m.group && <h2>{m.group}</h2>}
              <button aria-current={tab === m.id ? "page" : undefined} onClick={() => navigate(m.id)}><m.icon size={19}/>{m.name}{tab === m.id && <Check size={16}/>}</button>
            </div>)}</nav>
            <a href={linkPage} target="_blank" rel="noreferrer">soteria_room · 링크 프로필 <ArrowUpRight size={16}/></a>
          </SheetContent>
        </Sheet>
      </div>
      <div className="room-workspace">
        <header className="room-topbar">
          <div>
            <span className="breadcrumb">내 공간</span>
            <span className="slash">/</span>
            {modules.find((m) => m.id === tab)?.name}
          </div>
          <div className="top-actions">
            <div className="language-switcher" aria-label="언어 선택">
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
            <button
              className="link-page-button"
              onClick={() => void copySiteShare()}
              aria-label="사이트 공유 링크 복사"
            >
              <Copy size={15} />
              공유
            </button>
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
          {syncing && (!quietSync || tab === "settings") && (
            <div className="sync-bar" role="status">
              <LoaderCircle size={16} className="spin" />
              <span>
                {progress.total
                  ? `${progress.done} / ${progress.total}개 가져오는 중`
                  : "채널 확인 중"}
                <small>{progress.title}</small>
              </span>
              <button className="room-button subtle" disabled={stopping} onClick={()=>void stopSynchronization()}>{stopping ? "중단 중…" : "동기화 중단"}</button>
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
                          featured ? coverUrl(featured) : undefined
                        }
                        alt=""
                        onError={(e) => {
                          const fallback = featured?.tracks[0]?.thumbnail;
                          if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                        }}
                      />
                    )}
                    <div className="featured-overlay" />
                    <div className="featured-copy">
                      <span className="glass-pill">
                        <Sparkles size={14} />
                        PLAYLIST PICK
                      </span>
                      <h2 className="notranslate" translate="no">
                        {featured?.title || (loading ? "음악을 꺼내고 있어요…" : "당신의 취향이\n머무는 곳.")}
                      </h2>
                      <p>
                        {featured
                          ? `${playlistCount(featured)}곡 · SOTERIA ROOM`
                          : loading ? "저장된 재생목록과 곡 정보를 불러오는 중이에요." : "채널에서 재생목록을 가져오면 이곳에 펼쳐져요."}
                      </p>
                      <div className="featured-actions">
                        <button
                          className="room-button bright"
                          onClick={() =>
                            featured
                              ? openPlaylist(featured)
                              : void synchronize()
                          }
                          disabled={loading || (!featured && syncing)}
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
                          disabled={!featuredCandidates.length}
                          onClick={() => {
                            const candidates = featuredCandidates.filter(
                              (p) => p.id !== featured?.id,
                            );
                            const pool = candidates.length
                              ? candidates
                              : featuredCandidates;
                            const next =
                              pool[Math.floor(Math.random() * pool.length)];
                            if (next) setFeaturedId(next.id);
                          }}
                          aria-label="다른 재생목록 뽑기"
                        >
                          <Shuffle size={19} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pick-side">
                    <div className="room-stats glass">
                      <span className="room-eyebrow">IN MY ROOM</span>
                      <div>
                        <strong>{loading ? "—" : library.length.toLocaleString()}</strong>
                        <span>개의 재생목록</span>
                      </div>
                      <div className="stats-bottom">
                        <AudioLines size={19} />
                        <b>{loading ? "—" : unique.size.toLocaleString()}</b>곡의 서로 다른 발견
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
                      {loading ? "…" : visible.length}
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
                {!loading && missingSeries.length > 0 && (
                  <div className="room-note">
                    {missingSeries.length}개 목록을 가져오는 중이거나 확인이
                    필요합니다.{" "}
                    <button
                      className="room-button subtle"
                      disabled={syncing || stopping}
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
                  <div className="library-loading" role="status" aria-label="보관실을 불러오는 중">
                    <p><LoaderCircle className="spin" size={18} /> 보관실을 열고 있어요.</p>
                    <div className="playlist-grid">{Array.from({length:6}, (_,i) => <div className="playlist-skeleton" key={i}><div /><span /><span /></div>)}</div>
                  </div>
                ) : visible.length ? (
                  id === "archive" && sort === "month" ? (
                    <>
                      {!selected && playerPanel()}
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
                    </>
                  ) : (
                    <>
                      {!selected && playerPanel()}
                      <div className="playlist-grid">{visible.map(card)}</div>
                    </>
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
                검색 결과<span>{loading || fullLoading || library.some(p=>p.summaryOnly) ? "불러오는 중…" : `${tracks.length}곡`}</span>
              </h2>
              <button
                className="room-button subtle"
                disabled={!tracks.length || fullLoading || library.some(p=>p.summaryOnly)}
                onClick={() => void copyLinks(tracks)}
              >
                <Copy size={16} />
                YouTube 링크 모두 복사
              </button>
            </div>
            {playerPanel()}
            <div className="track-list glass">
              {fullLoading || library.some(p=>p.summaryOnly) ? <p role="status">검색할 곡 정보를 불러오는 중…</p> : tracks.slice(0, 200).map((t, i) => trackRow(t, i, "search"))}
              {!loading && !tracks.length && (
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
          <TabsContent value="extract">
            <PlaylistShareTool library={library.filter(p=>!p.summaryOnly)} />
          </TabsContent>
          <TabsContent value="random">
            <RandomDiscovery key={`discovery-${archiveRevision}`} library={library} adminKey={adminKey} />
          </TabsContent>
          <TabsContent value="bottle">
            <SongBottleLite />
          </TabsContent>
          <TabsContent value="small"><SmallChannelDiscovery key={`small-${archiveRevision}`} adminKey={adminKey} language={language} /></TabsContent>
          <TabsContent value="asmr">
            <ChannelTagExplorer key={`channels-${archiveRevision}`} initialTag="ASMR" adminKey={adminKey} />
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
              <section className="settings-card glass admin-lock-card">
                <div className="setting-icon">
                  <LockKeyhole size={22} />
                </div>
                <h2>관리 잠금</h2>
                <p>
                  보관실에 직접 추가, 삭제, JSON/CSV 갱신은
                  관리자 키가 있어야 실행돼요. 방문자용 링크 추출과 월드컵
                  불러오기는 저장 없이 일회성으로만 작동합니다.
                </p>
                <label htmlFor="admin-key">관리자 키</label>
                <input
                  id="admin-key"
                  value={adminDraft}
                  onChange={(e) => setAdminDraft(e.target.value)}
                  type="password"
                  placeholder="SOTERIA_ADMIN_KEY"
                  autoComplete="off"
                />
                <div className="admin-lock-actions">
                  <button
                    className="room-button"
                    type="button"
                    disabled={!adminDraft.trim() || adminChecking}
                    onClick={() => void unlockAdmin()}
                  >
                    <LockKeyhole size={16} />
                    잠금 열기
                  </button>
                  <button
                    className="room-button subtle"
                    type="button"
                    disabled={!adminKey}
                    onClick={() => {
                      sessionStorage.removeItem("soteria-admin-key");
                      setAdminKey("");
                      setNotice("관리 잠금을 닫았어요.");
                    }}
                  >
                    잠금 닫기
                  </button>
                </div>
                <small>현재 상태: {adminChecking ? "확인 중" : adminKey ? "관리자 확인됨" : "잠김"}</small>
              </section>
              <section className="settings-card glass">
                <div className="setting-icon">
                  <RefreshCw size={22} />
                </div>
                <h2>1차 자동 · 2차 수동 동기화</h2>
                <a
                  className="source-link"
                  href="https://www.youtube.com/@soteria_room/playlists"
                  target="_blank"
                  rel="noreferrer"
                >
                  @soteria_room <ExternalLink size={14} />
                </a>
                <p>
                  1차는 월의 픽·My Recap·Kawaii Voice Playlist·기타 큐레이션을 하루 한 번 자동 갱신합니다. 2차는 202X.XX와 연간 수집 목록·A bundle of songs를 아래 버튼으로 선택했을 때만 가져옵니다. 저장된 기존 자료는 그대로 이용할 수 있어요.
                </p>
                <button
                  className="room-button"
                  disabled={syncing || stopping}
                  onClick={() => void synchronize(true)}
                >
                  <RefreshCw size={16} className={syncing ? "spin" : ""} />
                  {syncing ? "동기화 중…" : "1차 큐레이션 동기화"}
                </button>
                <button
                  className="room-button subtle"
                  disabled={syncing || !failures.length}
                  onClick={() => void synchronize(true, true, false, syncStage)}
                >
                  <RefreshCw
                    size={16}
                    className={syncing && failures.length ? "spin" : ""}
                  />
                  실패한 것만 다시 가져오기
                </button>
                <button className="room-button subtle" disabled={syncing || stopping} onClick={() => void synchronize(true,false,false,"secondary")}>2차 월별·연간 수집 동기화 (대용량)</button>
                <div className="sync-stage-switch"><button disabled={syncing || stopping} aria-pressed={syncStage === "primary"} onClick={()=>void request("/api/sync?stage=primary").then(acceptSync).catch(e=>setError(e.message))}>1차 기록</button><button disabled={syncing || stopping} aria-pressed={syncStage === "secondary"} onClick={()=>void request("/api/sync?stage=secondary").then(acceptSync).catch(e=>setError(e.message))}>2차 기록</button></div>
                <small>{syncStage === "primary" ? "1차 큐레이션" : "2차 월별·연간 수집"} 진행 기록</small>
                <button className="room-button subtle" disabled={stopping || syncPaused} onClick={()=>void stopSynchronization()}>{stopping ? "중단 중…" : "동기화 중단"}</button>
                {syncStopReason && <small role="status">{syncStopReason}</small>}
                <small>이번 확인에서 건너뛴 목록: {skipped}개</small>
                <small>{syncStage === "primary" ? `다음 자동 갱신: ${nextSync ? new Date(nextSync).toLocaleString("ko-KR") : "첫 방문 시"}` : "2차는 수동으로만 실행합니다."}</small>
                <small>
                  선택 단계 마지막 성공:{" "}
                  {lastSync
                    ? new Date(lastSync).toLocaleString("ko-KR")
                    : "아직 없음"}
                </small>
                {progress.total > 0 && (
                  <small>
                    선택 단계 {progress.done} / {progress.total}개
                  </small>
                )}
              </section>
              <section className="settings-card glass">
                <div className="setting-icon">
                  <Plus size={22} />
                </div>
                <h2>링크로 직접 가져오기</h2>
                <p>
                  내 보관실에 수동으로 저장할 재생목록만 관리자 키로 추가해요.
                  방문자가 자기 목록을 시험할 때는 왼쪽의 링크 추출기나 월드컵에서
                  일회성으로 불러옵니다.
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
                    disabled={importing || syncing || !adminKey.trim()}
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
            <details className="sync-log glass" open><summary>동기화 로그 · {syncStage === "primary" ? "1차" : "2차"} · 최근 12개</summary><div role="log">{syncLogs.length ? syncLogs.map((entry,i)=><p key={`${entry.at}-${i}`}><time>{new Date(entry.at).toLocaleTimeString("ko-KR")}</time> {entry.message}</p>) : <p>아직 기록이 없어요.</p>}</div></details>
            {failures.length > 0 && (
              <section className="settings-card glass">
                <div className="section-title compact-title">
                  <h2 className="sync-failures-heading">다시 확인할 목록 · {failures.length}개</h2>
                  <button
                    className="room-button subtle"
                    disabled={syncing || stopping}
                    onClick={() => void synchronize(true, true, false, syncStage)}
                  >
                    <RefreshCw size={16} className={syncing ? "spin" : ""} />
                    실패 목록만 재시도
                  </button>
                </div>
                <details className="sync-failures-details" key={syncStage}>
                  <summary>목록 펼치기 / 접기</summary>
                  <div className="sync-failures-scroll" tabIndex={0} role="region" aria-label="다시 확인할 재생목록">
                {failures.map((f, i) => (
                  <div className="sync-failure" key={i}>
                    <strong>{f.title}</strong>
                    <p>{f.message}</p>
                  </div>
                ))}
                  </div>
                </details>
              </section>
            )}
            <section className="settings-card glass reset-library-card">
              <h2>자료별 DB 초기화</h2>
              <p>저장된 재생목록과 표지, 동기화 기록을 비웁니다. JSON·CSV 채널 자료와 월드컵 기록, 곡추천 병은 유지돼요.</p>
              <div className="reset-button-group"><ResetDataButton target="library" label="재생목록 DB 초기화" adminKey={adminKey} onReset={afterLibraryReset} /><ResetDataButton target="json" label="JSON 초기화" adminKey={adminKey} onReset={()=>setArchiveRevision(v=>v+1)} /><ResetDataButton target="csv" label="CSV 초기화" adminKey={adminKey} onReset={()=>setArchiveRevision(v=>v+1)} /></div>
            </section>
            <div className="room-note">
              동기화는 누구나 이용하며, 수동 추가·삭제와 초기화는 관리자 전용입니다. 방문자가 링크를
              넣어 쓰는 기능은 저장하지 않고 그 자리에서만 사용합니다.
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
                  YouTube에서 듣기
                  <ExternalLink size={16} />
                </a>
                <button
                  className="room-button subtle"
                  disabled={selected.summaryOnly}
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
                  YouTube 링크 복사
                </button>
                <button
                  className="room-button danger"
                  disabled={importing || !adminKey.trim()}
                  onClick={() => void deletePlaylist(selected)}
                >
                  <Trash2 size={16} />
                  보관실에서 삭제
                </button>
                <span>{playlistCount(selected)}곡</span>
              </div>
              {playerPanel()}
              <div className="detail-tracks">
                {selected.summaryOnly ? <p role="status">곡 목록을 불러오는 중…</p> : selected.tracks.map((t, i) => trackRow(t, i, "detail"))}
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
