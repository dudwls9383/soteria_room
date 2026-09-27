import { env } from "cloudflare:workers";
import { readPlaylist, playlistId } from "../../../lib/youtube";
import { ApiError, body, failure } from "../../../lib/server";

export async function POST(request: Request) {
  try {
    const input = await body(request, 2000);
    if (typeof input.url !== "string")
      throw new ApiError("재생목록 링크를 입력해 주세요.");
    let id: string;
    try {
      id = playlistId(input.url);
    } catch (e) {
      throw new ApiError((e as Error).message);
    }
    try {
      const playlist = await readPlaylist(id, (env as any).YOUTUBE_API_KEY);
      return Response.json({ ...playlist, previewOnly: true });
    } catch (e) {
      throw new ApiError(
        (e as Error).name === "TimeoutError"
          ? "유튜브 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요."
          : (e as Error).message,
        422,
      );
    }
  } catch (e) {
    return failure(e);
  }
}
