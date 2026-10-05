import { isPostSource } from "../../../lib/posts";
import { readPostPreview } from "../../../lib/post-store";
import { ApiError, failure } from "../../../lib/server";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const source = query.get("source") || "";
    if (!isPostSource(source) || source === "blog") throw new ApiError("연결된 갤러리의 글만 미리 볼 수 있어요.");
    const url = query.get("url") || "";
    if (!url || url.length > 1000) throw new ApiError("글 주소를 확인해 주세요.");
    return Response.json(await readPostPreview(source, url), { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) { return failure(e); }
}
