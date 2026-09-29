"use client";
import { useState } from "react";
import { Trash2, LoaderCircle } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "./ui/alert-dialog";
const descriptions = {
  library:"저장된 재생목록·표지·동기화 기록을 지웁니다. 자동 갱신은 멈추며, 동기화 버튼으로 다시 가져올 수 있어요. 월드컵·곡추천·JSON·CSV 자료는 유지됩니다.",
  json:"채널 보관실의 JSON 채널·태그 목록을 비웁니다. 기본 내장 자료도 다시 나타나지 않으며, JSON을 새로 업로드하면 채울 수 있어요. CSV 구독목록은 유지됩니다.",
  csv:"CSV와 연결된 시트에서 가져온 구독목록을 비웁니다. 새 CSV 업로드 또는 시트 가져오기로 다시 채울 수 있어요. JSON 채널·태그 목록은 유지됩니다.",
};
export default function ResetDataButton({target,label,adminKey,disabled,onReset}:{target:keyof typeof descriptions;label:string;adminKey:string;disabled?:boolean;onReset:()=>void|Promise<void>}) {
  const [open,setOpen] = useState(false), [confirmation,setConfirmation] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  async function reset() {
    if (!adminKey || confirmation !== "초기화") return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reset",{method:"DELETE",headers:{"Content-Type":"application/json","x-soteria-admin-key":adminKey},body:JSON.stringify({target,confirm:target})});
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error || "초기화하지 못했어요.");
      await onReset(); setOpen(false); setConfirmation("");
    } catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);setConfirmation("");setError("");}}}>
    <AlertDialogTrigger asChild><button className="room-button danger" disabled={!adminKey || disabled} title={!adminKey ? "관리 잠금을 먼저 열어 주세요." : undefined}><Trash2 size={16}/>{label}</button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{label}</AlertDialogTitle><AlertDialogDescription>{descriptions[target]} 사이트 이용자 모두에게 적용됩니다.</AlertDialogDescription></AlertDialogHeader>
      <label>계속하려면 ‘초기화’를 입력해 주세요.<input className="reset-confirm-input" aria-label="초기화 확인 문구" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} autoComplete="off"/></label>
      {error && <p role="alert">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><button className="room-button danger" disabled={busy || confirmation!=="초기화" || !adminKey} onClick={()=>void reset()}>{busy ? <LoaderCircle size={16} className="spin"/> : <Trash2 size={16}/>}초기화 실행</button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
