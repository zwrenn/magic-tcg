"use client";

import { useEffect, useRef, useState } from "react";

const TRACK = "8-Bit Fantasy & Adventure";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** A little Winamp/MySpace-style MP3 player. Lives in the layout so it keeps
 *  playing across page navigation. Collapsible; audio is lazy-loaded. */
export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.6);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = vol;
  }, [vol]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src="/music/theme.mp3"
        loop
        preload="none"
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open music player"
          className="gel gel-purple fixed bottom-4 right-4 z-40 !h-11 !w-11 !rounded-full !px-0 text-lg"
          title="Music"
        >
          ♪
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-40 w-64 overflow-hidden rounded-xl border-[3px] border-white bg-gradient-to-b from-[#2a2350] to-[#161033] shadow-[0_6px_0_rgba(0,0,0,0.35)]">
          {/* title bar */}
          <div className="flex items-center justify-between bg-black/40 px-2 py-1">
            <span className="pixel text-[11px] uppercase tracking-widest text-[#79ff8a]">
              ♪ Now Playing
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close music player"
              className="px-1 text-xs text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="p-2">
            {/* scrolling track name */}
            <div className="overflow-hidden rounded bg-black/50 px-2 py-1">
              <div className="marquee-track pixel text-sm text-[#5cffd0]">
                <span className="px-2">{TRACK} ✦&nbsp;</span>
                <span className="px-2" aria-hidden>{TRACK} ✦&nbsp;</span>
              </div>
            </div>

            {/* time + seek */}
            <div className="mt-2 flex items-center gap-2">
              <span className="pixel text-xs text-[#79ff8a]">{fmt(cur)}</span>
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={1}
                value={cur}
                onChange={(e) => {
                  const a = audioRef.current;
                  if (a) {
                    a.currentTime = Number(e.target.value);
                    setCur(Number(e.target.value));
                  }
                }}
                className="h-1.5 flex-1 cursor-pointer accent-[#79ff8a]"
              />
              <span className="pixel text-xs text-[#79ff8a]">{fmt(dur)}</span>
            </div>

            {/* controls */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={toggle}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-gradient-to-b from-[#b48bff] to-[#7d5fc6] text-white shadow-[0_3px_0_#4f3a86]"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button
                onClick={() => {
                  const a = audioRef.current;
                  if (a) { a.currentTime = 0; setCur(0); }
                }}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-black/40 text-white"
                aria-label="Restart"
                title="Restart"
              >
                ⏮
              </button>
              <span className="pixel ml-1 text-[10px] uppercase text-white/60">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => setVol(Number(e.target.value))}
                className="h-1.5 w-16 cursor-pointer accent-[#79ff8a]"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
