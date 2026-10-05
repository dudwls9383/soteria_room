import { isPostSource } from "../../../lib/posts";
import { readConnectedPosts } from "../../../lib/post-store";
import { ApiError, failure } from "../../../lib/server";
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const source = query.get("source") || "all";
    if (source !== "all" && !isPostSource(source)) throw new ApiError("알 수 없는 연결 공간입니다.");
    const refresh = query.get("refresh") === "1";
    return Response.json(await readConnectedPosts(source, refresh), { headers: { "Cache-Control": refresh ? "no-store" : "public, max-age=30" } });
  } catch (e) {
    return failure(e);
  }
}
