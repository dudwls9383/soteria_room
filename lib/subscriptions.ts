export type Channel = {
  id: string;
  title: string;
  url: string;
  avatar?: string;
};
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1hmSMNQrMqnwHsMf3YrIwdGXtXpSmLcfdYuPG_MGTFEs/edit?gid=1610687108";
export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1hmSMNQrMqnwHsMf3YrIwdGXtXpSmLcfdYuPG_MGTFEs/export?format=csv&gid=1610687108";
// 쉼표·줄바꿈·큰따옴표가 포함된 채널 이름도 보존하는 CSV 파서입니다.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted)
    throw new Error(
      "CSV의 큰따옴표가 닫히지 않았습니다. 원본 파일을 확인해 주세요.",
    );
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export function parseSubscriptions(text: string): Channel[] {
  const rows = parseCSV(text);
  const channels = new Map<string, Channel>();
  const header = rows.find((r) =>
    r.some((c) => /채널\s*(제목|이름)|channel\s*(title|name)/i.test(c)),
  );
  const titleIndex =
    header?.findIndex((c) =>
      /채널\s*(제목|이름)|channel\s*(title|name)/i.test(c),
    ) ?? -1;
  for (const row of rows)
    for (let i = 0; i < row.length; i++) {
      let url: URL;
      try {
        url = new URL(row[i].trim());
      } catch {
        continue;
      }
      if (
        !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
          url.hostname,
        ) ||
        !["http:", "https:"].includes(url.protocol)
      )
        continue;
      const match = url.pathname.match(/^\/channel\/(UC[\w-]{22})\/?$/);
      const handle = url.pathname.match(/^\/@([\w.\-\p{L}\p{N}%]+)\/?$/u);
      if (!match && !handle) continue;
      const id = match?.[1] || "@" + handle![1];
      const title = (row[titleIndex >= 0 ? titleIndex : i + 1] || id).trim();
      channels.set(id, {
        id,
        title: title || id,
        url: `https://www.youtube.com/${match ? "channel/" : ""}${id}`,
      });
      break;
    }
  if (!channels.size)
    throw new Error(
      "YouTube 채널 주소가 들어 있는 CSV가 필요합니다. 기존 구독목록은 유지됩니다.",
    );
  return [...channels.values()];
}

export function parseChannelAvatar(data: any) {
  const thumbs =
    data?.metadata?.channelMetadataRenderer?.avatar?.thumbnails ||
    data?.header?.c4TabbedHeaderRenderer?.avatar?.thumbnails ||
    data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image
      ?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources;
  return Array.isArray(thumbs) ? thumbs.at(-1)?.url || null : null;
}

export async function readChannelAvatar(url: string) {
  const target = new URL(url);
  if (
    !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
      target.hostname,
    )
  )
    return null;
  const res = await fetch(`${target.href.replace(/\/$/, "")}?hl=ko`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(
    /(?:var\s+ytInitialData|window\["ytInitialData"\])\s*=\s*(\{[\s\S]*?\});/,
  );
  if (!match) return null;
  try {
    return parseChannelAvatar(JSON.parse(match[1]));
  } catch {
    return null;
  }
}
