import { monthOf } from "./archive.ts";
import { displayTitle, kindOf, yearOf, type Scope } from "./collections.ts";
import type { Playlist, Track } from "./music.ts";

export type MusicRecord = Track & {
  playlistIds: string[];
  playlists: string[];
  collections: string[];
  scopes: Scope[];
  months: string[];
  years: string[];
  updatedAt: number;
};

export type MusicFilters = {
  q?: string;
  scope?: Scope | "all";
  year?: string;
  month?: string;
  collection?: string;
};

function addUnique<T>(target: T[], value: T) {
  if (!target.includes(value)) target.push(value);
}

// Filter playlists before deduplicating: a shared song must not inherit a
// collection month/year from the excluded monthly or annual archive.
export function buildMonthlyPickIndex(playlists: (Playlist & { updatedAt?: number })[]) {
  return buildMusicIndex(playlists.filter(p => kindOf(p) === "picks"));
}

function scopeLabels(playlist: Pick<Playlist, "id" | "title">): Scope[] {
  const kind = kindOf(playlist);
  const scopes: Scope[] = ["all"];
  if (kind !== "other") scopes.push(kind);
  if (kind !== "monthly") scopes.push("curation");
  return scopes;
}

export function buildMusicIndex(
  playlists: (Playlist & { updatedAt?: number })[],
): MusicRecord[] {
  const byId = new Map<string, MusicRecord>();
  for (const playlist of playlists) {
    const collection = displayTitle(playlist);
    const month = monthOf(collection);
    const year = yearOf(playlist);
    const scopes = scopeLabels(playlist);
    for (const track of playlist.tracks) {
      const current = byId.get(track.id) || {
        ...track,
        playlistIds: [],
        playlists: [],
        collections: [],
        scopes: [],
        months: [],
        years: [],
        updatedAt: playlist.updatedAt || 0,
      };
      addUnique(current.playlistIds, playlist.id);
      if (!current.channelId && track.channelId) current.channelId = track.channelId;
      addUnique(current.playlists, collection);
      addUnique(current.collections, kindOf(playlist));
      for (const scope of scopes) addUnique(current.scopes, scope);
      if (month !== "그 밖의 재생목록") addUnique(current.months, month);
      if (year) addUnique(current.years, year);
      current.updatedAt = Math.max(current.updatedAt, playlist.updatedAt || 0);
      byId.set(track.id, current);
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title),
  );
}

export function filterMusicIndex(items: MusicRecord[], filters: MusicFilters) {
  const q = filters.q?.trim().toLowerCase() || "";
  return items.filter((item) => {
    if (
      filters.scope &&
      filters.scope !== "all" &&
      !item.scopes.includes(filters.scope)
    )
      return false;
    if (
      filters.year &&
      filters.year !== "all" &&
      !item.years.includes(filters.year)
    )
      return false;
    if (
      filters.month &&
      filters.month !== "all" &&
      !item.months.some((m) => m.endsWith(`.${filters.month!.padStart(2, "0")}`))
    )
      return false;
    if (
      filters.collection &&
      filters.collection !== "all" &&
      !item.collections.includes(filters.collection)
    )
      return false;
    if (!q) return true;
    return `${item.title} ${item.artist} ${item.playlists.join(" ")}`
      .toLowerCase()
      .includes(q);
  });
}
