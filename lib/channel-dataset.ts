import { database } from "../db";
import { fallbackChannelTagDataset, type ChannelTagDataset } from "./channel-tags";
async function init() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS channel_tag_snapshots (id TEXT PRIMARY KEY, dataset TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)",
    )
    .run();
}
export async function currentDataset() {
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

