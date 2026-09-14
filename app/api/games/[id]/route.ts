import { database } from "../../../../db";
import { ApiError,body,failure,visitor } from "../../../../lib/server";
import { evaluate } from "../../../../lib/tournament";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
 const {id}=await context.params;const {winners}=await body(request);const owner=visitor(request);
 const game=await database().prepare('SELECT tracks,completed_at FROM games WHERE id=? AND visitor=?').bind(id,owner).first<{tracks:string;completed_at:number|null}>();
 if(!game)throw new ApiError('이 브라우저에서 시작한 월드컵을 찾지 못했어요.',404);
 if(game.completed_at)return Response.json({saved:true});
 let results;try{results=evaluate(JSON.parse(game.tracks),winners);}catch(e){throw new ApiError((e as Error).message);}
 await database().prepare('UPDATE games SET results=?,winners=?,completed_at=? WHERE id=? AND visitor=? AND completed_at IS NULL').bind(JSON.stringify(results),JSON.stringify(winners),Date.now(),id,owner).run();
 return Response.json({saved:true});
 }catch(e){return failure(e);}}
