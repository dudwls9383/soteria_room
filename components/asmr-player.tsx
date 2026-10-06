"use client";
import { useEffect, useRef, useState } from "react";
import { Headphones, Upload, Play, Pause, Repeat2, Volume2, X, Check } from "lucide-react";
import { AsmrAudio, audioTime, emptyDeck, validLoop, type Ear, type DeckState } from "../lib/asmr-audio";
import { useRoomAudio } from "./room-experience";

const copy = {
  ko: { title:"좌우 ASMR 플레이어", intro:"서로 다른 음원을 왼쪽과 오른쪽에. 헤드폰으로 들어보세요.", steps:["음원 준비","좌우 배치","감상"], left:"왼쪽", right:"오른쪽", select:"음원 고르기", replace:"파일 교체", preparing:"음원 확인 중…", formats:"MP3 · WAV · M4A / 브라우저가 지원하는 오디오", local:"파일은 서버에 업로드하지 않아요. 새로고침하면 선택한 파일은 사라집니다.", next:"좌우 배치 확인", mono:"각 음원의 좌우 소리를 모노로 합친 뒤, 지정한 한쪽 귀로만 보냅니다.", route:"모노", ready:"재생 준비 완료", start:"플레이어 열기", bothPlay:"함께 재생", bothPause:"함께 일시정지", play:"재생", pause:"일시정지", seek:"재생 위치", volume:"음량", loop:"A/B 구간 반복", markA:"현재 위치를 A로", markB:"현재 위치를 B로", reset:"구간 초기화", loopHint:"A는 시작, B는 끝입니다. 0.25초 이상인 구간을 지정해 주세요.", close:"음원 모두 닫기", error:"이 파일을 재생하지 못했어요. 다른 음원이나 MP3·WAV 파일로 시도해 주세요. 기존 음원은 유지됩니다.", playError:"재생을 시작하지 못했어요. 재생 버튼을 다시 눌러 주세요.", paused:"일시정지", playing:"재생 중", replacement:"교체한 쪽은 처음부터 일시정지 상태로 준비돼요. 반대쪽은 그대로 재생됩니다.", back:"음원 준비로", empty:"이쪽에서 들을 음원을 골라 주세요.", unsupported:"이 브라우저에서는 좌우 오디오 재생을 지원하지 않아요. 최신 Chrome·Edge·Safari로 시도해 주세요." },
  en: { title:"Dual ASMR player", intro:"Two recordings, one for each ear. Listen with headphones.", steps:["Choose audio","Place left / right","Listen"], left:"Left", right:"Right", select:"Choose audio", replace:"Replace file", preparing:"Checking audio…", formats:"MP3 · WAV · M4A / browser-supported audio", local:"Files stay on your device. Reloading clears your selection.", next:"Check ear placement", mono:"Each recording is mixed to mono first, then sent to its assigned ear.", route:"Mono", ready:"Ready to play", start:"Open player", bothPlay:"Play both", bothPause:"Pause both", play:"Play", pause:"Pause", seek:"Playback position", volume:"Volume", loop:"Repeat A/B region", markA:"Set A here", markB:"Set B here", reset:"Reset region", loopHint:"A is the start; B is the end. Choose a region of at least 0.25 seconds.", close:"Close both files", error:"Unable to play this file. Try another recording or an MP3/WAV file. Your previous recording is kept.", playError:"Playback could not start. Press Play again.", paused:"Paused", playing:"Playing", replacement:"A replacement is paused at the beginning. The other side keeps playing.", back:"Back to audio selection", empty:"Choose a recording for this ear.", unsupported:"This browser does not support dual audio playback. Try an up-to-date Chrome, Edge or Safari." },
  ja: { title:"左右ASMRプレーヤー", intro:"別々の音源を左耳と右耳へ。ヘッドホンでお楽しみください。", steps:["音源を選ぶ","左右に配置","聴く"], left:"左", right:"右", select:"音源を選ぶ", replace:"ファイルを変更", preparing:"音源を確認中…", formats:"MP3 · WAV · M4A / ブラウザ対応の音声", local:"ファイルはアップロードされません。再読み込みすると選択は解除されます。", next:"左右の配置を確認", mono:"各音源の左右の音をモノラルにまとめてから、指定した片耳に送ります。", route:"モノラル", ready:"再生準備完了", start:"プレーヤーを開く", bothPlay:"同時に再生", bothPause:"同時に一時停止", play:"再生", pause:"一時停止", seek:"再生位置", volume:"音量", loop:"A/B区間リピート", markA:"現在位置をAに", markB:"現在位置をBに", reset:"区間をリセット", loopHint:"Aは開始、Bは終了です。0.25秒以上の区間を指定してください。", close:"両方の音源を閉じる", error:"このファイルを再生できません。別の音源やMP3・WAVでお試しください。元の音源は保持されます。", playError:"再生を開始できませんでした。もう一度再生を押してください。", paused:"一時停止中", playing:"再生中", replacement:"変更した側は先頭で一時停止します。反対側はそのまま再生を続けます。", back:"音源選択に戻る", empty:"この耳で聴く音源を選んでください。", unsupported:"このブラウザは左右の音声再生に対応していません。最新のChrome・Edge・Safariでお試しください。" },
};
const ears: Ear[] = ["left", "right"];
export default function AsmrPlayer({ language }: { language: "ko" | "en" | "ja" }) {
  const t = copy[language], roomAudio = useRoomAudio();
  const [step, setStep] = useState(1), [states, setStates] = useState<Record<Ear,DeckState>>({left:emptyDeck(),right:emptyDeck()});
  const [errors,setErrors] = useState<Partial<Record<Ear,string>>>({}), [notice,setNotice] = useState("");
  const engine = useRef<AsmrAudio | null>(null), inputs = useRef<Partial<Record<Ear,HTMLInputElement | null>>>({});
  const ready = ears.every(side => states[side].name && !states[side].loading);
  const getEngine = () => engine.current ||= new AsmrAudio(setStates);
  useEffect(() => {
    const pause = () => engine.current?.pause(ears);
    window.addEventListener("room-youtube-play",pause);
    return () => { window.removeEventListener("room-youtube-play",pause); engine.current?.dispose(); engine.current = null; };
  },[]);
  async function load(side:Ear,file?:File) {
    if (!file) return;
    setErrors(old=>({...old,[side]:undefined}));setNotice("");
    try {
      if (!window.AudioContext) { setErrors(old=>({...old,[side]:"unsupported"})); return; }
      await getEngine().load(side,file);
    } catch { setErrors(old=>({...old,[side]:"error"})); }
  }
  async function play(sides:Ear[]) {
    roomAudio.suspend(); setNotice("");
    try { await getEngine().play(sides); } catch { setNotice(t.playError); }
  }
  function close() { engine.current?.dispose(); engine.current=null;setStates({left:emptyDeck(),right:emptyDeck()});setErrors({});setNotice("");setStep(1); }
  return <section className="asmr-tool notranslate" translate="no">
    <header className="asmr-heading"><div><span className="room-eyebrow">ASMR / L + R</span><h1>{t.title}</h1><p>{t.intro}</p></div><Headphones aria-hidden="true" size={42}/></header>
    <nav className="asmr-steps" aria-label={t.title}>{t.steps.map((label,i)=><button key={i} className={step===i+1?"is-active":""} disabled={i>0&&!ready} aria-current={step===i+1?"step":undefined} onClick={()=>{if(i<2)engine.current?.pause(ears);setStep(i+1);}}><span>{step>i+1?<Check size={15}/>:String(i+1).padStart(2,"0")}</span>{label}</button>)}</nav>
    {notice&&<p className="asmr-error" role="alert">{notice}</p>}
    {step===2&&<p className="asmr-placement-note">{t.mono}</p>}
    <div className="asmr-decks">{ears.map(side=>{
      const s=states[side], label=t[side], loaded=!!s.name;
      return <article key={side} className={`asmr-deck asmr-${side}${s.playing?" is-playing":""}`}>
        <div className="asmr-deck-header"><span className="asmr-ear">{side==="left"?"L":"R"}</span><h2>{label}</h2>{loaded&&<span className="asmr-status">{s.playing?t.playing:t.paused}</span>}</div>
        <input ref={el=>{inputs.current[side]=el;}} type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" hidden aria-label={`${label} ${t.select}`} onChange={event=>{const file=event.target.files?.[0];event.target.value="";void load(side,file);}}/>
        <div className="asmr-file"><strong title={s.name}>{loaded?s.name:t.empty}</strong>{loaded&&<span>{audioTime(s.duration)} · {(s.size/1024/1024).toFixed(1)} MB</span>}</div>
        <button className="asmr-upload" disabled={s.loading} onClick={()=>inputs.current[side]?.click()}><Upload size={17}/>{s.loading?t.preparing:loaded?t.replace:t.select}</button>
        {errors[side]&&<p className="asmr-error" role="alert">{errors[side]==="unsupported"?t.unsupported:t.error}</p>}
        {s.error&&<p className="asmr-error" role="alert">{t.playError}</p>}
        {step===2&&loaded&&<div className="asmr-route"><span>{t.route}</span><Headphones size={24}/><strong>{label} · {side==="left"?"L":"R"}</strong><small>{t.ready}</small></div>}
        {step===3&&loaded&&<>
          <div className="asmr-transport"><button className="asmr-play" aria-label={`${label} ${s.playing?t.pause:t.play}`} onClick={()=>s.playing?engine.current?.pause([side]):void play([side])}>{s.playing?<Pause size={22}/>:<Play size={22}/>}</button><div><strong>{audioTime(s.time)}</strong><span> / {audioTime(s.duration)}</span></div></div>
          <input className="asmr-seek" aria-label={`${label} ${t.seek}`} type="range" min={0} max={s.duration} step={.1} value={s.time} onChange={event=>engine.current?.seek(side,Number(event.target.value))}/>
          <label className="asmr-volume"><Volume2 size={17}/><span>{t.volume}</span><input aria-label={`${label} ${t.volume}`} type="range" min={0} max={1} step={.01} value={s.volume} onChange={event=>engine.current?.volume(side,Number(event.target.value))}/><output>{Math.round(s.volume*100)}%</output></label>
          <details className="asmr-loop"><summary><Repeat2 size={17}/>{t.loop}{s.loop&&<Check size={15}/>}</summary><div className="asmr-loop-content"><div className="asmr-markers"><button onClick={()=>engine.current?.loop(side,{a:s.time})}>{t.markA}<span>{audioTime(s.a,true)}</span></button><button onClick={()=>engine.current?.loop(side,{b:s.time})}>{t.markB}<span>{audioTime(s.b,true)}</span></button></div><label><input type="checkbox" checked={s.loop} disabled={!validLoop(s.a,s.b,s.duration)} onChange={event=>engine.current?.loop(side,{loop:event.target.checked})}/>{t.loop}</label><button className="asmr-reset" onClick={()=>engine.current?.loop(side,{a:0,b:s.duration,loop:false})}>{t.reset}</button><p>{t.loopHint}</p></div></details>
        </>}
      </article>;
    })}</div>
    <div className="asmr-actions">
      {step===1&&<button className="asmr-primary" disabled={!ready} onClick={()=>setStep(2)}>{t.next}</button>}
      {step===2&&<><button onClick={()=>setStep(1)}>{t.back}</button><button className="asmr-primary" disabled={!ready} onClick={()=>setStep(3)}>{t.start}</button></>}
      {step===3&&<><button className="asmr-primary" disabled={!ready} onClick={()=>void play(ears)}><Play size={17}/>{t.bothPlay}</button><button onClick={()=>engine.current?.pause(ears)}><Pause size={17}/>{t.bothPause}</button></>}
      {ears.some(side=>states[side].name||states[side].loading)&&<button className="asmr-close" onClick={close}><X size={17}/>{t.close}</button>}
    </div>
    <p className="asmr-footnote">{step===3?t.replacement:t.formats}<br/>{t.local}</p>
  </section>;
}

