import { database } from "../db";
import { currentDataset } from "./channel-dataset";
import { subscriberNumber, type SmallChannel } from "./small-channels";
import type { Channel } from "./subscriptions";
export const STATS_TTL=7*86400000;
export async function ensureChannelStats() {
  await database().prepare("CREATE TABLE IF NOT EXISTS channel_statistics (id TEXT PRIMARY KEY, subscribers INTEGER, avatar TEXT, checked_at INTEGER NOT NULL)").run();
  await database().prepare("CREATE TABLE IF NOT EXISTS channel_statistics_lock (id TEXT PRIMARY KEY, owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0)").run();
  await database().prepare("INSERT OR IGNORE INTO channel_statistics_lock (id) VALUES ('main')").run();
}
export async function smallChannelPool() {
  await ensureChannelStats();
  const {dataset,updatedAt}=await currentDataset();
  await database().prepare("CREATE TABLE IF NOT EXISTS subscription_snapshots (id TEXT PRIMARY KEY, channels TEXT NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL)").run();
  const saved=await database().prepare("SELECT channels FROM subscription_snapshots WHERE id='main'").first<{channels:string}>();
  // CSV is the roster when present; JSON is a fallback and enriches matching IDs.
  const roster:Channel[]=saved ? JSON.parse(saved.channels) : Object.entries(dataset.channels).map(([id,c])=>({id,title:c.title,url:`https://www.youtube.com/channel/${id}`}));
  const stats=await database().prepare("SELECT * FROM channel_statistics").all<{id:string;subscribers:number|null;avatar:string|null;checked_at:number}>();
  const byId=new Map(stats.results.map(c=>[c.id,c]));
  const tags=new Map<string,Set<string>>();
  for(const [tag,ids] of Object.entries(dataset.collections)) for(const id of ids) {if(!tags.has(id)) tags.set(id,new Set());tags.get(id)!.add(tag);}
  const channels:SmallChannel[]=[...new Map(roster.map(c=>[c.id,c])).values()].map(c=>{
    const meta=dataset.channels[c.id],stat=byId.get(c.id);
    const count=stat ? stat.subscribers : subscriberNumber(meta?.subscriberCount);
    return {...c,avatar:stat?.avatar || meta?.avatar || c.avatar,tags:[...(tags.get(c.id)||[])],subscribers:count,checkedAt:stat?.checked_at || (count!==null ? updatedAt : null),source:stat ? "api" : count!==null ? "json" : "unknown"};
  });
  const due=channels.filter(c=>/^UC[\w-]{22}$/.test(c.id) && (!byId.has(c.id) || Date.now()-byId.get(c.id)!.checked_at>=STATS_TTL));
  return {channels,due,rosterSource:saved ? "CSV 구독목록" : "JSON 채널목록"};
}
