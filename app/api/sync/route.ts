import { body, failure } from "../../../lib/server";
import { syncStatus, syncStep, stopSync } from "../../../lib/channel-sync";
export async function GET(request: Request) {
  try { return Response.json(await syncStatus(new URL(request.url).searchParams.get("stage") === "secondary" ? "secondary" : "primary"), {headers:{"Cache-Control":"no-store"}}); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const input = await body(request, 1000);
    if (input.action === "stop") { await stopSync(); return Response.json(await syncStatus(input.stage === "secondary" ? "secondary" : "primary"),{headers:{"Cache-Control":"no-store"}}); }
    return Response.json(await syncStep(input.retry === true, input.automatic === true, input.stage === "secondary" ? "secondary" : "primary", input.continuing === true), {headers:{"Cache-Control":"no-store"}});
  } catch (error) { return failure(error); }
}
