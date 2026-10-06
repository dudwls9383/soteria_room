// Recaps expose original seasonal art in Open Graph, without ytInitialData.
export function seasonalCover(html:string):string|null {
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    const attributes=new Map([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),m[3]]));
    if(attributes.get("property")!=="og:image")continue;
    const image=(attributes.get("content")||"").replace(/&amp;/g,"&");
    if(isSeasonalCover(image))return image;
  }
  return null;
}
export function isSeasonalCover(image:string){try{const url=new URL(image);return url.protocol==="https:"&&url.hostname==="www.gstatic.com"&&url.pathname.startsWith("/music/listening_review/");}catch{return false;}}
