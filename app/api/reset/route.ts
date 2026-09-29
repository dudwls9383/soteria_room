import { ApiError, body, failure, requireAdmin } from "../../../lib/server";
import { resetData } from "../../../lib/reset-data";
export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request,1000);
    if (!["library","json","csv"].includes(input.target) || input.confirm !== input.target) throw new ApiError("초기화할 자료를 확인해 주세요.");
    await resetData(input.target);
    return Response.json({ok:true}, {headers:{"Cache-Control":"no-store"}});
  } catch(error) { return failure(error); }
}
