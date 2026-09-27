import fallbackData from "./channel-tags-data.ts";
import type { Channel } from "./subscriptions";

export type ChannelTagSummary = {
  id: string;
  label: string;
  count: number;
};
export type TaggedChannel = Channel & {
  tags: string[];
  subscriberCount?: string | null;
  topics?: string[];
};
export type PicksCategory = {
  id: string;
  label: string;
  kind: string;
  tag?: string;
};
export type ChannelTagDataset = {
  generatedFrom?: string;
  tags: Record<string, string[]>;
  collections: Record<string, string[]>;
  channels: Record<
    string,
    {
      title: string;
      avatar?: string | null;
      subscriberCount?: string | null;
      topics?: string[];
    }
  >;
  picksCategories: PicksCategory[];
};

const tagKeys = [
  "ASMR",
  "ASMR_ysm_1",
  "KawaVo",
  "KawaVo2",
  "KawaVo2_ysm_1",
  "KawaVo2_ysm_2",
  "KawaVo_ysm_1",
  "KawaVo_ysm_2",
  "KawaVo_ysm_3",
  "KawaVo_ysm_4",
  "ShotaVo",
  "ShotaVo_ysm_1",
  "ShotaVo_ysm_2",
  "vocal(M)",
  "vocal(M)_ysm_1",
  "vocal(f)",
  "composer",
  "composer_ysm_1",
  "Japan",
  "Korea",
  "Playlist",
  "Topic",
];
const collectionKeys: Record<string, string[]> = {
  ASMR: ["ASMR", "ASMR_ysm_1"],
  KawaVo: [
    "KawaVo",
    "KawaVo2",
    "KawaVo2_ysm_1",
    "KawaVo2_ysm_2",
    "KawaVo_ysm_1",
    "KawaVo_ysm_2",
    "KawaVo_ysm_3",
    "KawaVo_ysm_4",
  ],
  ShotaVo: ["ShotaVo", "ShotaVo_ysm_1", "ShotaVo_ysm_2"],
  VocalMale: ["vocal(M)", "vocal(M)_ysm_1"],
  VocalFemale: ["vocal(f)"],
  Composer: ["composer", "composer_ysm_1"],
  Japan: ["Japan"],
  Korea: ["Korea"],
  Playlist: ["Playlist"],
  Topic: ["Topic"],
};
const tagLabels: Record<string, string> = {
  ASMR: "ASMR",
  KawaVo: "카와보",
  ShotaVo: "쇼타보",
  VocalMale: "남성 보컬",
  VocalFemale: "여성 보컬",
  Composer: "작곡가",
  Japan: "일본",
  Korea: "한국",
  Playlist: "재생목록",
  Topic: "Topic",
};
const defaultPicksCategories: PicksCategory[] = [
  { id: "general", label: "일반", kind: "Picks" },
  { id: "kawavo", label: "카와보", kind: "Picks", tag: "KawaVo" },
  { id: "kes", label: "케스", kind: "Picks" },
  { id: "ikebo", label: "이케보", kind: "Picks" },
  { id: "asmr", label: "ASMR", kind: "Picks", tag: "ASMR" },
  { id: "song_recommend", label: "노래추", kind: "Picks" },
  { id: "best", label: "Best", kind: "Meta" },
  { id: "tip", label: "Tip", kind: "Meta" },
  { id: "question", label: "질문", kind: "Meta" },
  { id: "memo", label: "메모장", kind: "Meta" },
];

export const fallbackChannelTagDataset = fallbackData as ChannelTagDataset;

function uniqueIds(values: unknown) {
  const ids: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(values)) return ids;
  for (const value of values) {
    if (typeof value !== "string" || !value.startsWith("UC")) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

export function buildChannelTagDataset(
  input: any,
  generatedFrom = "업로드 JSON",
) {
  if (!input || typeof input !== "object") {
    throw new Error("YouTube Subscription Manager JSON 형식이 필요합니다.");
  }
  const tags: Record<string, string[]> = {};
  const allIds = new Set<string>();
  for (const key of tagKeys) {
    const ids = uniqueIds(input[key]);
    if (!ids.length) continue;
    tags[key] = ids;
    ids.forEach((id) => allIds.add(id));
  }
  if (!Object.keys(tags).length) {
    throw new Error("ASMR, KawaVo 같은 채널 태그 목록을 찾지 못했습니다.");
  }
  const collections: Record<string, string[]> = {};
  for (const [name, keys] of Object.entries(collectionKeys)) {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const key of keys) {
      for (const id of tags[key] || []) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        allIds.add(id);
      }
    }
    collections[name] = ids;
  }
  const metadata =
    input.ysc_channel_metadata && typeof input.ysc_channel_metadata === "object"
      ? input.ysc_channel_metadata
      : {};
  const subs =
    input.ysc_subs_count && typeof input.ysc_subs_count === "object"
      ? input.ysc_subs_count
      : {};
  const channels: ChannelTagDataset["channels"] = {};
  for (const id of [...allIds].sort()) {
    const meta =
      metadata[id] && typeof metadata[id] === "object" ? metadata[id] : {};
    const sub = subs[id] && typeof subs[id] === "object" ? subs[id] : {};
    channels[id] = {
      title: typeof meta.title === "string" ? meta.title : id,
      avatar: typeof meta.img === "string" ? meta.img : null,
      subscriberCount: typeof sub.sc === "string" ? sub.sc : null,
      topics: Array.isArray(sub.t)
        ? sub.t.filter((x: unknown) => typeof x === "string")
        : [],
    };
  }
  return {
    generatedFrom,
    tags,
    collections,
    channels,
    picksCategories: defaultPicksCategories,
  } satisfies ChannelTagDataset;
}

export function channelTagSummaries(
  dataset: ChannelTagDataset,
): ChannelTagSummary[] {
  return Object.entries(dataset.collections).map(([id, ids]) => ({
    id,
    label: tagLabels[id] || id,
    count: ids.length,
  }));
}

export function channelTagsFor(dataset: ChannelTagDataset, id: string) {
  const names = new Set<string>();
  for (const [tag, ids] of Object.entries(dataset.tags)) {
    if (ids.includes(id)) names.add(tag.replace(/_ysm_\d+$/, ""));
  }
  for (const [tag, ids] of Object.entries(dataset.collections)) {
    if (ids.includes(id)) names.add(tag);
  }
  return [...names];
}

export function taggedChannels(
  dataset: ChannelTagDataset,
  tag: string,
  limit = 500,
): TaggedChannel[] {
  const ids = dataset.collections[tag] || dataset.tags[tag] || [];
  return ids.slice(0, Math.max(0, limit)).map((id) => {
    const meta = dataset.channels[id] || { title: id };
    return {
      id,
      title: meta.title || id,
      url: `https://www.youtube.com/channel/${id}`,
      avatar: meta.avatar || undefined,
      tags: channelTagsFor(dataset, id),
      subscriberCount: meta.subscriberCount || null,
      topics: meta.topics || [],
    };
  });
}

export function searchTaggedChannels(
  dataset: ChannelTagDataset,
  tag: string,
  query = "",
  limit = 500,
) {
  const q = query.trim().toLowerCase();
  const items = taggedChannels(dataset, tag, 5000);
  const filtered = q
    ? items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      )
    : items;
  return filtered.slice(0, Math.max(0, limit));
}
