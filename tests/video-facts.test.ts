import { test } from "node:test";
import assert from "node:assert/strict";
import {
  durationSeconds,
  hiddenCandidate,
  playbackError,
  FACT_TTL,
  type VideoFact,
} from "../lib/video-facts.ts";
test("duration covers long streams and missing values", () => {
  assert.equal(durationSeconds("PT3M59S"), 239);
  assert.equal(durationSeconds("P1DT2H3M"), 93780);
  assert.equal(durationSeconds("bad"), 0);
});
test("hidden picks exclude unknown counts, blocked videos and stale observations", () => {
  const now = Date.now(),
    f: VideoFact = {
      id: "example",
      views: 1000,
      seconds: 239,
      publishedAt: "2020-01-01",
      availability: "available",
      checkedAt: now,
    };
  assert.equal(hiddenCandidate(f, 1000, 300, "2020", now), true);
  for (const patch of [
    { views: null },
    { views: 1001 },
    { seconds: 301 },
    { seconds: 0 },
    { publishedAt: "2021-01-01" },
    { availability: "missing" as const },
    { checkedAt: now - FACT_TTL },
  ])
    assert.equal(
      hiddenCandidate({ ...f, ...patch }, 1000, 300, "2020", now),
      false,
    );
});
test("player distinguishes blocked embedding from connection errors", () => {
  assert.match(playbackError(100), /비공개/);
  assert.match(playbackError(150), /허용하지/);
  assert.match(playbackError(153), /연결 정보/);
  assert.match(playbackError(5), /연결을 확인/);
});
