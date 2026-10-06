"use client";
import { useRoomAudio } from "./room-experience";
import { useEffect, useRef, useState } from "react";
import {
  Shuffle,
  Copy,
  Music2,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { Playlist } from "../lib/music";
import type { MusicRecord } from "../lib/music-index";
import { scopes, type Scope } from "../lib/collections";

import PickDiscovery from "./pick-discovery";
import SmallChannelDiscovery from "./small-channel-discovery";
import SongCard from "./song-card";
type MusicSnapshot = {
  total: number;
  music: MusicRecord[];
  available: {
    years: string[];
    months: string[];
    collections: string[];
  };
};
export default function RandomDiscovery({
  library,
  adminKey = "",
  language = "ko",
}: {
  library: Playlist[];
  adminKey?: string;
  language?: "ko"|"ja"|"en";
}) {
  const audio=useRoomAudio();
  const [scope, setScope] = useState<Scope>("picks"),
    [year, setYear] = useState("all"),
    [month, setMonth] = useState("all"),
    [songQuery, setSongQuery] = useState(""),
    [count, setCount] = useState(10),
    [songs, setSongs] = useState<MusicRecord[]>([]),
    [playing, updatePlaying] = useState<MusicRecord | null>(null);
  function setPlaying(t:MusicRecord|null){updatePlaying(t); if(t)audio.play(t);}
  const [musicSnapshot, setMusicSnapshot] = useState<MusicSnapshot>({
      total: 0,
      music: [],
      available: { years: [], months: [], collections: [] },
    }),
    [musicLoading, setMusicLoading] = useState(false);
  const [error,setError]=useState("");
  const [picksOnly,setPicksOnly]=useState(false);
  const [activeTab,setActiveTab]=useState("picks");
  const [songNotice,setSongNotice]=useState("");
  const [drawing,setDrawing]=useState(false);
  const drawRequest=useRef<AbortController | null>(null);
  const monthChoices = [
    ...new Set(musicSnapshot.available.months.map((item) => item.slice(-2))),
  ].sort((a, b) => Number(a) - Number(b));
  useEffect(() => {
    const controller = new AbortController();
    drawRequest.current?.abort();
    setDrawing(false);
    const params = new URLSearchParams({
      scope,
      year,
      month,
      q: songQuery,
      limit: "0",
    });
    setMusicLoading(true);
    setSongNotice("");
    setSongs([]);
    fetch(`/api/music?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setMusicSnapshot(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => { if (!controller.signal.aborted) setMusicLoading(false); });
    return () => { controller.abort(); drawRequest.current?.abort(); };
  }, [scope, year, month, songQuery, library.length]);
  async function drawSongs() {
    const controller=new AbortController();
    drawRequest.current?.abort(); drawRequest.current=controller;
    setDrawing(true); setError(""); setSongNotice("");
    const params=new URLSearchParams({mode:"draw",scope,year,month,q:songQuery,count:String(count)});
    try {
      const r=await fetch(`/api/music?${params}`,{signal:controller.signal});
      const d:MusicSnapshot & {error?:string}=await r.json();
      if(!r.ok)throw new Error(d.error || "음악을 뽑지 못했어요.");
      // Sampling happens on the server across every candidate; drawing never starts playback.
      setSongs(d.music); updatePlaying(null);
      setSongNotice(`${d.total.toLocaleString()}곡 후보 중 ${d.music.length}곡을 골랐어요.`);
    } catch(e){if(!controller.signal.aborted)setError((e as Error).message);} finally {if(!controller.signal.aborted)setDrawing(false);}
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        songs.map((t) => `https://youtu.be/${t.id}`).join("\n"),
      );
      setSongNotice(`${songs.length}곡의 YouTube 링크를 복사했어요.`);
    } catch {
      setError("클립보드 권한을 확인해 주세요.");
    }
  }
  return (
    <div>
      <div className="room-heading discovery-heading">
        <div>
          <div className="room-eyebrow">DIGGING ROOM</div>
          <h1>음악을 다시 발견하는 방.</h1>
          <p>모아둔 음악과 덜 알려진 채널을 발견해요.</p>
        </div>
      </div>
      {error && (
        <p className="room-message error" role="alert">
          {error}
        </p>
      )}
      <Tabs value={activeTab} onValueChange={value=>{setActiveTab(value);setError("");}}>
        <TabsList className="discovery-tabs">
          <TabsTrigger value="picks"><Music2 size={16} />Pick</TabsTrigger>
          <TabsTrigger value="songs">
            <Shuffle size={16} />랜덤 뽑기
          </TabsTrigger>
          <TabsTrigger value="recommend">
            <Users size={16} />
            하꼬 추천
          </TabsTrigger>
        </TabsList>
        <TabsContent value="picks"><PickDiscovery adminKey={adminKey} /></TabsContent>
        <TabsContent value="songs">
          {songNotice && <p className="room-message" role="status">{songNotice}</p>}
          <section className="discovery-control glass">
            <div>
              <h2>조건을 정하고 음악을 뽑아보세요.</h2>
              <p>{musicLoading ? "후보 곡을 확인하는 중…" : `후보 ${musicSnapshot.total.toLocaleString()}곡 · 같은 영상은 한 번만 뽑아요.`}</p>
            </div>
            <div className="control-row random-song-filters">
              <label>
                뽑을 범위
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value as Scope);
                    setSongs([]);
                    setPlaying(null);
                  }}
                >
                  {scopes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                연도
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setSongs([]);
                    setPlaying(null);
                  }}
                >
                  <option value="all">전체</option>
                  {musicSnapshot.available.years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                월
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setSongs([]);
                    setPlaying(null);
                  }}
                >
                  <option value="all">전체</option>
                  {monthChoices.map((item) => (
                    <option key={item} value={item}>
                      {`${Number(item)}월`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                검색어
                <input
                  value={songQuery}
                  onChange={(e) => {
                    setSongQuery(e.target.value);
                    setSongs([]);
                    setPlaying(null);
                  }}
                  placeholder="곡, 채널, 재생목록"
                />
              </label>
              <label>
                곡 수
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <button
                className="room-button"
                disabled={
                  !musicSnapshot.total || drawing ||
                  musicLoading ||
                  !Number.isInteger(count) ||
                  count < 1 ||
                  count > 100
                }
                onClick={() => void drawSongs()}
              >
                <Shuffle size={17} />
                {drawing ? "뽑는 중…" : "곡 뽑기"}
              </button>
            </div>
          </section>
          {songs.length > 0 && (
            <>

              <div className="section-title">
                <h2>
                  이번 Pick<span>{`${songs.length}곡`}</span>
                </h2>
                <div className="shelf-actions"><button className="room-button subtle" onClick={()=>audio.add(songs)}>모두 담기</button><button
                  className="room-button subtle"
                  onClick={() => void copy()}
                >
                  <Copy size={16} />
                  YouTube 링크 복사
                </button></div>
              </div>
              <div className="pick-album-grid">
                {songs.map((t) => (
                  <SongCard key={t.id} track={t} active={playing?.id===t.id} onPlay={()=>setPlaying(t)} meta={<span className="notranslate" translate="no">{t.playlists.slice(0,2).join(" / ")}</span>} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="recommend">
          <label className="room-button subtle" style={{marginBottom:12}}><input type="checkbox" checked={picksOnly} onChange={e=>setPicksOnly(e.target.checked)}/>{language==='ko'?'월의 픽 한정':language==='ja'?'月のPickのみ':'Monthly Picks only'}</label>
          <SmallChannelDiscovery adminKey={adminKey} language={language} picksOnly={picksOnly}/>
        </TabsContent>
      </Tabs>
    </div>
  );
}
