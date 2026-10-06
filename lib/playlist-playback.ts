import type {Track} from './music';
export const PLAYLIST_QUEUE_LIMIT=500;
// Only metadata enters the queue. Video loading remains limited to the current song.
export function playlistPlaybackTracks(tracks:Track[]){
 const seen=new Set<string>(),result:Track[]=[];
 for(const track of tracks){if(!track.id||seen.has(track.id))continue;seen.add(track.id);result.push(track);if(result.length===PLAYLIST_QUEUE_LIMIT)break;}
 return result;
}
