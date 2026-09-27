import { database } from "../../../db";
import { body, failure, ApiError, requireAdmin } from "../../../lib/server";
import {
  buildChannelTagDataset,
  channelTagSummaries,
  fallbackChannelTagDataset,
  searchTaggedChannels,
  type ChannelTagDataset,
} from "../../../lib/channel-tags";

async function init() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS channel_tag_snapshots (id TEXT PRIMARY KEY, dataset TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)",
    )
    .run();
}
async function currentDataset() {
  await init();
  const saved = await database()
    .prepare(
      "SELECT dataset,updated_at,source FROM channel_tag_snapshots WHERE id='main'",
    )
    .first<{ dataset: string; updated_at: number; source: string }>();
  if (!saved) {
    return {
      dataset: fallbackChannelTagDataset,
      updatedAt: null,
      source: fallbackChannelTagDataset.generatedFrom || "기본 내장 데이터",
    };
  }
  return {
    dataset: JSON.parse(saved.dataset) as ChannelTagDataset,
    updatedAt: saved.updated_at,
    source: saved.source,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tag = url.searchParams.get("tag") || "ASMR";
    const query = url.searchParams.get("q") || "";
    const limit = Math.min(Number(url.searchParams.get("limit") || 240), 3000);
    const { dataset, updatedAt, source } = await currentDataset();
    const channels = searchTaggedChannels(dataset, tag, query, limit);
    return Response.json({
      tag,
      query,
      channels,
      summaries: channelTagSummaries(dataset),
      picksCategories: dataset.picksCategories,
      updatedAt,
      source,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request, 2200000);
    const source =
      typeof input.source === "string"
        ? input.source
        : "YouTube Subscription Manager JSON";
    const raw =
      typeof input.json === "string" ? JSON.parse(input.json) : input.dataset;
    const dataset = buildChannelTagDataset(raw, source);
    await init();
    const updatedAt = Date.now();
    await database()
      .prepare(
        "INSERT INTO channel_tag_snapshots (id,dataset,updated_at,source) VALUES ('main',?,?,?) ON CONFLICT(id) DO UPDATE SET dataset=excluded.dataset,updated_at=excluded.updated_at,source=excluded.source",
      )
      .bind(JSON.stringify(dataset), updatedAt, source)
      .run();
    return Response.json({
      summaries: channelTagSummaries(dataset),
      picksCategories: dataset.picksCategories,
      channels: searchTaggedChannels(dataset, "ASMR", "", 3000),
      tag: "ASMR",
      query: "",
      updatedAt,
      source,
    });
  } catch (e) {
    if (e instanceof SyntaxError)
      return failure(new ApiError("JSON 파일 내용을 확인해 주세요."));
    return failure(e);
  }
}
