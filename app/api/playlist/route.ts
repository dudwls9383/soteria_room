import { env } from "cloudflare:workers";
import { database } from "../../../db";
import { readPlaylist, playlistId } from "../../../lib/youtube";
import { ApiError, body, failure } from "../../../lib/server";
export async function POST(request:Request){try{
 const input=await body(request,2000);if(typeof input.url!=='string')throw new ApiError('재생목록 링크를 입력해 주세요.');
 let id:string;try{id=playlistId(input.url);}catch(e){throw new ApiError((e as Error).message);}
 const cached=await database().prepare('SELECT title, tracks, updated_at FROM playlists WHERE id = ?').bind(id).first<{title:string;tracks:string;updated_at:number}>();
 if(cached&&Date.now()-cached.updated_at<900000)return Response.json({id,title:cached.title,tracks:JSON.parse(cached.tracks)});
 let playlist;try{playlist=await readPlaylist(id,(env as any).YOUTUBE_API_KEY);}catch(e){throw new ApiError((e as Error).name==='TimeoutError'?'유튜브 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.':(e as Error).message,422);}
 await database().prepare('INSERT INTO playlists (id, title, tracks, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, tracks=excluded.tracks, updated_at=excluded.updated_at').bind(id,playlist.title,JSON.stringify(playlist.tracks),Date.now()).run();
 return Response.json(playlist);
 }catch(e){return failure(e);}}
