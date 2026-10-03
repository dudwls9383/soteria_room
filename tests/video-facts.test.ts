import { test } from "node:test";
import assert from "node:assert/strict";
import {
  durationSeconds,
  hiddenCandidate,
  playbackError,
  FACT_TTL,
  resultPage,
  type VideoFact,
} from "../lib/video-facts.ts";
import { readPlaylist } from "../lib/youtube.ts";
import { channelTagOrder, compareChannelTags } from "../lib/channel-labels.ts";
test("hidden results can traverse all pages without overlaps and clamp invalid pages", () => {
  const all = Array.from({ length: 29 }, (_, i) => i);
  assert.deepEqual(
    [1, 2, 3].flatMap((p) => resultPage(all, p).music),
    all,
  );
  assert.equal(resultPage(all, 99).page, 3);
  assert.equal(resultPage(all, NaN).page, 1);
  assert.equal(resultPage([], 2).pages, 1);
});
test("display tag order preserves source identifiers", () => {
  assert.deepEqual(
    [...channelTagOrder].reverse().sort(compareChannelTags),
    channelTagOrder,
  );
});
test("Recap with API configured uses public page; quota errors on normal lists never fall back", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return new Response(
      "var ytInitialData = " +
        JSON.stringify({
          metadata: { playlistMetadataRenderer: { title: "Recap" } },
          contents: {
            playlistVideoRenderer: {
              videoId: "abcdefghijk",
              title: { simpleText: "Song" },
              isPlayable: true,
            },
          },
        }) +
        ";",
    );
  }) as typeof fetch;
  try {
    const p = await readPlaylist("LRSR_test_recap", "configured-key");
    assert.equal(p.tracks.length, 1);
    assert.match(calls[0], /www.youtube.com\/playlist/);
    calls.length = 0;
    globalThis.fetch = (async (input) => {
      calls.push(String(input));
      return Response.json(
        { error: { errors: [{ reason: "quotaExceeded" }] } },
        { status: 403 },
      );
    }) as typeof fetch;
    await assert.rejects(
      readPlaylist("PL_normal_playlist", "configured-key"),
      /한도/,
    );
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
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
