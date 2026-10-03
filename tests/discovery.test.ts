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
import { buildMusicIndex, buildMonthlyPickIndex, filterMusicIndex } from "../lib/music-index.ts";
import { matchesBand, subscriberBands, subscriberNumber, officialSubscriberCount } from "../lib/small-channels.ts";
test("Digging Picks exclude collection-only songs and collection dates on shared songs", () => {
  const track = (id:string) => ({id,title:id,artist:"artist",thumbnail:""});
  const playlists = [
    {id:"pick",title:"10월의 픽(2026)",tracks:[track("shared"),track("pick-only")]},
    {id:"collection",title:"2024.01",tracks:[track("shared"),track("collection-only")]},
    {id:"annual",title:"a bundle of songs",tracks:[track("annual-only")]},
    {id:"other",title:"Other curation",tracks:[track("other-only")]},
  ];
  const result = buildMonthlyPickIndex(playlists);
  assert.deepEqual(result.map(t=>t.id).sort(),["pick-only","shared"]);
  assert.deepEqual(result.find(t=>t.id==="shared")!.months,["2026.10"]);
  assert.deepEqual(result.find(t=>t.id==="shared")!.years,["2026"]);
  assert.equal(buildMusicIndex(playlists).length,5);
});
test("subscriber boundaries have no overlap; unknown is not zero",()=>{
  for(const count of [0,99,100,499,500,999,1000,1999,2000,4999,5000,9999]) {
    assert.equal(subscriberBands.filter(b=>matchesBand(count,b.id)).length,1);
    assert.equal(matchesBand(count,"all"),true);
  }
  assert.equal(matchesBand(10000,"all"),false);
  assert.equal(matchesBand(9999,"10000plus"),false);
  assert.equal(matchesBand(10000,"10000plus"),true);
  assert.equal(matchesBand(1000000,"10000plus"),true);
  assert.equal(matchesBand(null,"10000plus"),false);
  for(const value of [null,0,9999,10000,1000000]) assert.equal(matchesBand(value,"everything"),true);
  assert.equal(matchesBand(null,"0"),false);
  assert.equal(matchesBand(null,"unknown"),true);
  assert.equal(subscriberNumber("0"),0);
  assert.equal(subscriberNumber("1,234"),1234);
  for(const invalid of [null,undefined,"","hidden","1.2K",-1,NaN]) assert.equal(subscriberNumber(invalid),null);
});
test("official private or missing subscriber counts remain unknown",()=>{
  assert.equal(officialSubscriberCount({statistics:{hiddenSubscriberCount:true,subscriberCount:"0"}}),null);
  assert.equal(officialSubscriberCount(undefined),null);
  assert.equal(officialSubscriberCount({statistics:{subscriberCount:"0"}}),0);
  assert.equal(officialSubscriberCount({statistics:{subscriberCount:"9999"}}),9999);
});
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
import { buildChannelTagDataset } from "../lib/channel-tags.ts";

test("channel tag JSON import merges extension tags and metadata", () => {
  const dataset = buildChannelTagDataset(
    {
      ASMR: ["UC1234567890123456789012", "UC1234567890123456789012"],
      ASMR_ysm_1: ["UCabcdefghijklmnopqrstuv"],
      KawaVo: ["UCabcdefghijklmnopqrstuv"],
      ysc_channel_metadata: {
        UC1234567890123456789012: { title: "ASMR One", img: "avatar" },
      },
      ysc_subs_count: {
        UC1234567890123456789012: { sc: "1200", t: ["Music"] },
      },
    },
    "fixture.json",
  );
  assert.equal(dataset.collections.ASMR.length, 2);
  assert.equal(dataset.collections.KawaVo.length, 1);
  assert.equal(dataset.channels.UC1234567890123456789012.title, "ASMR One");
  assert.equal(
    dataset.channels.UC1234567890123456789012.subscriberCount,
    "1200",
  );
});

test("music index deduplicates tracks and keeps playlist context", () => {
  const shared = {
    id: "song-1",
    title: "Shared Song",
    artist: "Singer",
    thumbnail: "thumb",
  };
  const index = buildMusicIndex([
    {
      id: "monthly",
      title: "2026.09",
      tracks: [shared],
      updatedAt: 10,
    },
    {
      id: "pick",
      title: "9월의 픽(2026)",
      tracks: [shared, { ...shared, id: "song-2", title: "Pick Only" }],
      updatedAt: 20,
    },
  ]);
  assert.equal(index.length, 2);
  const first = index.find((item) => item.id === "song-1")!;
  assert.deepEqual(first.playlistIds.sort(), ["monthly", "pick"]);
  assert.ok(first.scopes.includes("picks"));
  assert.ok(first.scopes.includes("monthly"));
  assert.deepEqual(
    filterMusicIndex(index, { scope: "picks" })
      .map((item) => item.id)
      .sort(),
    ["song-1", "song-2"],
  );
  assert.deepEqual(
    filterMusicIndex(index, { scope: "monthly" }).map((item) => item.id),
    ["song-1"],
  );
  assert.equal(filterMusicIndex(index, { q: "shared" }).length, 1);
});
