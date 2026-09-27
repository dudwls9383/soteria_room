import { database } from "../../../db";
import { ApiError, body, failure, visitor, visitorCookie } from "../../../lib/server";

type RecommendationRow = {
  id: string;
  nickname: string;
  title: string;
  artist: string;
  url: string;
  note: string;
  created_at: number;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    return /(^|\.)youtube\.com$/.test(url.hostname) || url.hostname === "youtu.be";
  } catch {
    return false;
  }
}

async function ensureRecommendations() {
  await database()
    .prepare(
      "CREATE TABLE IF NOT EXISTS recommendations (id TEXT PRIMARY KEY NOT NULL, visitor TEXT NOT NULL, nickname TEXT NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, url TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL)",
    )
    .run();
  await database()
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at)",
    )
    .run();
  await database()
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_recommendations_visitor_created ON recommendations(visitor, created_at)",
    )
    .run();
}

function toRecommendation(row: RecommendationRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    title: row.title,
    artist: row.artist,
    url: row.url,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    await ensureRecommendations();
    const rows = await database()
      .prepare(
        "SELECT id,nickname,title,artist,url,note,created_at FROM recommendations ORDER BY created_at DESC LIMIT 40",
      )
      .all<RecommendationRow>();
    return Response.json(
      { recommendations: rows.results.map(toRecommendation) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (event) {
    return failure(event);
  }
}

export async function POST(request: Request) {
  try {
    await ensureRecommendations();
    const input = await body(request, 3000);
    const nickname = clean(input.nickname, 24) || "익명";
    const title = clean(input.title, 120);
    const artist = clean(input.artist, 80);
    const url = clean(input.url, 300);
    const note = clean(input.note, 240);
    if (!title) throw new ApiError("곡 제목을 입력해 주세요.");
    if (!url || !isYouTubeUrl(url))
      throw new ApiError("YouTube 링크를 입력해 주세요.");
    const owner = visitor(request);
    const recent = await database()
      .prepare(
        "SELECT COUNT(*) AS count FROM recommendations WHERE visitor = ? AND created_at > ?",
      )
      .bind(owner, Date.now() - 3600000)
      .first<{ count: number }>();
    if ((recent?.count || 0) >= 8)
      throw new ApiError("한 시간에 최대 8곡까지 추천할 수 있어요.", 429);
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await database()
      .prepare(
        "INSERT INTO recommendations (id,visitor,nickname,title,artist,url,note,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(id, owner, nickname, title, artist, url, note, createdAt)
      .run();
    return Response.json(
      {
        recommendation: {
          id,
          nickname,
          title,
          artist,
          url,
          note,
          createdAt,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": visitorCookie(request, owner),
        },
      },
    );
  } catch (event) {
    return failure(event);
  }
}
