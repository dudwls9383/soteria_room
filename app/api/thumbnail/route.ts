import {ApiError,failure} from '../../../lib/server';
import {thumbnailQualities,thumbnailUrl,type ThumbnailQuality} from '../../../lib/thumbnails';
export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams,id=params.get('video')||'',quality=params.get('quality')||'';
    if(!/^[\w-]{11}$/.test(id)||!thumbnailQualities.some(q=>q.id===quality))throw new ApiError('영상과 썸네일 크기를 확인해 주세요.');
    // Fixed YouTube CDN only; user URLs can never become a server fetch target.
    const r=await fetch(thumbnailUrl(id,quality as ThumbnailQuality),{signal:AbortSignal.timeout(10000),redirect:'manual'});
    if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw new ApiError('이 크기의 썸네일이 없어요.',404);
    if(Number(r.headers.get('content-length'))>5*1024*1024)throw new ApiError('이미지가 너무 커요.',413);
    const bytes=await r.arrayBuffer();if(bytes.byteLength>5*1024*1024)throw new ApiError('이미지가 너무 커요.',413);
    return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Content-Disposition':`attachment; filename="youtube-${id}-${quality}.jpg"`,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
  }catch(e){return failure(e);}
}
