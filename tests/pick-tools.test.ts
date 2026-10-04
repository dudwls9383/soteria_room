import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMonthlyPickIndex} from '../lib/music-index.ts';
import {buildPickChannels} from '../lib/pick-channels.ts';
import {youtubeVideoId} from '../lib/thumbnails.ts';
import type {SmallChannel} from '../lib/small-channels.ts';
import {packLibrary,unpackLibrary} from '../lib/library-wire.ts';
const id='UC'+'a'.repeat(22),other='UC'+'b'.repeat(22),now=Date.now();
const t=(video:string,artist:string,channelId?:string)=>({id:video,title:video,artist,thumbnail:'',channelId});
const roster:SmallChannel[]=[{id,title:'Small',url:'',tags:[],subscribers:99,checkedAt:now,source:'api'},{id:other,title:'Collection only',url:'',tags:[],subscribers:2,checkedAt:now,source:'api'}];
test('monthly channel pool excludes collection-only channels and preserves distinct video counts',()=>{
 const library=[{id:'pick',title:'10월의 픽(2026)',tracks:[t('song','Small',id),t('unknown','Unknown')],updatedAt:now},{id:'collection',title:'2026.10',tracks:[t('outside','Collection only',other),t('song','Small',id)],updatedAt:now}];
 const music=buildMonthlyPickIndex(library);
 const result=buildPickChannels(music,roster,[{id:'song',channelId:id,channelTitle:'Small',views:50,seconds:100,publishedAt:'2026-01-01',availability:'available',checkedAt:now}],100,now);
 assert.equal(result.channels.length,2);assert.ok(!result.channels.some(c=>c.id===other));
 assert.equal(result.channels.find(c=>c.id===id)?.music.length,1);
 assert.equal(result.channels.find(c=>c.title==='Unknown')?.subscribers,null);
 assert.deepEqual(result.music.map(t=>t.id),['song']);
});
test('ambiguous titles are not matched, ID takes precedence, expired and blocked facts do not recommend',()=>{
 const music=buildMonthlyPickIndex([{id:'p',title:'9월의 픽(2026)',tracks:[t('a','Same'),t('b','Small',id)]}]);
 const duplicate=[...roster,{...roster[0],id:'UC'+'c'.repeat(22),title:'Same'},{...roster[0],id:'UC'+'d'.repeat(22),title:'Same'}];
 const result=buildPickChannels(music,duplicate,[{id:'a',views:0,seconds:100,publishedAt:'',availability:'available',checkedAt:now-8*86400000},{id:'b',views:5,seconds:100,publishedAt:'',availability:'restricted',checkedAt:now}],100,now);
 assert.equal(result.channels[0].id,undefined);assert.equal(result.channels[0].subscribers,null);assert.equal(result.music.length,0);
});
test('thumbnail parser accepts supported YouTube links and rejects spoof hosts and playlist-only links',()=>{
 const video='dQw4w9WgXcQ';
 for(const url of [`https://youtu.be/${video}?t=20`,`https://www.youtube.com/watch?v=${video}&list=PLabc`,`https://youtube.com/shorts/${video}`,`https://youtube.com/live/${video}`,video])assert.equal(youtubeVideoId(url),video);
 for(const url of [`https://youtube.com.evil.test/watch?v=${video}`,`https://evil.test/?v=${video}`,`https://youtube.com/playlist?list=PLabc`,'javascript:alert(1)','https://youtu.be/short'])assert.equal(youtubeVideoId(url),null);
});
test('packed library preserves channel IDs and stays compatible with old tuples',()=>{
 const original=[{id:'p',title:'pick',tracks:[t('a','Small',id),t('b','old')],updatedAt:now}];
 const packed=JSON.parse(JSON.stringify(packLibrary(original,now)));
 const restored=unpackLibrary(packed);
 assert.equal(restored[0].tracks[0].channelId,id);assert.equal(restored[0].tracks[1].channelId,undefined);
});
