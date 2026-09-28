import type { Playlist, Track } from "./music";
export type SavedPlaylist = Playlist & { updatedAt: number };
type PackedTrack = [string,string,string,string?];
type PackedLibrary = { version: 1; songs: PackedTrack[]; playlists: (Omit<SavedPlaylist,"tracks"> & {tracks:number[]})[]; lastUpdatedAt:number };
// Repeated tracks share one wire record. Restore the regular Playlist type at
// the boundary so search, World Cup and the archive keep their existing APIs.
export function packLibrary(playlists: SavedPlaylist[], lastUpdatedAt: number): PackedLibrary {
  const songs: PackedTrack[] = [], indices = new Map<string,number>();
  return { version:1, lastUpdatedAt, songs, playlists: playlists.map(p => ({...p, tracks:p.tracks.map(t => {
    const defaultThumb = `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`;
    const tuple: PackedTrack = t.thumbnail === defaultThumb ? [t.id,t.title,t.artist] : [t.id,t.title,t.artist,t.thumbnail];
    const key = JSON.stringify(tuple);
    let index = indices.get(key);
    if (index === undefined) { index = songs.length; songs.push(tuple); indices.set(key,index); }
    return index;
  })})) };
}
export function unpackLibrary(data: PackedLibrary): SavedPlaylist[] {
  const songs: Track[] = data.songs.map(([id,title,artist,thumbnail]) => ({id,title,artist,thumbnail:thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}));
  return data.playlists.map(p => ({...p,tracks:p.tracks.map(index => songs[index])}));
}
