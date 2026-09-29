import type { Playlist, Track } from "./music";
import { parseMeta } from './youtube-metadata.ts';
export function playlistId(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("올바른 유튜브 재생목록 링크를 입력해 주세요.");
  }
  if (
    ![
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtu.be",
    ].includes(url.hostname) ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new Error("유튜브 재생목록 링크만 사용할 수 있어요.");
  const id = url.searchParams.get("list");
  if (!id || !/^[a-zA-Z0-9_-]{10,100}$/.test(id))
    throw new Error(
      "재생목록 링크에 list= 항목이 필요해요. 유튜브의 재생목록 공유 링크를 복사해 주세요.",
    );
  if (/^(WL|LL|RD)/.test(id))
    throw new Error(
      "나중에 볼 동영상과 자동 믹스는 지원하지 않아요. 직접 만든 재생목록을 사용해 주세요.",
    );
  return id;
}
type Tree = Record<string, any>;
function plain(value: Tree | undefined): string {
  return (
    value?.simpleText ||
    value?.runs?.map((r: Tree) => r.text || "").join("") ||
    ""
  );
}
export function parseInitialData(html: string): Tree {
  const marker =
    /(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=|ytInitialData\s*=)\s*/g;
  const match = marker.exec(html);
  if (!match)
    throw new Error(
      "유튜브에서 목록을 읽지 못했어요. 공개 설정을 확인하거나 잠시 후 다시 시도해 주세요.",
    );
  const start = marker.lastIndex;
  let depth = 0,
    quote = false,
    escape = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') quote = false;
    } else {
      if (c === '"') quote = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0)
        return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error("재생목록 정보가 올바르지 않아요. 다시 시도해 주세요.");
}
export function extractTracks(data: Tree): {
  tracks: Track[];
  continuation?: string;
} {
  const tracks: Track[] = [];
  let continuation: string | undefined;
  function walk(value: any) {
    if (!value || typeof value !== "object") return;
    if (
      value.horizontalShelfViewModel ||
      value.shelfRenderer ||
      value.richSectionRenderer
    )
      return;
    if (value.playlistVideoRenderer) {
      const r = value.playlistVideoRenderer;
      const id = r.videoId;
      const title = plain(r.title);
      if (
        /^[\w-]{11}$/.test(id || "") &&
        r.isPlayable !== false &&
        !/^(Private video|Deleted video|비공개 동영상|삭제된 동영상)$/.test(
          title,
        )
      ) {
        tracks.push({
          id,
          title: title || "제목 없는 영상",
          artist: plain(r.shortBylineText) || "YouTube",
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        });
      }
      return;
    }
    if (value.lockupViewModel) {
      const r = value.lockupViewModel;
      const id = r.contentId;
      const m = r.metadata?.lockupMetadataViewModel;
      const title = m?.title?.content;
      if (
        r.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" &&
        /^[\w-]{11}$/.test(id || "") &&
        title &&
        !/^(Private video|Deleted video|비공개 동영상|삭제된 동영상)$/.test(
          title,
        )
      ) {
        tracks.push({
          id,
          title,
          artist:
            m.metadata?.contentMetadataViewModel?.metadataRows?.[0]
              ?.metadataParts?.[0]?.text?.content || "YouTube",
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        });
      }
      return;
    }
    if (value.continuationItemViewModel) {
      continuation =
        value.continuationItemViewModel.continuationCommand?.innertubeCommand
          ?.continuationCommand?.token || continuation;
      return;
    }
    if (value.continuationItemRenderer) {
      continuation =
        value.continuationItemRenderer.continuationEndpoint?.continuationCommand
          ?.token || continuation;
      return;
    }
    for (const item of Object.values(value)) walk(item);
  }
  // 최신 YouTube 화면에는 영상 목록 다음에 추천 영역 continuation이 따로 있습니다.
  // 페이지 전체를 순회하면 추천 토큰이 실제 목록 토큰을 덮어써 100곡에서 끊깁니다.
  const section = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(
    (t: Tree) => t.tabRenderer?.selected,
  )?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
    ?.itemSectionRenderer;
  walk(
    data.onResponseReceivedActions ||
      data.onResponseReceivedEndpoints ||
      section ||
      data.contents ||
      data,
  );
  return { tracks, continuation };
}
async function fetchTimed(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(18000) });
}
export async function readPlaylist(
  id: string,
  key?: string,
): Promise<Playlist> {
  if (key) return readOfficial(id, key);
  const response = await fetchTimed(
    `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}&hl=ko`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "YouTube가 요청을 제한했어요 (HTTP 429). 반복 재시도는 잠시 멈춰 주세요. 기존 자료는 유지됩니다."
        : response.status === 403
          ? "YouTube가 서버의 접근을 거절했어요 (HTTP 403). 기존 자료는 유지됩니다."
          : `YouTube 응답 오류 (HTTP ${response.status}). 잠시 후 다시 시도해 주세요.`,
    );
  const html = await response.text();
  const data = parseInitialData(html);
  const title =
    data.metadata?.playlistMetadataRenderer?.title || "나의 유튜브 재생목록";
  let { tracks, continuation } = extractTracks(data);
  const seen = new Set<string>();
  const version = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
  let pages = 0;
  while (continuation) {
    if (pages++ >= 500)
      throw new Error(
        "목록이 너무 커 한 번에 끝까지 확인하지 못했어요. 기존 저장 내용은 유지됩니다.",
      );
    if (!version || seen.has(continuation))
      throw new Error(
        "재생목록의 나머지 곡을 불러오지 못했어요. 다시 시도해 주세요.",
      );
    seen.add(continuation);
    const next = await fetchTimed(
      "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({
          context: {
            client: { clientName: "WEB", clientVersion: version, hl: "ko" },
          },
          continuation,
        }),
      },
    );
    if (!next.ok)
      throw new Error(
        "재생목록의 나머지 곡을 불러오지 못했어요. 다시 시도해 주세요.",
      );
    const part = extractTracks(await next.json());
    tracks.push(...part.tracks);
    continuation = part.continuation;
  }
  tracks = [...new Map(tracks.map((t) => [t.id, t])).values()];
  if (!data.metadata?.playlistMetadataRenderer)
    throw new Error(
      "공개된 재생목록을 확인할 수 없어요. 기존 저장 내용은 유지됩니다.",
    );
  return { id, title, tracks, ...parseMeta(data) };
}
async function readOfficial(id: string, key: string): Promise<Playlist> {
  const call = async (path: string, params: Record<string, string>) => {
    const res = await fetchTimed(
      `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`,
    );
    const data: any = await res.json();
    if (!res.ok)
      throw new Error(
        data.error?.errors?.[0]?.reason === "quotaExceeded"
          ? "오늘의 유튜브 조회 한도에 도달했어요. 잠시 후 다시 시도해 주세요."
          : "재생목록을 불러오지 못했어요. 공개 설정과 링크를 확인해 주세요.",
      );
    return data;
  };
  const meta = await call("playlists", { part: "snippet", id });
  if (!meta.items?.length) throw new Error("공개된 재생목록을 찾지 못했어요.");
  let token = "",
    tracks: Track[] = [];
  const tokens = new Set<string>();
  do {
    if (tokens.has(token) || tokens.size >= 500)
      throw new Error(
        "목록의 나머지를 확인하지 못했어요. 기존 저장 내용은 유지됩니다.",
      );
    tokens.add(token);
    const page = await call("playlistItems", {
      part: "snippet,status",
      playlistId: id,
      maxResults: "50",
      ...(token ? { pageToken: token } : {}),
    });
    for (const item of page.items || []) {
      const s = item.snippet;
      const video = s?.resourceId?.videoId;
      if (
        !video ||
        item.status?.privacyStatus === "private" ||
        /^(Private video|Deleted video)$/.test(s.title)
      )
        continue;
      tracks.push({
        id: video,
        title: s.title,
        artist: s.videoOwnerChannelTitle || s.channelTitle || "YouTube",
        thumbnail: `https://i.ytimg.com/vi/${video}/hqdefault.jpg`,
      });
    }
    token = page.nextPageToken || "";
  } while (token);
  tracks = [...new Map(tracks.map((t) => [t.id, t])).values()];
  const thumbnails = meta.items[0].snippet.thumbnails;
  return { id, title: meta.items[0].snippet.title, tracks, thumbnail: thumbnails?.maxres?.url || thumbnails?.high?.url || thumbnails?.default?.url, views: null };
}
