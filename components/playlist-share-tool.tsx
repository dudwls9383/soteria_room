"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  ListMusic,
  LoaderCircle,
} from "lucide-react";
import type { Playlist } from "../lib/music";
import { displayTitle } from "../lib/collections";

type Format = "urls" | "title-url" | "markdown";

function trackUrl(id: string) {
  return `https://youtu.be/${id}`;
}

function buildShareText(playlist: Playlist | undefined, format: Format) {
  if (!playlist) return "";
  const title = displayTitle(playlist);
  const lines = playlist.tracks.map((track, index) => {
    const url = trackUrl(track.id);
    if (format === "urls") return url;
    if (format === "markdown")
      return `${index + 1}. [${track.title} - ${track.artist}](${url})`;
    return `${index + 1}. ${track.title} - ${track.artist}\n${url}`;
  });
  if (format === "urls") return lines.join("\n");
  return [`${title}`, `${playlist.tracks.length}곡`, "", ...lines].join("\n");
}

export default function PlaylistShareTool({
  library,
}: {
  library: Playlist[];
}) {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("urls");
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(selected || undefined, format);

  async function extract(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/playlist-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as Playlist & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setSelected(data);
    } catch (event) {
      setError((event as Error).message || "재생목록을 읽지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareText() {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div>
      <div className="room-heading">
        <div>
          <div className="room-eyebrow">PLAYLIST LINK EXTRACTOR</div>
          <h1>붙여넣기 좋은 재생목록 링크.</h1>
          <p>커뮤니티에 바로 공유할 수 있게 영상 링크를 한 번에 뽑아요.</p>
        </div>
      </div>
      <section className="share-tool glass">
        <div className="share-tool-panel">
          <div className="setting-icon">
            <ListMusic size={22} />
          </div>
          <h2>재생목록 선택</h2>
          <p>
            Python으로 쓰던 링크 추출기를 웹 안으로 옮겼어요. 공유하고 싶은
            재생목록 주소를 붙여넣으면 저장하지 않고 영상 단축 링크만 꺼냅니다.
          </p>
          <form className="share-url-form" onSubmit={extract}>
            <label>
              재생목록 URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://youtube.com/playlist?list=..."
                type="url"
                required
              />
            </label>
            <button className="room-button" disabled={busy || !url.trim()}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Link2 size={16} />}
              링크 추출
            </button>
          </form>
          <details className="saved-playlist-helper">
            <summary>저장된 재생목록에서 고르기</summary>
            <select
              value={selected?.id || ""}
              onChange={(event) => {
                const playlist = library.find(
                  (item) => item.id === event.target.value,
                );
                if (playlist) {
                  setSelected(playlist);
                  setUrl(`https://www.youtube.com/playlist?list=${playlist.id}`);
                }
              }}
            >
              <option value="">선택 안 함</option>
              {library.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {displayTitle(playlist)} · {playlist.tracks.length}곡
                </option>
              ))}
            </select>
          </details>
          <label>
            복사 형식
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as Format)}
            >
              <option value="urls">링크만</option>
              <option value="title-url">제목 + 링크</option>
              <option value="markdown">마크다운</option>
            </select>
          </label>
          <div className="share-actions">
            <button
              className="room-button"
              disabled={!shareText}
              onClick={() => void copyShareText()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "복사 완료" : "공유 텍스트 복사"}
            </button>
            {selected && (
              <a
                className="room-button subtle"
                href={`https://www.youtube.com/playlist?list=${selected.id}`}
                target="_blank"
                rel="noreferrer"
              >
                재생목록 열기 <ExternalLink size={15} />
              </a>
            )}
          </div>
          {error && (
            <p className="room-message error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="share-output-panel">
          <div className="section-title compact-title">
            <h2>
              추출 결과
              <span>{selected?.tracks.length || 0}개 링크</span>
            </h2>
          </div>
          {selected ? (
            <textarea
              className="share-output notranslate"
              translate="no"
              readOnly
              value={shareText}
              aria-label="공유용 재생목록 링크"
            />
          ) : (
            <div className="room-empty">
              <Link2 size={30} />
              <h3>재생목록 링크를 붙여넣어 주세요.</h3>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
