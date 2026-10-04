export type Track = { id: string; title: string; artist: string; thumbnail: string; channelId?: string };
export type Playlist = { id: string; title: string; tracks: Track[]; trackCount?: number; summaryOnly?: boolean; warning?: string; thumbnail?: string; views?: number | null };
export function playlistCount(p: Playlist) { return p.trackCount ?? p.tracks.length; }
export const DEMO: Playlist = { id: "demo", title: "한 번쯤 들어본 그 노래", tracks: [
  ["gdZLi9oWNZg", "Dynamite", "BTS"], ["phuiiNCxRMg", "Supernova", "aespa"],
  ["kOHB85vDuow", "FANCY", "TWICE"], ["V9PVRfjEBTI", "BIRDS OF A FEATHER", "Billie Eilish"],
  ["TUVcZfQe-Kw", "Levitating (feat. DaBaby)", "Dua Lipa"], ["XsX3ATc3FbA", "작은 것들을 위한 시 (Boy With Luv)", "BTS"],
  ["hT_nvWreIhg", "Counting Stars", "OneRepublic"], ["9bZkp7q19f0", "강남스타일", "PSY"],
].map(([id, title, artist]) => ({id, title, artist, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`})) };
