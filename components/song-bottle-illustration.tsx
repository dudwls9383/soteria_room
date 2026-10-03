"use client";
import { useId } from "react";

// A small vector keeps the glass edges crisp at mobile sizes. Animate the
// bottle and waves independently so the text/form never moves with them.
export default function SongBottleIllustration() {
  const glass = useId();
  return <svg className="song-bottle-illustration" viewBox="0 0 240 150" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff" stopOpacity=".9" />
        <stop offset="1" stopColor="var(--season-b)" stopOpacity=".65" />
      </linearGradient>
    </defs>
    <ellipse cx="121" cy="119" rx="54" ry="7" fill="var(--room-blue)" opacity=".07" />
    <path className="song-bottle-wave back" d="M24 105 Q48 96 72 104 T120 104 T168 104 T216 104" />
    <g className="song-bottle-float">
      <rect x="110" y="24" width="21" height="13" rx="4" fill="#dbc2a0" stroke="#a78d6e" strokeWidth="1.5" />
      <path d="M109 36h23v19c0 6 12 9 12 22v29c0 9-6 14-14 14h-21c-8 0-14-5-14-14V77c0-13 14-16 14-22Z" fill={`url(#${glass})`} stroke="var(--room-blue)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M107 43h27" stroke="var(--room-blue)" strokeWidth="2" strokeLinecap="round" />
      <rect x="106" y="69" width="27" height="35" rx="4" fill="#fffaf0" stroke="#d7c9b1" strokeWidth="1" transform="rotate(9 120 86)" />
      <path d="M119 92V78l10-2v13M119 81l10-2" fill="none" stroke="var(--room-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="116" cy="93" rx="4" ry="3" fill="var(--room-blue)" />
      <ellipse cx="126" cy="90" rx="4" ry="3" fill="var(--room-blue)" />
      <path d="M102 80v24c0 5 2 8 5 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
    </g>
    <path className="song-bottle-wave front" d="M32 117 Q56 108 80 116 T128 116 T176 116 T208 116" />
    <path className="song-bottle-wave ripple" d="M66 132q12-4 24 0m58-2q12-4 24 0" />
    <circle cx="179" cy="80" r="3" fill="none" stroke="var(--room-blue)" opacity=".3" />
    <path d="M62 62v8m-4-4h8" stroke="var(--room-blue)" strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
  </svg>;
}
