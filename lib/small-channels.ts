export const subscriberBands = [
  {id:"0",label:"0–99명",min:0,max:100},
  {id:"100",label:"100–499명",min:100,max:500},
  {id:"500",label:"500–999명",min:500,max:1000},
  {id:"1000",label:"1,000–1,999명",min:1000,max:2000},
  {id:"2000",label:"2,000–4,999명",min:2000,max:5000},
  {id:"5000",label:"5,000–9,999명",min:5000,max:10000},
];
export type SmallChannel = {id:string;title:string;url:string;avatar?:string;tags:string[];subscribers:number|null;checkedAt:number|null;source:"api"|"json"|"unknown"};
// Missing, private or malformed counts are never silently interpreted as zero.
export function subscriberNumber(value:unknown):number|null {
  if(typeof value !== "string" && typeof value !== "number") return null;
  const text=String(value).trim().replaceAll(",","");
  if(!/^\d+$/.test(text)) return null;
  const number=Number(text);
  return Number.isSafeInteger(number) && number>=0 ? number : null;
}
export function matchesBand(count:number|null, band:string) {
  if(band === "everything") return true;
  if(band === "unknown") return count === null;
  if(count === null) return false;
  if(band === "10000plus") return count >= 10000;
  if(band === "all") return count < 10000;
  const selected=subscriberBands.find(b=>b.id === band);
  return !!selected && count>=selected.min && count<selected.max;
}
export function officialSubscriberCount(item:any) {
  return !item || item.statistics?.hiddenSubscriberCount ? null : subscriberNumber(item.statistics?.subscriberCount);
}
