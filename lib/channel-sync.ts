import { env } from "cloudflare:workers";
import { database } from "../db";
import { discoverChannel } from "./channel";
import { readPlaylist } from "./youtube";
import { ensureMeta } from "./playlist-meta";
import series from "./series.json";
import { emptySync, syncAction, SYNC_DAY, SYNC_RETRY_DELAY, type SyncState } from "./sync-policy";

async function init() {
  await database().prepare("CREATE TABLE IF NOT EXISTS channel_sync (id TEXT PRIMARY KEY, state TEXT NOT NULL, owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0)").run();
  await database().prepare("INSERT OR IGNORE INTO channel_sync (id,state) VALUES ('main',?)").bind(JSON.stringify(emptySync())).run();
}
export async function syncStatus() {
  await init();
  const row = await database().prepare("SELECT state,lease_until FROM channel_sync WHERE id='main'").first<{state:string;lease_until:number}>();
  const state: SyncState = JSON.parse(row!.state);
  return { ...state, busy: row!.lease_until > Date.now(), nextSyncAt: state.startedAt ? state.startedAt + SYNC_DAY : 0, retryAt: state.finishedAt + SYNC_RETRY_DELAY };
}

// One request handles one playlist. The persisted queue survives closed tabs;
// a D1 compare-and-set lease prevents different visitors doing the same work.
export async function syncStep(retry: boolean) {
  await init();
  const db = database(), owner = crypto.randomUUID(), now = Date.now();
  const claim = await db.prepare("UPDATE channel_sync SET owner=?,lease_until=? WHERE id='main' AND lease_until<=?")
    .bind(owner, now + 600000, now).run();
  if (!claim.meta.changes) return { ...(await syncStatus()), waiting: true };
  const row = await db.prepare("SELECT state FROM channel_sync WHERE id='main'").first<{state:string}>();
  const state: SyncState = JSON.parse(row!.state);
  try {
    const action = syncAction(state, now, retry);
    if (action === "cached") return { ...(await syncStatus()), cached: true, busy: false };
    if (action === "discover") {
      // Only server-discovered source IDs enter this queue. No client URL is accepted.
      const discovered = await discoverChannel();
      const pending = [...new Map([...series.recap.map(p => ({...p,thumbnail:""})), ...series.kawaii.map(p => ({...p,thumbnail:""})), ...discovered].map(p => [p.id,p])).values()];
      Object.assign(state, { startedAt: now, finishedAt: 0, total: pending.length, done: 0, pending, failures: [] });
    } else if (action === "retry") {
      state.pending = state.failures.map(({error, ...item}) => item);
      state.failures = [];
      state.done = state.total - state.pending.length;
      state.finishedAt = 0;
    }
    const item = state.pending[0];
    let playlist;
    try {
      playlist = await readPlaylist(item.id, (env as any).YOUTUBE_API_KEY);
      if (!playlist.tracks.length) {
        const prior = await db.prepare("SELECT json_array_length(tracks) AS count FROM playlists WHERE id=?").bind(item.id).first<{count:number}>();
        if (prior?.count) throw new Error("곡 목록이 비어 있어 기존 자료를 유지했어요. 공개 상태를 다시 확인해 주세요.");
      }
    } catch (error) {
      playlist = undefined;
      state.failures.push({...item, error: error instanceof Error ? error.message : "다시 확인해 주세요."});
    }
    state.pending.shift();
    state.done++;
    if (!state.pending.length) {
      state.finishedAt = Date.now();
      if (!state.failures.length) state.lastSuccessAt = state.finishedAt;
    }
    await ensureMeta();
    const owned = "EXISTS (SELECT 1 FROM channel_sync WHERE id='main' AND owner=?)";
    const writes = [];
    if (playlist) {
      // A superseded request must never overwrite a newer worker's result.
      writes.push(db.prepare(`INSERT INTO playlists (id,title,tracks,updated_at) SELECT ?,?,?,? WHERE ${owned} ON CONFLICT(id) DO UPDATE SET title=excluded.title,tracks=excluded.tracks,updated_at=excluded.updated_at`).bind(playlist.id,playlist.title,JSON.stringify(playlist.tracks),Date.now(),owner));
      writes.push(db.prepare(`INSERT INTO playlist_meta (id,thumbnail,views,checked_at) SELECT ?,?,?,? WHERE ${owned} ON CONFLICT(id) DO UPDATE SET thumbnail=COALESCE(NULLIF(excluded.thumbnail,''),playlist_meta.thumbnail),views=excluded.views,checked_at=excluded.checked_at`).bind(playlist.id,playlist.thumbnail || item.thumbnail || "",playlist.views ?? null,Date.now(),owner));
    }
    writes.push(db.prepare("UPDATE channel_sync SET state=?,owner=NULL,lease_until=0 WHERE id='main' AND owner=?").bind(JSON.stringify(state),owner));
    await db.batch(writes);
    return { ...(await syncStatus()), title: item.title };
  } catch (error) {
    // Discovery failures are throttled too, without erasing a prior good library.
    if (!state.pending.length) {
      state.startedAt = now - SYNC_DAY + SYNC_RETRY_DELAY;
      await db.prepare("UPDATE channel_sync SET state=? WHERE id='main' AND owner=?").bind(JSON.stringify(state),owner).run();
    }
    throw error;
  } finally {
    await db.prepare("UPDATE channel_sync SET owner=NULL,lease_until=0 WHERE id='main' AND owner=?").bind(owner).run();
  }
}
