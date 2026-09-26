import type { Playlist } from "./music";
import series from "./series.json" with { type: "json" };
export type Scope =
  "all" | "picks" | "monthly" | "curation" | "recap" | "kawaii";
export const scopes: { value: Scope; label: string }[] = [
  { value: "picks", label: "월의 픽만" },
  { value: "all", label: "전체 · 월별 수집 포함" },
  { value: "curation", label: "큐레이션 전체 · 수집 제외" },
  { value: "monthly", label: "월별·연간 수집 목록만" },
  { value: "recap", label: "My Recap" },
  { value: "kawaii", label: "Kawaii Voice" },
];
export const seriesLists = series;
export function kindOf(p: Pick<Playlist, "id" | "title">) {
  if (series.recap.some((x) => x.id === p.id)) return "recap";
  if (series.kawaii.some((x) => x.id === p.id)) return "kawaii";
  if (
    /^20\d{2}\s*[.-]\s*\d{1,2}$/.test(p.title.trim()) ||
    /^a bundle of songs|^Before 2021$/i.test(p.title)
  )
    return "monthly";
  if (/월의\s*픽/.test(p.title)) return "picks";
  return "other";
}
export function inScope(p: Pick<Playlist, "id" | "title">, scope: Scope) {
  const kind = kindOf(p);
  return (
    scope === "all" ||
    (scope === "curation" ? kind !== "monthly" : kind === scope)
  );
}
export function displayTitle(p: Pick<Playlist, "id" | "title">) {
  return (
    [...series.recap, ...series.kawaii].find((x) => x.id === p.id)?.title ||
    p.title
  );
}
export function comparePlaylists(
  a: Playlist & { updatedAt?: number },
  b: Playlist & { updatedAt?: number },
  sort: string,
  direction: "asc" | "desc",
) {
  const sign = direction === "asc" ? 1 : -1;
  // 조회수가 공개되지 않은 목록은 0회로 추정하지 않고, 어느 방향에서도 마지막에 둡니다.
  if (sort === "views") {
    if (a.views == null)
      return b.views == null ? a.title.localeCompare(b.title) : 1;
    if (b.views == null) return -1;
    return sign * (a.views - b.views) || a.title.localeCompare(b.title);
  }
  if (sort === "count")
    return (
      sign * (a.tracks.length - b.tracks.length) ||
      a.title.localeCompare(b.title)
    );
  if (sort === "updated")
    return sign * ((a.updatedAt || 0) - (b.updatedAt || 0));
  const key = (p: Playlist) => {
    const t = displayTitle(p);
    const y =
      t.match(/20\d{2}/)?.[0] ||
      t.match(/^(\d{2})년/)?.[1]?.replace(/^(\d{2})$/, "20$1") ||
      "";
    const m =
      t.match(/(\d{1,2})월/)?.[1] || t.match(/20\d{2}[.](\d{1,2})/)?.[1] || "";
    return y + m.padStart(2, "0");
  };
  if (sort === "month") {
    const ak = key(a),
      bk = key(b);
    if (!ak || !bk) return ak ? -1 : bk ? 1 : a.title.localeCompare(b.title);
    return sign * ak.localeCompare(bk) || a.title.localeCompare(b.title);
  }
  return (
    sign *
    displayTitle(a).localeCompare(displayTitle(b), "ko", { numeric: true })
  );
}
// 부분 Fisher–Yates: 전체 풀에서 중복 없이 뽑되 요청한 수만큼만 섞습니다.
export function sampleUnique<T>(items: T[], count: number) {
  const copy = [...items],
    limit = Math.max(0, Math.min(Math.floor(count) || 0, copy.length));
  for (let i = 0; i < limit; i++) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0];
    const j = i + Math.floor((value / 4294967296) * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
}

// 리캡의 축약 연도(26년)도 연도 필터에서는 2026으로 취급합니다.
export function yearOf(p: Pick<Playlist, "id" | "title">) {
  const title = displayTitle(p);
  return (
    title.match(/20\d{2}/)?.[0] ||
    (title.match(/^(\d{2})년/)?.[1]
      ? `20${title.match(/^(\d{2})년/)![1]}`
      : undefined)
  );
}
