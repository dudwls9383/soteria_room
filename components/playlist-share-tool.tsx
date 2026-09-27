"use client";
import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, ListMusic } from "lucide-react";
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
  const [playlistId, setPlaylistId] = useState(library[0]?.id || "");
  const [format, setFormat] = useState<Format>("urls");
  const [copied, setCopied] = useState(false);
  const selected = useMemo(
    () => library.find((playlist) => playlist.id === playlistId) || library[0],
    [library, playlistId],
  );
  const shareText = buildShareText(selected, format);

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
            Python으로 쓰던 링크 추출기를 웹 안으로 옮겼어요. 저장된
            재생목록에서 영상 단축 링크만 꺼냅니다.
          </p>
          <label>
            재생목록
            <select
              value={selected?.id || ""}
              onChange={(event) => setPlaylistId(event.target.value)}
            >
              {library.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {displayTitle(playlist)} · {playlist.tracks.length}곡
                </option>
              ))}
            </select>
          </label>
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
              <h3>재생목록을 먼저 가져와 주세요.</h3>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
