// 기존 Python 검색기의 제목 부분 일치 검색과 링크 추출을 웹에서 재사용하도록 이식했습니다.
// 한 영상이 여러 재생목록에 속한 경우 소속을 모두 보존합니다.
import type { Playlist, Track } from "./music";
export function searchLibrary(playlists: Playlist[], query: string) {
  const unique = new Map<string, Track & { playlists: string[] }>();
  playlists.forEach((p) =>
    p.tracks.forEach((t) => {
      const old = unique.get(t.id);
      if (old) old.playlists.push(p.title);
      else unique.set(t.id, { ...t, playlists: [p.title] });
    }),
  );
  return [...unique.values()].filter((t) =>
    `${t.title} ${t.artist} ${t.playlists.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
}
export function monthOf(title: string) {
  if (/\d\s*[~&]\s*\d/.test(title)) return "그 밖의 재생목록";
  const standard = title.match(/(20\d{2})\s*[.년\-/]\s*(\d{1,2})/);
  const korean = title.match(/(?:^|[^\d&~])(\d{1,2})월[^()]*\((20\d{2})\)/);
  const year = standard?.[1] || korean?.[2];
  const month = standard?.[2] || korean?.[1];
  return year && month && +month >= 1 && +month <= 12
    ? `${year}.${month.padStart(2, "0")}`
    : "그 밖의 재생목록";
}
