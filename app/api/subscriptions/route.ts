import { database } from "../../../db";
import { body, ApiError, failure, requireAdmin } from "../../../lib/server";
import { CSV_URL, parseSubscriptions } from "../../../lib/subscriptions";
async function init() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS subscription_snapshots (id TEXT PRIMARY KEY, channels TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)",
    )
    .run();
}
export async function GET() {
  try {
    await init();
    const saved = await database()
      .prepare(
        "SELECT channels,updated_at,source FROM subscription_snapshots WHERE id='main'",
      )
      .first<{ channels: string; updated_at: number; source: string }>();
    return Response.json(
      saved
        ? {
            channels: JSON.parse(saved.channels),
            updatedAt: saved.updated_at,
            source: saved.source,
          }
        : { channels: [], updatedAt: null, source: null },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const input = await body(request, 2000000);
    let csv: string;
    let source: string;
    if (input.source === "sheet") {
      const res = await fetch(CSV_URL, { signal: AbortSignal.timeout(30000) });
      if (!res.ok)
        throw new ApiError(
          "공개 시트를 읽지 못했습니다. CSV 파일로 가져올 수 있어요.",
          502,
        );
      csv = await res.text();
      source = "Google Sheets";
    } else {
      if (typeof input.csv !== "string")
        throw new ApiError("CSV 파일을 선택해 주세요.");
      csv = input.csv;
      source = "CSV 파일";
    }
    if (csv.length > 1800000)
      throw new ApiError("CSV는 1.8MB 이하로 올려주세요.");
    let channels;
    try {
      channels = parseSubscriptions(csv);
    } catch (e) {
      throw new ApiError((e as Error).message);
    }
    await init();
    const updatedAt = Date.now();
    await database()
      .prepare(
        "INSERT INTO subscription_snapshots (id,channels,updated_at,source) VALUES ('main',?,?,?) ON CONFLICT(id) DO UPDATE SET channels=excluded.channels,updated_at=excluded.updated_at,source=excluded.source",
      )
      .bind(JSON.stringify(channels), updatedAt, source)
      .run();
    return Response.json({ channels, updatedAt, source });
  } catch (e) {
    return failure(e);
  }
}
