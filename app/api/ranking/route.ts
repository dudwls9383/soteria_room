import { database } from "../../../db";
import { failure } from "../../../lib/server";
export async function GET(){try{
 const data=await database().prepare(`SELECT
  json_extract(j.value,'$.id') AS id, json_extract(j.value,'$.title') AS title,
  json_extract(j.value,'$.artist') AS artist, json_extract(j.value,'$.thumbnail') AS thumbnail,
  SUM(json_extract(j.value,'$.wins')) AS wins, SUM(json_extract(j.value,'$.appearances')) AS appearances,
  SUM(json_extract(j.value,'$.crowns')) AS crowns, COUNT(*) AS games
  FROM games g, json_each(g.results) j WHERE g.completed_at IS NOT NULL
  GROUP BY json_extract(j.value,'$.id') ORDER BY crowns DESC, wins DESC`).all();
 return Response.json({tracks:data.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
