"use client";
import {useEffect,useState} from 'react';
export default function SyncNextAction({done,total,failed,skipped,pending,retryAt,paused,syncing,admin,stage,language}:{done:number;total:number;failed:number;skipped:number;pending:number;retryAt:number;paused:boolean;syncing:boolean;admin:boolean;stage:string;language:'ko'|'en'|'ja'}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const wait=Math.max(0,Math.ceil((retryAt-now)/1000)),success=Math.max(0,done-failed-skipped);
 const en=language==='en',ja=language==='ja';
 const counts=en?`Updated ${success} · unchanged ${skipped} · remaining ${pending} · failed ${failed}`:ja?`更新 ${success}・変更なし ${skipped}・残り ${pending}・失敗 ${failed}`:`갱신 ${success}개 · 변경 없음 ${skipped}개 · 남음 ${pending}개 · 실패 ${failed}개`;
 const action=!admin?(en?'Unlock management to sync. Anyone can refresh the latest monthly Pick.':ja?'同期は管理者用です。最新の月のPickは誰でも更新できます。':'동기화하려면 관리 잠금을 열어 주세요. 최신 월의 픽만 갱신은 누구나 가능합니다.'):
 syncing?(en?'Importing playlists. You can stop and resume later.':ja?'取得中です。停止して後で再開できます。':'목록을 가져오는 중이에요. 중단해도 남은 목록은 보존됩니다.'):
 wait?(en?`Wait ${wait}s before resuming.`:ja?`${wait}秒後に再開できます。`:`${wait}초 뒤 남은 목록을 이어서 가져올 수 있어요.`):
 pending?(en?`Click ${stage==='secondary'?'secondary sync to import the next two playlists':'primary sync to resume'}.`:ja?stage==='secondary'?'2次同期で次の2件を取得できます。':'1次同期で残りを再開できます。':stage==='secondary'?'2차 동기화 버튼으로 다음 2개를 가져오세요.':'1차 큐레이션 동기화 버튼으로 남은 목록을 이어서 가져오세요.'):
 failed?(en?'Click Retry failed playlists. Saved data is preserved.':ja?'失敗したリストの再取得を押してください。保存済みのデータは維持されます。':'실패한 것만 다시 가져오기를 눌러 주세요. 기존 자료는 유지됩니다.'):
 total?(en?'All playlists checked. You can keep listening.':ja?'すべて確認しました。そのまま音楽を楽しめます。':'모든 목록을 확인했어요. 저장된 음악을 계속 들을 수 있습니다.'):
 en?'Choose primary or secondary sync to start.':ja?'1次または2次同期を選んでください。':'1차 또는 2차 동기화를 선택해 시작하세요.';
 return <div className="sync-next-action notranslate" translate="no"><strong>{counts}</strong><p>{action}</p>{paused&&pending>0&&<small>{en?'Paused · queue preserved':ja?'停止中・残りのリストは保存済み':'중단됨 · 남은 목록 보존'}</small>}</div>;
}
