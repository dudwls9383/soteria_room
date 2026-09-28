import { body, failure, requireAdmin } from "../../../lib/server";
export async function POST(request: Request) {
  try {
    await body(request, 1000);
    requireAdmin(request);
    return Response.json({ok:true}, {headers:{"Cache-Control":"no-store"}});
  } catch (error) { return failure(error); }
}
