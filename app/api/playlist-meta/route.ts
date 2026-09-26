import { refreshMeta } from "../../../lib/playlist-meta";
import { playlistId } from "../../../lib/youtube";
import { body, failure, ApiError } from "../../../lib/server";
export async function POST(request: Request) {
  try {
    const input = await body(request, 2000);
    let id;
    try {
      id = playlistId(input.url);
    } catch {
      throw new ApiError("재생목록 주소를 확인해 주세요.");
    }
    return Response.json(await refreshMeta(id));
  } catch (error) {
    return failure(error);
  }
}
