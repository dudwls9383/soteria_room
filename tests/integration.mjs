import assert from 'node:assert/strict';
const base='http://localhost:5173';
async function post(path,data,cookie=''){const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||cookie};}
const invalid=await post('/api/playlist',{url:'https://example.com/?list=PL123456789abc'});assert.equal(invalid.status,400);
const playlist=await post('/api/playlist',{url:'https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj'});assert.equal(playlist.status,200,JSON.stringify(playlist.data));assert.ok(playlist.data.tracks.length>=2);
const oversized=await post('/api/games',{playlistId:playlist.data.id,size:2048});assert.equal(oversized.status,400);
const before=await(await fetch(base+'/api/ranking')).json();
for(let attempt=0;attempt<2;attempt++){
 const game=await post('/api/games',{playlistId:playlist.data.id,size:4});assert.equal(game.status,200,JSON.stringify(game.data));assert.equal(game.data.tracks.length,4);
 assert.equal((await post('/api/games/'+game.data.id,{winners:[]},game.cookie)).status,400);
 const winners=[game.data.tracks[0].id,game.data.tracks[2].id,game.data.tracks[0].id];
 assert.equal((await post('/api/games/'+game.data.id,{winners})).status,404);
 assert.equal((await post('/api/games/'+game.data.id,{winners},game.cookie)).status,200);
 assert.equal((await post('/api/games/'+game.data.id,{winners},game.cookie)).status,200);
}
const after=await(await fetch(base+'/api/ranking')).json();
const sum=(data,key)=>data.tracks.reduce((n,t)=>n+t[key],0);
assert.equal(sum(after,'crowns')-sum(before,'crowns'),2);
assert.equal(sum(after,'wins')-sum(before,'wins'),6);
assert.equal(sum(after,'appearances')-sum(before,'appearances'),12);
console.log(JSON.stringify({passed:true,imported:playlist.data.tracks.length,checks:['public playlist import','URL validation','insufficient entries','bracket validation','visitor ownership','two users aggregate','duplicate submission idempotency']}));
