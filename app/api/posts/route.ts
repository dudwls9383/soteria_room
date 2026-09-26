import { readPosts } from "../../../lib/posts";
import { ApiError, failure } from "../../../lib/server";
export async function GET(request: Request) {
  try {
    return Response.json({
      posts: await readPosts(
        new URL(request.url).searchParams.get("source") || "",
      ),
    });
  } catch (e) {
    return failure(
      new ApiError(
        e instanceof Error ? e.message : "글 목록을 읽지 못했습니다.",
        502,
      ),
    );
  }
}
