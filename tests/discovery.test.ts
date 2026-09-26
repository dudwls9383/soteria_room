import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kindOf,
  inScope,
  comparePlaylists,
  sampleUnique,
  seriesLists,
  yearOf,
} from "../lib/collections.ts";
import {
  parseSubscriptions,
  parseCSV,
  parseChannelAvatar,
} from "../lib/subscriptions.ts";
import { parseMeta } from "../lib/youtube-metadata.ts";
const p = (title: string, views: number | null = null) => ({
  id: title,
  title,
  tracks: [],
  views,
});
test("collection scopes separate raw monthly and annual archives from picks and exact series", () => {
  assert.equal(kindOf(p("2026.09")), "monthly");
  assert.equal(kindOf(p("a bundle of songs(2025)")), "monthly");
  assert.equal(kindOf(p("9월의 픽(2026)")), "picks");
  assert.equal(inScope(p("2026.09"), "curation"), false);
  assert.equal(inScope(p("9월의 픽(2026)"), "picks"), true);
  assert.equal(seriesLists.recap.length, 22);
  assert.equal(seriesLists.kawaii.length, 10);
  for (const x of seriesLists.recap) assert.equal(kindOf(x), "recap");
  for (const x of seriesLists.kawaii) assert.equal(kindOf(x), "kawaii");
  assert.equal(yearOf(seriesLists.recap[0]), "2026");
});
test("views sort numerically in both directions and keep unknown values last", () => {
  const input = [p("unknown"), p("many", 13000), p("few", 90)];
  assert.deepEqual(
    [...input]
      .sort((a, b) => comparePlaylists(a, b, "views", "desc"))
      .map((p) => p.title),
    ["many", "few", "unknown"],
  );
  assert.deepEqual(
    [...input]
      .sort((a, b) => comparePlaylists(a, b, "views", "asc"))
      .map((p) => p.title),
    ["few", "many", "unknown"],
  );
});
test("random draw keeps input intact and never repeats a candidate", () => {
  const input = Array.from({ length: 100 }, (_, i) => i);
  for (let i = 0; i < 20; i++) {
    const picked = sampleUnique(input, 10);
    assert.equal(picked.length, 10);
    assert.equal(new Set(picked).size, 10);
    assert.ok(picked.every((n) => input.includes(n)));
  }
  assert.equal(sampleUnique([1, 2], 100).length, 2);
  assert.equal(input[0], 0);
});
test("subscription CSV accepts blank rows, Unicode, quotes and deduplicates channel URLs", () => {
  const text =
    '\uFEFF,,\r\n,채널 URL,채널 제목\r\n,https://www.youtube.com/channel/UC1234567890123456789012,"작은, 채널"\r\n,http://www.youtube.com/channel/UC1234567890123456789012,"새 이름 ""보이스"""\r\n,https://youtube.com/@artist,아티스트\r\n,https://evil.test/channel/UC1234567890123456789012,무시';
  const result = parseSubscriptions(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, '새 이름 "보이스"');
  assert.ok(result[0].url.startsWith("https://www.youtube.com/"));
  assert.deepEqual(parseCSV('"a\nb",c'), [["a\nb", "c"]]);
  assert.throws(() => parseSubscriptions("<html>unavailable</html>"));
  assert.throws(() => parseSubscriptions('"unclosed'));
});
test("channel avatar parser prefers the largest public YouTube thumbnail", () => {
  assert.equal(
    parseChannelAvatar({
      metadata: {
        channelMetadataRenderer: {
          avatar: { thumbnails: [{ url: "small" }, { url: "large" }] },
        },
      },
    }),
    "large",
  );
  assert.equal(parseChannelAvatar({}), null);
});
test("metadata uses custom playlist cover and playlist views, never video statistics", () => {
  const data = {
    microformat: {
      microformatDataRenderer: {
        thumbnail: { thumbnails: [{ url: "small" }, { url: "custom-cover" }] },
      },
    },
    header: { stats: ["조회수 12,345회"] },
    contents: { viewCountText: "조회수 999,999회" },
  };
  assert.deepEqual(parseMeta(data), {
    thumbnail: "custom-cover",
    views: 12345,
  });
  assert.equal(parseMeta({ header: { text: "1.2만회" } }).views, 12000);
  assert.equal(parseMeta({ contents: { text: "12,300 views" } }).views, null);
});
