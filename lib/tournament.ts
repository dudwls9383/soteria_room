import type { Track } from "./music";
export function randomTracks(tracks:Track[],size:number){const copy=[...tracks];for(let i=copy.length-1;i>0;i--){const values=new Uint32Array(1);crypto.getRandomValues(values);const j=Math.floor(values[0]/4294967296*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy.slice(0,size);}
export function evaluate(tracks:Track[],winners:unknown){
 if(!Array.isArray(winners)||winners.length!==tracks.length-1||winners.some(w=>typeof w!=='string'))throw new Error('모든 맞대결을 끝낸 뒤 결과를 저장해 주세요.');
 const result=new Map(tracks.map(t=>[t.id,{...t,wins:0,appearances:0,crowns:0,games:1}]));
 let queue=tracks.map(t=>t.id),cursor=0;
 while(queue.length>1){const next:string[]=[];for(let i=0;i<queue.length;i+=2){const a=queue[i],b=queue[i+1],winner=winners[cursor++];if(winner!==a&&winner!==b)throw new Error('대진과 선택 기록이 맞지 않아요.');result.get(a)!.appearances++;result.get(b)!.appearances++;result.get(winner)!.wins++;next.push(winner);}queue=next;}
 result.get(queue[0])!.crowns=1;
 return [...result.values()];
}
