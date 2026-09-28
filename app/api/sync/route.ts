import { body, failure } from "../../../lib/server";
import { syncStatus, syncStep } from "../../../lib/channel-sync";
export async function GET() {
  try { return Response.json(await syncStatus(), {headers:{"Cache-Control":"no-store"}}); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const input = await body(request, 1000);
    return Response.json(await syncStep(input.retry === true), {headers:{"Cache-Control":"no-store"}});
  } catch (error) { return failure(error); }
}
