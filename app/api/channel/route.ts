import { discoverChannel } from "../../../lib/channel";
import series from '../../../lib/series.json';
import { ApiError, failure } from "../../../lib/server";
export async function GET() {
  try {
    return Response.json(
      { playlists: [...new Map([...(await discoverChannel()), ...series.recap.map(p=>({...p,thumbnail:''}))].map(p=>[p.id,p])).values()] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(
      new ApiError(
        e instanceof Error ? e.message : "채널을 불러오지 못했습니다.",
        502,
      ),
    );
  }
}
