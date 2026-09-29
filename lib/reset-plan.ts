import { emptySync } from "./sync-policy.ts";
export type ResetTarget = "library" | "json" | "csv";
export type ResetStatement = {sql:string;params:(string|number)[]};
// Pure statement plans allow destructive scopes to be verified on an isolated
// database. The API must authenticate and validate before executing any plan.
export function resetPlan(target:ResetTarget, now:number): ResetStatement[] {
  if (target === "library") return [
    {sql:"UPDATE channel_sync SET state=?,owner=NULL,lease_until=0 WHERE id='main'",params:[JSON.stringify({...emptySync(),paused:true})]},
    {sql:"DELETE FROM playlists",params:[]}, {sql:"DELETE FROM playlist_meta",params:[]},
  ];
  if (target === "json") return [{
    sql:"INSERT INTO channel_tag_snapshots (id,dataset,updated_at,source) VALUES ('main',?,?,?) ON CONFLICT(id) DO UPDATE SET dataset=excluded.dataset,updated_at=excluded.updated_at,source=excluded.source",
    params:[JSON.stringify({channels:{},tags:{},collections:{},picksCategories:[]}),now,"초기화됨"],
  }];
  return [{sql:"DELETE FROM subscription_snapshots WHERE id='main'",params:[]}];
}
