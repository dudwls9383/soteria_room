"use client";
import type { ReactNode } from "react";
import { ExternalLink, Play, Plus } from "lucide-react";
import type { Track } from "../lib/music";
import { useRoomAudio } from "./room-experience";

// Pick, random results and hidden gems share the same action order and hit areas.
export default function SongCard({ track, meta, active = false, onPlay }: {
  track: Track; meta?: ReactNode; active?: boolean; onPlay?: () => void;
}) {
  const audio = useRoomAudio();
  return <article className={`pick-album song-card ${active ? "active" : ""}`}>
    <button className="pick-cover" onClick={onPlay || (() => audio.play(track))} aria-label={`${track.title} · 사이트에서 듣기`}>
      <img src={track.thumbnail} alt="" loading="lazy" />
      <span><Play size={20} fill="currentColor" /></span>
    </button>
    <div className="pick-album-copy">
      <h3 className="notranslate" translate="no">{track.title}</h3>
      <p className="notranslate" translate="no">{track.artist}</p>
      {meta && <small>{meta}</small>}
      <div className="song-card-actions">
        <button type="button" onClick={() => audio.add([track])} aria-label="듣기 목록에 담기" title="듣기 목록에 담기"><Plus size={18} /></button>
        <a href={`https://youtu.be/${track.id}`} target="_blank" rel="noreferrer" aria-label="YouTube에서 듣기" title="YouTube에서 듣기"><ExternalLink size={17} /></a>
      </div>
    </div>
  </article>;
}
