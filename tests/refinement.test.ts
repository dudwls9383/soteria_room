import test from "node:test";
import assert from "node:assert/strict";
import {seasonalCover,isSeasonalCover} from "../lib/music-cover.ts";
import {translateCounts} from "../lib/translate-counts.ts";
import {youtubeVideoId} from "../lib/thumbnails.ts";
import {emptySync,syncCooldown,SECONDARY_STEP_DELAY} from "../lib/sync-policy.ts";
import {mergeAdditions,monthStart} from '../lib/recent-additions.ts';
import {unseenBottles,bottleKey} from '../lib/bottle-draw.ts';

test('bottle draws exclude duplicate video URLs and already drawn songs until an explicit restart',()=>{
 const items=[{id:'a',url:'https://youtu.be/dQw4w9WgXcQ'},{id:'b',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},{id:'c',url:'https://youtu.be/gdZLi9oWNZg'}];
 assert.deepEqual(unseenBottles(items,[]).map(x=>x.id),['a','c']);
 assert.deepEqual(unseenBottles(items,[bottleKey(items[0])]).map(x=>x.id),['c']);
 assert.equal(unseenBottles(items,items.map(bottleKey)).length,0);
 assert.equal(unseenBottles([...items,{id:'new',url:'https://youtu.be/phuiiNCxRMg'}],items.map(bottleKey)).length,1);
});
test('new songs track membership changes, never a baseline, reorder, or removed song',()=>{
 const t=(id:string)=>({id,title:id,artist:'a',thumbnail:''}),a=t('a'),b=t('b'),c=t('c');
 assert.deepEqual(mergeAdditions(null,[a,b],[],100),[]);
 assert.deepEqual(mergeAdditions([a,b],[b,a],[],100),[]);
 const added=mergeAdditions([a,b],[b,c,c,a],[],100);
 assert.deepEqual(added,[{track:c,at:100}]);
 assert.deepEqual(mergeAdditions([a,b,c],[b,a],added,200),[]);
 assert.deepEqual(mergeAdditions([a,b],[a,b,c],[],300),[{track:c,at:300}]);
 assert.deepEqual(mergeAdditions(null,[c],added,400),[]);
 assert.equal(monthStart(Date.parse('2026-09-30T15:00:00Z')),Date.parse('2026-09-30T15:00:00Z'));
 assert.equal(monthStart(Date.parse('2026-10-31T14:59:59Z')),Date.parse('2026-09-30T15:00:00Z'));
});

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
