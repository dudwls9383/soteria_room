import { database } from "../../../db";
import { body,failure,visitor,visitorCookie,limitGames,ApiError } from "../../../lib/server";
import { randomTracks } from "../../../lib/tournament";
export async function POST(request:Request){try{
 const {playlistId,size}=await body(request,2000);
 if(typeof playlistId!=='string'||!Number.isInteger(size)||size<2||size>2048||(size&(size-1))!==0)throw new ApiError('대진 규모를 다시 선택해 주세요.');
 const owner=visitor(request);await limitGames(owner);
 const playlist=await database().prepare('SELECT tracks FROM playlists WHERE id=?').bind(playlistId).first<{tracks:string}>();if(!playlist)throw new ApiError('재생목록을 먼저 불러와 주세요.');
 const available=JSON.parse(playlist.tracks);if(available.length<size)throw new ApiError('선택한 대진에 필요한 곡이 부족해요.');
 const tracks=randomTracks(available,size),id=crypto.randomUUID();
 await database().prepare('INSERT INTO games (id,visitor,playlist_id,tracks,created_at) VALUES (?,?,?,?,?)').bind(id,owner,playlistId,JSON.stringify(tracks),Date.now()).run();
 return Response.json({id,tracks},{headers:{'Set-Cookie':visitorCookie(request,owner),'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
