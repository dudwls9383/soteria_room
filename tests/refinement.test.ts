import test from "node:test";
import assert from "node:assert/strict";
import {seasonalCover,isSeasonalCover} from "../lib/music-cover.ts";
import {translateCounts} from "../lib/translate-counts.ts";
import {youtubeVideoId} from "../lib/thumbnails.ts";
import {emptySync,syncCooldown,SECONDARY_STEP_DELAY} from "../lib/sync-policy.ts";

test("Recap Open Graph accepts original seasonal assets regardless of attribute order",()=>{
  const image="https://www.gstatic.com/music/listening_review/SUMMER_2026_544x544.png";
  assert.equal(seasonalCover(`<meta content='${image}' property='og:image'>`),image);
  assert.equal(seasonalCover(`<meta property="og:image" content="${image}">`),image);
  for(const url of ['https://www.gstatic.com.evil.test/music/listening_review/a.png','https://www.gstatic.com/other/a.png','http://www.gstatic.com/music/listening_review/a.png']) {
    assert.equal(isSeasonalCover(url),false);assert.equal(seasonalCover(`<meta property="og:image" content="${url}">`),null);
  }
});
test("numeric UI labels translate while song titles stay intact",()=>{
  assert.equal(translateCounts('10월','en'),'Month 10');assert.equal(translateCounts('4분기','ja'),'第4四半期');
  assert.equal(translateCounts('1,945곡','en'),'1,945 songs');
  assert.equal(translateCounts('봄 테마','en'),'Spring theme');
  assert.equal(translateCounts('彗&sekai 첫 곡 재생','ja'),'彗&sekaiの最初の曲を再生');
  assert.equal(translateCounts('10월의 픽(2026)','en'),'10월의 픽(2026)');
  assert.equal(translateCounts('봄을 기다려','ja'),'봄을 기다려');
});
test("bottle metadata input accepts YouTube videos, never proxy host lookalikes",()=>{
  for(const value of ['https://youtu.be/dQw4w9WgXcQ','https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://music.youtube.com/watch?v=dQw4w9WgXcQ'])assert.equal(youtubeVideoId(value),'dQw4w9WgXcQ');
  for(const value of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://evil.test/?v=dQw4w9WgXcQ','file:///watch?v=dQw4w9WgXcQ'])assert.equal(youtubeVideoId(value),null);
});
test("secondary cooldown survives serialization and leaves primary sync unaffected",()=>{
  const now=10000,state=JSON.parse(JSON.stringify({...emptySync(),nextStepAt:now+SECONDARY_STEP_DELAY}));
  assert.equal(syncCooldown(state,now,"secondary"),now+SECONDARY_STEP_DELAY);
  assert.equal(syncCooldown(state,now,"primary"),0);
  assert.equal(syncCooldown(state,now+SECONDARY_STEP_DELAY,"secondary"),0);
});
