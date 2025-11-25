import React from "react";
import WorkoutLink from "./WorkoutLink.jsx";
import { useAudioPlaylist } from "../context/AudioPlaylistContext.jsx";
import { DEFAULT_COVER_PLACEHOLDER } from "../utils/covers.js";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

export default function AudioPlaylistBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    hasNext,
    hasPrevious,
    playNext,
    playPrevious,
    togglePlay,
    seek,
    clearQueue,
  } = useAudioPlaylist();

  if (!currentTrack) return null;
  const coverSrc = currentTrack.cover ?? DEFAULT_COVER_PLACEHOLDER;
  const safeProgress = Math.min(progress, duration || progress || 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 md:px-8">
      <div className="pointer-events-auto flex w-full max-w-4xl flex-col gap-3 rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(var(--surface-card),0.92)] p-4 text-white shadow-[0_25px_70px_-45px_rgba(8,7,20,0.9)] backdrop-blur">
        <div className="flex items-center gap-4">
          <img src={coverSrc} alt={currentTrack.title} className="h-16 w-16 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Sessão guiada MEU SHAPE</p>
            <p className="truncate text-base font-semibold text-white">
              {currentTrack.workoutId ? (
                <WorkoutLink workoutId={currentTrack.workoutId} className="hover:text-white/90" stopPropagation>
                  {currentTrack.title}
                </WorkoutLink>
              ) : (
                currentTrack.title
              )}
            </p>
            <p className="truncate text-sm text-white/70">{currentTrack.author}</p>
          </div>
          <button
            type="button"
            onClick={clearQueue}
            className="rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={duration ? safeProgress : 0}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white"
            step="1"
            aria-label="Progresso da faixa"
            disabled={!duration}
          />
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={playPrevious}
            disabled={!hasPrevious}
            className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ◀︎ Anterior
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-2xl bg-white px-6 py-2 text-sm font-semibold text-[rgb(var(--color-accent-dark))] shadow-[0_12px_24px_-14px_rgba(255,255,255,0.7)] transition hover:bg-white/90"
          >
            {isPlaying ? "Pausar" : "Reproduzir"}
          </button>
          <button
            type="button"
            onClick={playNext}
            disabled={!hasNext}
            className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima ▶︎
          </button>
        </div>
      </div>
    </div>
  );
}
