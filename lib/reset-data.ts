import { database } from "../db";
import { ensureMeta } from "./playlist-meta";
import { ensureSync } from "./channel-sync";
import { resetPlan, type ResetTarget } from "./reset-plan";

export async function resetData(target: ResetTarget) {
  const db = database();
  if (target === "library") {
    await ensureSync(); await ensureMeta();
    // Revoke the in-flight lease atomically. A reset cannot be undone by an
    // older sync response, and automatic imports stay paused until manual sync.
  } else if (target === "json") {
    await db.prepare("CREATE TABLE IF NOT EXISTS channel_tag_snapshots (id TEXT PRIMARY KEY, dataset TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)").run();
    // A tombstone prevents the bundled fallback JSON silently reappearing.
  } else {
    await db.prepare("CREATE TABLE IF NOT EXISTS subscription_snapshots (id TEXT PRIMARY KEY, channels TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)").run();
  }
  await db.batch(resetPlan(target,Date.now()).map(({sql,params})=>params.length ? db.prepare(sql).bind(...params) : db.prepare(sql)));
}
