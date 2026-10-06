"use client";
import {useEffect,useState} from "react";
import {Shuffle,ExternalLink,RefreshCw,Upload} from "lucide-react";
import {sampleUnique} from "../lib/collections";
import {SHEET_URL,type Channel} from "../lib/subscriptions";
import ResetDataButton from "./reset-data-button";
type Snapshot={channels:Channel[];updatedAt:number|null;source:string|null};
export default function RandomChannelDiscovery({adminKey=""}:{adminKey?:string}) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
      channels: [],
      updatedAt: null,
      source: null,
    }),
    [channels, setChannels] = useState<Channel[]>([]),
    [channelCount, setChannelCount] = useState(3);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [channelQuery,setChannelQuery] = useState("");
  const [channelPage,setChannelPage] = useState(1);
  const filteredChannels=snapshot.channels.filter(c=>`${c.title} ${c.id}`.toLowerCase().includes(channelQuery.trim().toLowerCase()));
  const pageCount=Math.max(1,Math.ceil(filteredChannels.length/100));
  const safePage=Math.min(channelPage,pageCount);
  const visibleChannels=filteredChannels.slice((safePage-1)*100,safePage*100);
  useEffect(() => {
    fetch("/api/subscriptions")
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setSnapshot(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function update(input: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-soteria-admin-key": adminKey } : {}),
        },
        body: JSON.stringify(input),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
      setChannels([]);
      setNotice(`${d.channels.length.toLocaleString()}개 채널로 갱신했어요.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 1800000) {
      setError("CSV는 1.8MB 이하로 올려주세요.");
      return;
    }
    await update({ csv: await file.text() });
  }
  async function drawChannels() {
    const picked = sampleUnique(snapshot.channels, channelCount);
    setChannels(picked);
    const missing=picked.filter(c=>!c.avatar);
    if(!missing.length) return;
    try {
      const r = await fetch("/api/channel-avatars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-soteria-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({ channels: missing }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setChannels(
        picked.map((c) => ({ ...c, avatar: d.avatars?.[c.id] || c.avatar })),
      );
    } catch {
      setNotice(
        "채널을 뽑았어요. 일부 프로필 이미지는 표시되지 않을 수 있어요.",
      );
    }
  }
  return <div>{error && <p className="room-message error" role="alert">{error}</p>}{notice && <p className="room-message" role="status">{notice}</p>}
          <section className="discovery-control glass">
            <div>
              <h2>구독목록에서 랜덤 채널 찾기</h2>
              <p>{`저장된 ${snapshot.channels.length.toLocaleString()}개 채널 안에서 뽑아요. 구독자 수 기준의 필터는 적용하지 않아요.`}</p>
            </div>
            <div className="control-row">
              <label>
                채널 수
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={channelCount}
                  onChange={(e) => setChannelCount(Number(e.target.value))}
                />
              </label>
              <button
                className="room-button"
                disabled={
                  !snapshot.channels.length ||
                  !Number.isInteger(channelCount) ||
                  channelCount < 1 ||
                  channelCount > 30
                }
                onClick={() => void drawChannels()}
              >
                <Shuffle size={17} />
                채널 뽑기
              </button>

            </div>
          </section>
          <div className="channel-grid random-channel-results" aria-label="채널 뽑기 결과">
            {channels.map((c, i) => (
              <a
                className="channel-card glass"
                href={c.url}
                key={c.id}
                target="_blank"
                rel="noreferrer"
              >
                {c.avatar ? (
                  <img
                    className="channel-avatar"
                    src={c.avatar}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="channel-monogram">
                    {c.title.slice(0, 1)}
                  </span>
                )}
                <div>
                  <small>DISCOVERY {String(i + 1).padStart(2, "0")}</small>
                  <h3 className="notranslate" translate="no">
                    {c.title}
                  </h3>
                  <span>
                    채널에서 음악 찾아보기 <ExternalLink size={14} />
                  </span>
                </div>
              </a>
            ))}
          </div>
          <section className="subscription-all glass">
            <div className="section-title"><h2>전체 구독 채널 <span>{filteredChannels.length.toLocaleString()}개</span></h2><input aria-label="구독 채널 검색" placeholder="채널 이름 검색" value={channelQuery} onChange={e=>{setChannelQuery(e.target.value);setChannelPage(1);}}/></div>
            <p className="room-note">100개씩 가볍게 표시해요. 저장된 사진이 없는 채널은 이름의 첫 글자로 표시합니다.</p>
            <div className="subscription-mini-grid">{visibleChannels.map(c=><a href={c.url} target="_blank" rel="noreferrer" key={c.id} title={c.title}>{c.avatar ? <img src={c.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/> : <span className="subscription-initial">{c.title.slice(0,1)}</span>}<strong className="notranslate" translate="no">{c.title}</strong></a>)}</div>
            {!visibleChannels.length && <p>표시할 채널이 없어요.</p>}
            <nav className="subscription-pages" aria-label="전체 구독 채널 페이지"><button className="room-button subtle" disabled={safePage<=1} onClick={()=>setChannelPage(safePage-1)}>이전</button><label>페이지 <select value={safePage} onChange={e=>setChannelPage(Number(e.target.value))}>{Array.from({length:pageCount},(_,i)=><option value={i+1} key={i}>{i+1}</option>)}</select> / {pageCount}</label><button className="room-button subtle" disabled={safePage>=pageCount} onClick={()=>setChannelPage(safePage+1)}>다음</button></nav>
          </section>
          {adminKey && <details className="subscription-settings glass inline-admin"><summary>구독목록 관리</summary>
            <h2>반년에 한 번, 구독목록 새로 넣기</h2>
            <p>
              마지막 가져오기:{" "}
              {snapshot.updatedAt
                ? new Date(snapshot.updatedAt).toLocaleDateString("ko-KR")
                : "아직 없음"}
              {snapshot.source ? ` · ${snapshot.source}` : ""}
            </p>
            {snapshot.updatedAt &&
              Date.now() - snapshot.updatedAt > 180 * 86400000 && (
                <p className="room-note">
                  6개월이 지났어요. 최신 구독목록으로 갱신해 주세요.
                </p>
              )}
            <div className="control-row">
              <button
                className="room-button subtle"
                disabled={busy || !adminKey}
                onClick={() => void update({ source: "sheet" })}
              >
                <RefreshCw size={16} className={busy ? "spin" : ""} />
                {busy ? "가져오는 중…" : "연결된 시트 다시 가져오기"}
              </button>
              <label className="room-button subtle upload-label" aria-disabled={!adminKey} title={!adminKey ? "가져오기 · 동기화에서 관리 잠금을 열어 주세요." : undefined}>
                <Upload size={16} />새 CSV로 갱신
                <input
                  aria-label="구독목록 CSV 업로드"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy || !adminKey}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <a href={SHEET_URL} target="_blank" rel="noreferrer">
                원본 시트 <ExternalLink size={14} />
              </a>
              <ResetDataButton target="csv" label="CSV 초기화" adminKey={adminKey} disabled={busy} onReset={()=>{setSnapshot({channels:[],updatedAt:null,source:null});setChannels([]);setNotice("CSV 구독목록을 비웠어요.");}} />
            </div>
            <p className="room-note">
              관리 잠금이 열린 상태에서만 목록을 교체합니다. 채널 URL과
              채널 제목 열을 사용해요.
            </p>
          </details>}
          <div className="digging-guides">
            <a
              href="https://gall.dcinside.com/mini/board/view/?id=moesound&no=1025"
              target="_blank"
              rel="noreferrer"
            >
              소테리아의 곡 디깅하는 법 <ExternalLink size={14} />
            </a>
            <a
              href="https://gall.dcinside.com/mini/board/view/?id=moesound&no=979"
              target="_blank"
              rel="noreferrer"
            >
              재생목록을 만드는 법 <ExternalLink size={14} />
            </a>
          </div>
</div>;
}
