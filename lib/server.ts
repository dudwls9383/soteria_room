import { database } from "../db";
import { env } from "cloudflare:workers";
export class ApiError extends Error { constructor(message:string,public status=400){super(message);} }
export function failure(e:unknown){console.error(e instanceof Error?e.message:'Request failed');return Response.json({error:e instanceof ApiError?e.message:"잠시 연결에 문제가 생겼어요. 입력을 유지했으니 다시 시도해 주세요."},{status:e instanceof ApiError?e.status:503});}
export async function body(request:Request,max=100000){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('허용되지 않은 요청이에요.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError('올바른 요청 형식이 필요해요.');
 if(Number(request.headers.get('content-length'))>max)throw new ApiError('요청이 너무 커요.',413);
 const text=await request.text();if(text.length>max)throw new ApiError('요청이 너무 커요.',413);
 try{return JSON.parse(text);}catch{throw new ApiError('입력 내용을 확인해 주세요.');}
}

export function adminConfigured() {
  return typeof (env as any).SOTERIA_ADMIN_KEY === "string" && (env as any).SOTERIA_ADMIN_KEY.length > 0;
}
export function requireAdmin(request: Request) {
  if (!adminConfigured()) throw new ApiError("관리자 키가 아직 설정되지 않았어요. 로컬 또는 Sites 환경에 SOTERIA_ADMIN_KEY를 넣어 주세요.", 403);
  const key = request.headers.get("x-soteria-admin-key") || "";
  if (key !== (env as any).SOTERIA_ADMIN_KEY) throw new ApiError("관리자 잠금이 필요해요.", 403);
}
export function visitor(request:Request){const id=request.headers.get('cookie')?.match(/(?:^|;\s*)picktrack_visitor=([\w-]{36})(?:;|$)/)?.[1];return id||crypto.randomUUID();}
export function visitorCookie(request:Request,id:string){return `picktrack_visitor=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function limitGames(id:string){const row=await database().prepare('SELECT COUNT(*) AS count FROM games WHERE visitor = ? AND created_at > ?').bind(id,Date.now()-3600000).first<{count:number}>();if((row?.count||0)>=30)throw new ApiError('한 시간에 최대 30개의 월드컵을 시작할 수 있어요. 잠시 후 다시 이용해 주세요.',429);}
