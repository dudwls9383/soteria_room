export type VideoFact = {
  id: string;
  views: number | null;
  publishedAt: string;
  seconds: number;
  availability: "available" | "missing" | "restricted";
  checkedAt: number;
  channelId?: string;
  channelTitle?: string;
};
export const FACT_TTL = 7 * 86400000;
export function resultPage<T>(items:T[],requested:number,size=12){
 const pages=Math.max(1,Math.ceil(items.length/size));
 const page=Math.max(1,Math.min(pages,Number.isFinite(requested)?Math.floor(requested):1));
 return {page,pages,music:items.slice((page-1)*size,page*size)};
}
export function durationSeconds(value: string) {
  const m = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m
    ? Number(m[1] || 0) * 86400 +
        Number(m[2] || 0) * 3600 +
        Number(m[3] || 0) * 60 +
        Number(m[4] || 0)
    : 0;
}
export function hiddenCandidate(
  f: VideoFact,
  maxViews: number,
  maxSeconds: number,
  before: string,
  now = Date.now(),
) {
  return (
    f.availability === "available" &&
    now - f.checkedAt < FACT_TTL &&
    f.views !== null &&
    f.views <= maxViews &&
    f.seconds > 0 &&
    f.seconds <= maxSeconds &&
    (!before || (!!f.publishedAt && f.publishedAt.slice(0, 4) <= before))
  );
}
export function playbackError(code: number) {
  if (code === 100) return "삭제되었거나 비공개인 영상이에요.";
  if (code === 101 || code === 150)
    return "채널에서 사이트 내 재생을 허용하지 않은 영상이에요.";
  if (code === 153)
    return "YouTube가 재생기 연결 정보를 확인하지 못했어요. YouTube에서 직접 열어 주세요.";
  if (code === 2) return "영상 주소를 확인하지 못했어요.";
  return "영상 재생에 문제가 생겼어요. 연결을 확인하거나 YouTube에서 열어 주세요.";
}
