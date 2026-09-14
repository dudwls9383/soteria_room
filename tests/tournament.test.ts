import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluate,randomTracks} from '../lib/tournament.ts';
import {playlistId,parseInitialData,extractTracks} from '../lib/youtube.ts';
const tracks=Array.from({length:2048},(_,i)=>({id:String(i),title:`Track ${i}`,artist:'Artist',thumbnail:''}));
for(const size of [2,4,8,32,2048])test(`${size} entrants produce exactly n-1 wins, one champion and valid appearances`,()=>{
 let queue=tracks.slice(0,size).map(t=>t.id),winners:string[]=[];
 while(queue.length>1){queue=queue.filter((_,i)=>i%2===0);winners.push(...queue);}
 const result=evaluate(tracks.slice(0,size),winners);
 assert.equal(result.reduce((n,t)=>n+t.wins,0),size-1);
 assert.equal(result.reduce((n,t)=>n+t.appearances,0),2*(size-1));
 assert.equal(result.reduce((n,t)=>n+t.crowns,0),1);
 assert.equal(result[0].wins,Math.log2(size));
});
test('incomplete and forged brackets are rejected',()=>{assert.throws(()=>evaluate(tracks.slice(0,4),['0']));assert.throws(()=>evaluate(tracks.slice(0,4),['2','2','2']));});
test('random selection stays unique and in the imported playlist',()=>{const chosen=randomTracks(tracks,64);assert.equal(new Set(chosen.map(t=>t.id)).size,64);assert.ok(chosen.every(t=>tracks.includes(t)));});
test('only YouTube playlist URLs pass validation',()=>{assert.equal(playlistId('https://music.youtube.com/playlist?list=PL123456789abc'),'PL123456789abc');for(const bad of ['http://localhost/?list=PL123456789abc','https://youtube.com.evil.test/?list=PL123456789abc','https://www.youtube.com/watch?v=gdZLi9oWNZg'])assert.throws(()=>playlistId(bad));});
test('public page parser handles braces in strings and both renderer formats',()=>{
 const initial=parseInitialData('<script>var ytInitialData = {"contents":{"playlistVideoRenderer":{"videoId":"gdZLi9oWNZg","title":{"runs":[{"text":"hello } world"}]},"isPlayable":true}}};</script>');
 assert.equal(extractTracks(initial).tracks[0].title,'hello } world');
 const modern={contents:{lockupViewModel:{contentId:'phuiiNCxRMg',contentType:'LOCKUP_CONTENT_TYPE_VIDEO',metadata:{lockupMetadataViewModel:{title:{content:'Supernova'}}}}}};
 assert.equal(extractTracks(modern).tracks[0].id,'phuiiNCxRMg');
});
