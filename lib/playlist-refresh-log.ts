import { database } from "../db";

export async function refreshHistory(id: string) {
  const db = database();
  await db.prepare("CREATE TABLE IF NOT EXISTS playlist_refresh_log (id TEXT PRIMARY KEY, playlist_id TEXT NOT NULL, at INTEGER NOT NULL, message TEXT NOT NULL, success INTEGER NOT NULL)").run();
  return db.prepare("SELECT at,message,success FROM playlist_refresh_log WHERE playlist_id=? ORDER BY at DESC LIMIT 12").bind(id).all<{at:number;message:string;success:number}>();
}

export async function recordRefresh(id: string, message: string, success: boolean) {
  await refreshHistory(id);
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO playlist_refresh_log VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), id, Date.now(), message, success ? 1 : 0),
    // Keep history bounded, independently for each playlist.
    db.prepare("DELETE FROM playlist_refresh_log WHERE playlist_id=? AND id NOT IN (SELECT id FROM playlist_refresh_log WHERE playlist_id=? ORDER BY at DESC LIMIT 12)").bind(id,id),
  ]);
}
