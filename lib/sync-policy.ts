// Shared server policy: visitors can refresh only the fixed source, once per 24 hours.
export const SYNC_DAY = 24 * 60 * 60 * 1000;
export const SYNC_RETRY_DELAY = 5 * 60 * 1000;
export type SyncItem = { id: string; title: string; thumbnail: string; error?: string };
export type SyncState = {
  startedAt: number; lastSuccessAt: number; finishedAt: number;
  total: number; done: number; pending: SyncItem[]; failures: SyncItem[];
};
export const emptySync = (): SyncState => ({ startedAt: 0, lastSuccessAt: 0, finishedAt: 0, total: 0, done: 0, pending: [], failures: [] });
export function syncAction(state: SyncState, now: number, retry: boolean) {
  if (state.pending.length) return "continue";
  if (!state.startedAt || now - state.startedAt >= SYNC_DAY) return "discover";
  if (retry && state.failures.length && now - state.finishedAt >= SYNC_RETRY_DELAY) return "retry";
  return "cached";
}
