import test from "node:test";
import assert from "node:assert/strict";
import { emptySync, syncAction, SYNC_DAY, SYNC_RETRY_DELAY } from "../lib/sync-policy.ts";
import { packLibrary, unpackLibrary } from "../lib/library-wire.ts";
import { reconcileTranslation } from "../lib/live-translation.ts";

test("translation never restores old loading text or counts after a React update", () => {
  const translate = (source:string) => source.replace("곡"," songs");
  let record = reconcileTranslation("0곡",undefined,translate);
  assert.equal(record.rendered,"0 songs");
  record = reconcileTranslation("221곡",record,translate);
  assert.equal(record.rendered,"221 songs");
  record = reconcileTranslation(record.rendered,record,source => source);
  assert.equal(record.rendered,"221곡");
  record = reconcileTranslation("191곡",record,source => source);
  assert.equal(record.rendered,"191곡");
});

test("daily sync cannot be bypassed by retry; unfinished queues resume across days", () => {
  const now = SYNC_DAY * 10;
  const state = {...emptySync(), startedAt:now, finishedAt:now,lastSuccessAt:now};
  assert.equal(syncAction(emptySync(),now,false),"discover");
  assert.equal(syncAction(state,now + SYNC_DAY - 1,true),"cached");
  assert.equal(syncAction(state,now + SYNC_DAY,false),"discover");
  state.pending = [{id:"fixed-source",title:"source",thumbnail:""}];
  assert.equal(syncAction(state,now + SYNC_DAY * 2,false),"continue");
});
test("only failed sync items are eligible for retry, after the cooldown", () => {
  const now = SYNC_DAY * 10;
  const state = {...emptySync(), startedAt:now,finishedAt:now,failures:[{id:"failed",title:"failed",thumbnail:"",error:"timeout"}]};
  assert.equal(syncAction(state,now + SYNC_RETRY_DELAY - 1,true),"cached");
  assert.equal(syncAction(state,now + SYNC_RETRY_DELAY,true),"retry");
  assert.equal(syncAction(state,now + SYNC_RETRY_DELAY,false),"cached");
});
test("compact library round-trips duplicates, alternate titles, custom images and empty lists", () => {
  const track = {id:"abcdefghijk",title:"曲 제목",artist:"Artist",thumbnail:"https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"};
  const library = [
    {id:"a",title:"A",tracks:[track,{...track,title:"Alternate",thumbnail:"https://example.com/custom.jpg"}],updatedAt:100,thumbnail:"custom-cover",views:null},
    {id:"b",title:"B",tracks:[track],updatedAt:200},
    {id:"c",title:"Empty",tracks:[],updatedAt:300},
  ];
  const packed = packLibrary(library,300);
  assert.equal(packed.songs.length,2);
  assert.deepEqual(unpackLibrary(JSON.parse(JSON.stringify(packed))),library);
  assert.ok(JSON.stringify(packed).length < JSON.stringify({playlists:library}).length);
});
