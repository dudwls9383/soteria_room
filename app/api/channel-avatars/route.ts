import { body, failure } from "../../../lib/server";
import { readChannelAvatar, type Channel } from "../../../lib/subscriptions";

export async function POST(request: Request) {
  try {
    const input = await body(request, 20000);
    const channels = Array.isArray(input.channels)
      ? (input.channels as Channel[]).slice(0, 30)
      : [];
    const avatars = await Promise.all(
      channels.map(async (channel) => [
        channel.id,
        typeof channel.url === "string"
          ? await readChannelAvatar(channel.url)
          : null,
      ]),
    );
    return Response.json({ avatars: Object.fromEntries(avatars) });
  } catch (e) {
    return failure(e);
  }
}
