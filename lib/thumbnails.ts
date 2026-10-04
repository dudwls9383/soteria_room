export const thumbnailQualities=[
  {id:'maxresdefault',label:'최대 해상도'},
  {id:'sddefault',label:'고해상도'},
  {id:'hqdefault',label:'표준'},
  {id:'mqdefault',label:'중간'},
  {id:'default',label:'작게'},
] as const;
export type ThumbnailQuality=typeof thumbnailQualities[number]['id'];
export function youtubeVideoId(input:string){
  const value=input.trim();
  if(/^[\w-]{11}$/.test(value))return value;
  try{
    const url=new URL(value);
    if(!['https:','http:'].includes(url.protocol))return null;
    const host=url.hostname.toLowerCase(),path=url.pathname.split('/').filter(Boolean);
    let id:string|null=null;
    if(host==='youtu.be')id=path[0]||null;
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)){
      if(path[0]==='watch')id=url.searchParams.get('v');
      else if(['shorts','live','embed'].includes(path[0]))id=path[1]||null;
    }
    return id&&/^[\w-]{11}$/.test(id)?id:null;
  }catch{return null;}
}
export function thumbnailUrl(id:string,quality:ThumbnailQuality){return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;}
