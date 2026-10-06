import { youtubeVideoId } from "../../../lib/thumbnails";
import { ApiError, failure } from "../../../lib/server";

// Fixed YouTube oEmbed endpoint: no arbitrary URL proxy, no API-key exposure.
export async function GET(request:Request) {
  try {
    const id=youtubeVideoId(new URL(request.url).searchParams.get("url")||"");
    if(!id)throw new ApiError("올바른 YouTube 영상 링크를 입력해 주세요.",400);
    const response=await fetch(`https://www.youtube.com/oembed?${new URLSearchParams({url:`https://www.youtube.com/watch?v=${id}`,format:"json"})}`,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new ApiError("영상 정보를 가져오지 못했어요. 제목과 아티스트를 직접 입력할 수 있어요.",502);
    const data=await response.json() as {title?:string;author_name?:string};
    if(typeof data.title!=="string"||!data.title.trim())throw new ApiError("영상 제목을 확인하지 못했어요.",502);
    return Response.json({id,title:data.title.slice(0,120),artist:typeof data.author_name==="string"?data.author_name.slice(0,80):""},{headers:{"Cache-Control":"public, max-age=600"}});
  }catch(error){return failure(error);}
}
