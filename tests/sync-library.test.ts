import test from "node:test";
import assert from "node:assert/strict";
import { emptySync, syncAction, SYNC_DAY, SYNC_RETRY_DELAY } from "../lib/sync-policy.ts";
import { packLibrary, unpackLibrary } from "../lib/library-wire.ts";
import { reconcileTranslation } from "../lib/live-translation.ts";
import { canSkipPlaylist } from "../lib/sync-policy.ts";
import { resetPlan } from "../lib/reset-plan.ts";
import { DatabaseSync } from "node:sqlite";
import { parseMeta } from "../lib/youtube-metadata.ts";
import { extractChannelPage } from "../lib/channel.ts";

test("unchanged hints skip only fresh, fully identified playlists", () => {
  const now=20*SYNC_DAY, item={id:"a",title:"A",thumbnail:"",count:12,firstId:"first"};
  const saved={count:12,firstId:"first",updatedAt:now-SYNC_DAY};
  assert.equal(canSkipPlaylist(item,saved,now),true);
  for(const changed of [{...item,count:13},{...item,firstId:"new"},{...item,count:undefined}]) assert.equal(canSkipPlaylist(changed,saved,now),false);
  assert.equal(canSkipPlaylist(item,{...saved,updatedAt:now-7*SYNC_DAY},now),false);
  assert.equal(canSkipPlaylist(item,undefined,now),false);
});
test("modern channel count and first video are extracted without rounded guesses", () => {
  const lockupViewModel={contentType:"LOCKUP_CONTENT_TYPE_PLAYLIST",contentId:"playlist",contentImage:{collectionThumbnailViewModel:{primaryThumbnail:{thumbnailViewModel:{overlays:[{thumbnailOverlayBadgeViewModel:{thumbnailBadges:[{thumbnailBadgeViewModel:{text:"동영상 1,234개"}}]}}]}}}},rendererContext:{commandContext:{onTap:{innertubeCommand:{watchEndpoint:{videoId:"first"}}}}}};
  const result=extractChannelPage({lockupViewModel});
  assert.equal(result.items[0].count,1234); assert.equal(result.items[0].firstId,"first");
});
test("custom header cover wins over a first-video thumbnail", () => {
  const custom="https://i.ytimg.com/pl_c/custom/signed.jpg?token=example";
  assert.equal(parseMeta({header:{pageHeaderRenderer:{content:{pageHeaderViewModel:{heroImage:{contentPreviewImageViewModel:{image:{sources:[{url:custom}]}}}}}}},microformat:{microformatDataRenderer:{thumbnail:{thumbnails:[{url:"first-video"}]}}}}).thumbnail,custom);
});
test("reset scopes are isolated and library reset revokes an active sync", () => {
  for(const target of ["library","json","csv"] as const) {
    const db=new DatabaseSync(":memory:");
    db.exec("CREATE TABLE playlists(id TEXT); INSERT INTO playlists VALUES('saved'); CREATE TABLE playlist_meta(id TEXT); INSERT INTO playlist_meta VALUES('saved'); CREATE TABLE channel_sync(id TEXT,state TEXT,owner TEXT,lease_until INTEGER); INSERT INTO channel_sync VALUES('main','{}','worker',123); CREATE TABLE channel_tag_snapshots(id TEXT PRIMARY KEY,dataset TEXT,updated_at INTEGER,source TEXT); INSERT INTO channel_tag_snapshots VALUES('main','{\"channels\":{\"a\":{}}}',1,'import'); CREATE TABLE subscription_snapshots(id TEXT); INSERT INTO subscription_snapshots VALUES('main'); CREATE TABLE games(id TEXT); INSERT INTO games VALUES('keep');");
    for(const statement of resetPlan(target,100)) db.prepare(statement.sql).run(...statement.params);
    const count=(table:string)=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n;
    assert.equal(count("playlists"),target==="library"?0:1);
    assert.equal(count("playlist_meta"),target==="library"?0:1);
    assert.equal(count("subscription_snapshots"),target==="csv"?0:1);
    assert.equal(count("channel_tag_snapshots"),1); assert.equal(count("games"),1);
    if(target==="json") assert.deepEqual(JSON.parse(db.prepare("SELECT dataset FROM channel_tag_snapshots").get()!.dataset as string).channels,{});
    if(target==="library") {const row=db.prepare("SELECT * FROM channel_sync").get()!;assert.equal(row.owner,null);assert.equal(row.lease_until,0);assert.equal(JSON.parse(row.state as string).paused,true);}
    db.close();
  }
});

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
