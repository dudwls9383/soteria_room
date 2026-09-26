// 재생목록 자체의 커스텀 표지와 조회수만 읽습니다. 개별 영상 통계는 섞지 않습니다.
export function parseMeta(data: any) {
  const thumbnail =
    data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.at(-1)
      ?.url || "";
  let views: number | null = null;
  function walk(value: any) {
    if (typeof value === "string") {
      const match = value.match(
        /^(?:조회수\s*)?([\d,.]+)\s*(만|천|억|K|M|B)?(?:\s*회|\s+views)$/i,
      );
      if (match) {
        const scale: Record<string, number> = {
          천: 1000,
          만: 10000,
          억: 100000000,
          K: 1000,
          M: 1000000,
          B: 1000000000,
        };
        views = Math.round(
          Number(match[1].replaceAll(",", "")) *
            (scale[match[2]?.toUpperCase()] || 1),
        );
      }
    } else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  }
  walk(data.header);
  walk(data.sidebar?.playlistSidebarRenderer?.items?.[0]);
  return { thumbnail, views };
}
