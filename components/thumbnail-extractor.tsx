"use client";
import {useState,type FormEvent} from 'react';
import {Copy,Download,ExternalLink,ImageIcon} from 'lucide-react';
import {thumbnailQualities,thumbnailUrl,youtubeVideoId} from '../lib/thumbnails';
import {useAutoDismissMessage} from './use-auto-dismiss-message';
type Size={width:number;height:number;missing?:boolean};
export default function ThumbnailExtractor(){
  const [input,setInput]=useState(''),[id,setId]=useState(''),[sizes,setSizes]=useState<Record<string,Size>>({}),[error,setError]=useState('');
  const [notice,setNotice]=useAutoDismissMessage();
  function extract(e:FormEvent){e.preventDefault();const next=youtubeVideoId(input);if(!next){setError('YouTube 영상 주소를 입력해 주세요. 재생목록 주소만으로는 추출할 수 없어요.');return;}setError('');if(next!==id)setSizes({});setId(next);setNotice('');}
  return <div className="thumbnail-room"><div className="room-heading"><div><div className="room-eyebrow">YOUTUBE THUMBNAILS</div><h1>영상의 첫인상을 꺼내기.</h1><p>YouTube 영상 주소를 넣고, 썸네일을 크기별로 확인하거나 저장하세요.</p></div></div>
    <form className="thumbnail-form glass" onSubmit={extract}><label htmlFor="thumbnail-url">YouTube 영상 주소</label><div><input id="thumbnail-url" value={input} onChange={e=>setInput(e.target.value)} placeholder="https://youtu.be/… 또는 영상 ID" required/><button className="room-button" type="submit"><ImageIcon size={16}/>썸네일 추출</button></div><p className="pick-reason">일반 영상 · Shorts · 라이브 주소를 지원해요. 영상에 따라 최대 해상도 이미지가 없을 수 있어요.</p></form>
    {error&&<p className="room-message error" role="alert">{error}</p>}{notice&&<p className="room-message" role="status">{notice}</p>}
    {id&&<div className="thumbnail-grid">{thumbnailQualities.map(q=>{const image=thumbnailUrl(id,q.id),size=sizes[q.id],available=size&&!size.missing;return <article className="thumbnail-card glass" key={`${id}:${q.id}`}><div className="thumbnail-preview">{size?.missing?<p>이 크기의 썸네일이 없어요.</p>:<img src={image} alt={`${q.label} YouTube 썸네일`} onLoad={e=>{const img=e.currentTarget;setSizes(s=>({...s,[q.id]:{width:img.naturalWidth,height:img.naturalHeight,missing:q.id!=='default'&&img.naturalWidth<=120}}));}} onError={()=>setSizes(s=>({...s,[q.id]:{width:0,height:0,missing:true}}))}/>}</div><div className="thumbnail-card-copy"><h2>{q.label}</h2><p>{size?.missing?'다른 크기를 선택해 주세요.':available?`${size.width} × ${size.height}`:'이미지 확인 중…'}</p><div className="thumbnail-actions">{available&&<><a className="room-button" href={`/api/thumbnail?video=${id}&quality=${q.id}`} download={`youtube-${id}-${q.id}.jpg`}><Download size={14}/>저장</a><a className="room-button subtle" href={image} target="_blank" rel="noreferrer"><ExternalLink size={14}/>원본 보기</a></>}<button className="room-button subtle" disabled={!available} onClick={async()=>{try{await navigator.clipboard.writeText(image);setNotice('썸네일 주소를 복사했어요.');}catch{setError('주소 복사에 실패했어요. 원본 보기에서 주소를 복사해 주세요.');}}}><Copy size={14}/>주소 복사</button></div></div></article>;})}</div>}
  </div>;
}
