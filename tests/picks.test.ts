import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPicks, dailySample } from "../lib/picks.ts";
import type { MusicRecord } from "../lib/music-index.ts";
const track = (id: string, months: string[]): MusicRecord => ({ id, title: id, artist: "artist", thumbnail: "", months, years: [...new Set(months.map(m => m.slice(0,4)))], scopes: ["all"], collections: [], playlistIds: [], playlists: [], updatedAt: 0 });
const now = new Date("2026-09-27T00:00:00Z");
test("Pick preserves daily ordering independent of input order", () => {
  const items = Array.from({length: 30}, (_, i) => track(String(i), ["2026.09"]));
  assert.deepEqual(dailySample(items, "day"), dailySample([...items].reverse(), "day"));
  assert.notDeepEqual(dailySample(items, "day"), dailySample(items, "next-day"));
});
test("quarter matches the year-month pair and latest month fallback is explicit", () => {
  const items = [track("cross-year", ["2025.08", "2026.01"]), track("correct", ["2026.08"]), track("future", ["2027.01"])];
  const result = buildPicks(items, {year: "2026", quarter: 3}, now);
  assert.equal(result.fallback, true);
  assert.equal(result.sections[0].period, "2026.08");
  assert.deepEqual(result.sections[1].music.map(t => t.id), ["correct"]);
  assert.deepEqual(result.sections[3].music.map(t => t.id), ["cross-year"]);
});
test("empty library and Korean midnight are handled", () => {
  const result = buildPicks([], {}, new Date("2026-09-30T16:00:00Z"));
  assert.equal(result.day, "2026-10-01");
  assert.ok(result.sections.every(s => s.total === 0));
});
