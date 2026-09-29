import { parseInitialData } from "./youtube.ts";

export type ChannelPlaylist = { id: string; title: string; thumbnail: string; count?: number; firstId?: string };
function videoCount(value: unknown): number | undefined {
  const text = typeof value === "string" ? value : "";
  const match = text.match(/^(?:동영상\s*)?([\d,]+)\s*(?:개|videos?)?$/i);
  return match ? Number(match[1].replaceAll(",", "")) : undefined;
}
const headers = {
  "User-Agent": "Mozilla/5.0",
  "Accept-Language": "ko-KR,ko;q=0.9",
};
// 고정된 운영자 채널만 읽습니다. 사용자 입력 주소를 서버에서 그대로 요청하지 않습니다.
export const CHANNEL_URL = "https://www.youtube.com/@soteria_room/playlists";
export function extractChannelPage(data: any) {
  const items: ChannelPlaylist[] = [];
  let continuation = "";
  function walk(v: any) {
    if (!v || typeof v !== "object") return;
    const r = v.gridPlaylistRenderer || v.playlistRenderer;
    const l = v.lockupViewModel;
    if (r?.playlistId)
      items.push({
        id: r.playlistId,
        count: videoCount(r.videoCount || r.videoCountText?.runs?.map((x:any)=>x.text).join("")),
        firstId: r.navigationEndpoint?.watchEndpoint?.videoId,
        title:
          r.title?.simpleText ||
          r.title?.runs?.map((x: any) => x.text).join("") ||
          r.playlistId,
        thumbnail:
          r.thumbnail?.thumbnails?.at(-1)?.url ||
          r.thumbnails?.[0]?.thumbnails?.at(-1)?.url ||
          "",
      });
    if (l?.contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST" && l.contentId)
      items.push({
        id: l.contentId,
        count: videoCount(l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays?.flatMap((o:any) => o.thumbnailOverlayBadgeViewModel?.thumbnailBadges || []).map((b:any)=>b.thumbnailBadgeViewModel?.text).find(Boolean)),
        firstId: l.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId,
        title:
          l.metadata?.lockupMetadataViewModel?.title?.content || l.contentId,
        thumbnail:
          l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.at(
            -1,
          )?.url || "",
      });
    if (v.continuationItemRenderer)
      continuation =
        v.continuationItemRenderer.continuationEndpoint?.continuationCommand
          ?.token || continuation;
    if (v.continuationItemViewModel)
      continuation =
        v.continuationItemViewModel.continuationCommand?.innertubeCommand
          ?.continuationCommand?.token || continuation;
    for (const child of Object.values(v)) walk(child);
  }
  walk(data);
  return { items, continuation };
}
export async function discoverChannel(): Promise<ChannelPlaylist[]> {
  const response = await fetch(CHANNEL_URL, {
    headers,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new Error("채널을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const html = await response.text();
  const data = parseInitialData(html);
  const selected = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(
    (x: any) => x.tabRenderer?.selected,
  )?.tabRenderer?.content;
  if (!selected) throw new Error("채널의 재생목록 탭을 확인할 수 없습니다.");
  let { items, continuation } = extractChannelPage(selected);
  const version = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
  const seen = new Set<string>();
  while (continuation) {
    if (!version || seen.has(continuation) || seen.size > 100)
      throw new Error(
        "채널의 전체 목록을 읽지 못했습니다. 기존 데이터는 유지됩니다.",
      );
    seen.add(continuation);
    const next = await fetch(
      "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: { clientName: "WEB", clientVersion: version, hl: "ko" },
          },
          continuation,
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!next.ok) throw new Error("채널의 다음 목록을 읽지 못했습니다.");
    const page = extractChannelPage(await next.json());
    items.push(...page.items);
    continuation = page.continuation;
  }
  if (!items.length)
    throw new Error(
      "공개 재생목록을 찾지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  return [
    ...new Map(
      items.filter((p) => /^[\w-]{10,100}$/.test(p.id)).map((p) => [p.id, p]),
    ).values(),
  ];
}
