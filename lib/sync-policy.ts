// Shared server policy: visitors can refresh only the fixed source, once per 24 hours.
export const SYNC_DAY = 24 * 60 * 60 * 1000;
export const SYNC_RETRY_DELAY = 5 * 60 * 1000;
export type SyncItem = { id: string; title: string; thumbnail: string; count?: number; firstId?: string; error?: string };
export type SyncState = {
  startedAt: number; lastSuccessAt: number; finishedAt: number;
  total: number; done: number; pending: SyncItem[]; failures: SyncItem[]; skipped?: number; paused?: boolean; manifestVersion?: number;
};
export const emptySync = (): SyncState => ({ startedAt: 0, lastSuccessAt: 0, finishedAt: 0, total: 0, done: 0, pending: [], failures: [] });
export function syncAction(state: SyncState, now: number, retry: boolean) {
  if (state.pending.length) return "continue";
  if (!state.startedAt || now - state.startedAt >= SYNC_DAY) return "discover";
  if (retry && state.failures.length && now - state.finishedAt >= SYNC_RETRY_DELAY) return "retry";
  return "cached";
}
// Count + first video are a fast change hint, not a content hash. Refresh all
// entries at least weekly to catch same-count edits and changes near the end.
export function canSkipPlaylist(item: SyncItem, saved: {count:number;firstId:string;updatedAt:number} | undefined, now:number) {
  return !!saved && item.count !== undefined && item.count === saved.count &&
    !!item.firstId && item.firstId === saved.firstId && now - saved.updatedAt < 7 * SYNC_DAY;
}
