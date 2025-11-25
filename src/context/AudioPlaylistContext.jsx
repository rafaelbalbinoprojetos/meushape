import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildAudioSource } from "../utils/media.js";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const AudioPlaylistContext = createContext(null);

function normalizeTracks(tracks = []) {
  const occurrences = new Map();
  const normalized = [];

  tracks.forEach((track, index) => {
    if (!track) return;
    const rawSource = track.source ?? track.audio_url ?? track.audioUrl ?? "";
    const source = buildAudioSource(rawSource);
    if (!source) return;

    const baseId = track.id ?? track.workoutId ?? track.detailsId ?? `track-${index}`;
    const count = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, count + 1);
    const uniqueId = count ? `${baseId}#${count}` : baseId;

    normalized.push({
      id: uniqueId,
      workoutId: track.workoutId ?? track.detailsId ?? track.id ?? null,
      title: track.title ?? "Sessão guiada MEU SHAPE",
      author: track.author ?? track.subtitle ?? "Coach MEU SHAPE",
      cover: track.cover ?? null,
      source,
    });
  });

  return normalized;
}

export function AudioPlaylistProvider({ children }) {
  const audioRef = useRef(null);
  const autoplayRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const pendingSeekRef = useRef(null);
  const lastPersistedRef = useRef({ trackId: null, seconds: 0, timestamp: 0 });
  const saveTimeoutRef = useRef(null);
  const { user } = useAuth();

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const hasNext = currentIndex >= 0 && currentIndex + 1 < tracks.length;
  const hasPrevious = currentIndex > 0;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return undefined;

    const handleLoaded = () => {
      setDuration(node.duration || 0);
      if (pendingSeekRef.current && node.duration) {
        const resumeAt = Math.max(0, Math.min(pendingSeekRef.current, node.duration - 0.5));
        node.currentTime = resumeAt;
        setProgress(resumeAt);
        pendingSeekRef.current = null;
      }
    };
    const handleTime = () => setProgress(node.currentTime || 0);
    const handleEnded = () => {
      if (currentIndex + 1 < tracks.length) {
        autoplayRef.current = true;
        setCurrentIndex((prev) => (prev + 1 < tracks.length ? prev + 1 : prev));
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    node.addEventListener("loadedmetadata", handleLoaded);
    node.addEventListener("timeupdate", handleTime);
    node.addEventListener("ended", handleEnded);
    node.addEventListener("play", handlePlay);
    node.addEventListener("pause", handlePause);

    return () => {
      node.removeEventListener("loadedmetadata", handleLoaded);
      node.removeEventListener("timeupdate", handleTime);
      node.removeEventListener("ended", handleEnded);
      node.removeEventListener("play", handlePlay);
      node.removeEventListener("pause", handlePause);
    };
  }, [currentIndex, tracks.length]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;

    if (!currentTrack?.source) {
      node.pause();
      node.removeAttribute("src");
      setProgress(0);
      setDuration(0);
      return;
    }

    node.src = currentTrack.source;
    node.currentTime = 0;
    setProgress(0);
    setDuration(0);

    if (autoplayRef.current || isPlaying) {
      const playPromise = node.play();
      if (playPromise?.catch) {
        playPromise.catch(() => setIsPlaying(false));
      }
    }
    autoplayRef.current = false;
  }, [currentTrack?.source, isPlaying]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node || !currentTrack?.source) return;
    if (isPlaying) {
      const playPromise = node.play();
      if (playPromise?.catch) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      node.pause();
    }
  }, [isPlaying, currentTrack?.source]);

  const clearQueue = useCallback(() => {
    const node = audioRef.current;
    if (node) {
      node.pause();
      node.removeAttribute("src");
    }
    setTracks([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    pendingSeekRef.current = null;
    currentIndexRef.current = -1;
  }, []);

  const startPlaylist = useCallback((inputTracks = [], options = {}) => {
    const normalized = normalizeTracks(inputTracks);
    if (!normalized.length) {
      clearQueue();
      return;
    }

    setTracks(normalized);
    const defaultIndex = 0;
    let nextIndex = defaultIndex;

    if (options.trackId) {
      const foundIndex = normalized.findIndex(
        (track) => track.id === options.trackId || track.workoutId === options.trackId,
      );
      if (foundIndex >= 0) {
        nextIndex = foundIndex;
      }
    } else if (Number.isFinite(options.startIndex)) {
      nextIndex = Math.min(Math.max(options.startIndex, 0), normalized.length - 1);
    }

    const shouldAutoplay = options.autoplay ?? true;
    autoplayRef.current = shouldAutoplay;
    setCurrentIndex(nextIndex);
    setIsPlaying(shouldAutoplay);
  }, [clearQueue]);

  const togglePlay = useCallback(() => {
    if (!currentTrack?.source) return;
    setIsPlaying((prev) => !prev);
  }, [currentTrack?.source]);

  const playNext = useCallback(() => {
    if (!hasNext) return;
    autoplayRef.current = true;
    setCurrentIndex((prev) => Math.min(prev + 1, tracks.length - 1));
  }, [hasNext, tracks.length]);

  const playPrevious = useCallback(() => {
    if (!hasPrevious) return;
    autoplayRef.current = true;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [hasPrevious]);

  const seek = useCallback((value) => {
    const node = audioRef.current;
    if (!node || !Number.isFinite(value)) return;
    node.currentTime = value;
    setProgress(value);
  }, []);

  const addToQueue = useCallback(
    (inputTracks = [], options = {}) => {
      const normalized = normalizeTracks(inputTracks);
      if (!normalized.length) return;

      setTracks((prev) => {
        if (!prev.length) {
          const autoplay = options.autoplay ?? true;
          autoplayRef.current = autoplay;
          setCurrentIndex(0);
          setIsPlaying(autoplay);
          return normalized;
        }

        const next = [...prev];
        const insertIndex =
          options.playNext && currentIndexRef.current >= 0
            ? Math.min(currentIndexRef.current + 1, next.length)
            : next.length;
        next.splice(insertIndex, 0, ...normalized);

        if (options.autoplay) {
          autoplayRef.current = true;
          setCurrentIndex(insertIndex);
          setIsPlaying(true);
        }

        return next;
      });
    },
    [],
  );

  const removeTrack = useCallback(
    (trackId) => {
      if (!trackId) return;
      setTracks((prev) => {
        const index = prev.findIndex((track) => track.id === trackId);
        if (index === -1) return prev;
        const next = prev.filter((_, idx) => idx !== index);
        if (!next.length) {
          const node = audioRef.current;
          if (node) {
            node.pause();
            node.removeAttribute("src");
          }
          setCurrentIndex(-1);
          setIsPlaying(false);
          setProgress(0);
          setDuration(0);
          pendingSeekRef.current = null;
          currentIndexRef.current = -1;
          return [];
        }

        if (index < currentIndexRef.current) {
          setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        } else if (index === currentIndexRef.current) {
          const nextIndex = Math.min(index, next.length - 1);
          autoplayRef.current = true;
          setCurrentIndex(nextIndex);
        }

        return next;
      });
    },
    [],
  );

  const moveTrack = useCallback((trackId, direction) => {
    if (!trackId || !direction) return;
    setTracks((prev) => {
      const index = prev.findIndex((track) => track.id === trackId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      if (currentIndexRef.current === index) {
        setCurrentIndex(targetIndex);
      } else if (currentIndexRef.current === targetIndex) {
        setCurrentIndex(index);
      }
      return next;
    });
  }, []);

  const selectTrack = useCallback(
    (trackId) => {
      const index = tracks.findIndex((track) => track.id === trackId);
      if (index === -1) return;
      autoplayRef.current = true;
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks],
  );

  const persistProgress = useCallback(async (payload) => {
    try {
      const { error } = await supabase
        .from("progresso_guiado")
        .upsert(payload, { onConflict: "usuario_id,treino_id,tipo" });
      if (error) {
        console.error("[AudioPlaylist] erro ao salvar progresso:", error);
      }
    } catch (err) {
      console.error("[AudioPlaylist] falha inesperada ao salvar progresso:", err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !currentTrack?.workoutId) {
      pendingSeekRef.current = null;
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("progresso_guiado")
          .select("tempo_reproduzido")
          .match({
            usuario_id: user.id,
            treino_id: currentTrack.workoutId,
            tipo: "audio",
          })
          .maybeSingle();
        if (!active || error) return;
        if (data?.tempo_reproduzido) {
          pendingSeekRef.current = Number(data.tempo_reproduzido) || 0;
          const node = audioRef.current;
          if (node?.readyState >= 1 && pendingSeekRef.current > 0) {
            const resumeAt = Math.max(0, Math.min(pendingSeekRef.current, node.duration || pendingSeekRef.current));
            node.currentTime = resumeAt;
            setProgress(resumeAt);
            pendingSeekRef.current = null;
          }
        } else {
          pendingSeekRef.current = null;
        }
      } catch (err) {
        console.error("[AudioPlaylist] erro ao recuperar progresso:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentTrack?.workoutId, user?.id]);

  useEffect(() => {
    if (!user?.id || !currentTrack?.workoutId || !duration) return;
    if (!Number.isFinite(progress) || progress < 5) return;
    const percent = Math.min(100, (progress / duration) * 100);
    if (!Number.isFinite(percent)) return;

    const last = lastPersistedRef.current;
    const now = Date.now();
    if (
      last.trackId === currentTrack.id &&
      Math.abs(last.seconds - progress) < 5 &&
      now - last.timestamp < 5000
    ) {
      return;
    }

    lastPersistedRef.current = { trackId: currentTrack.id, seconds: progress, timestamp: now };
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistProgress({
        usuario_id: user.id,
        treino_id: currentTrack.workoutId,
        tipo: "audio",
        tempo_reproduzido: progress,
        progresso_percentual: percent,
      });
    }, 1000);
  }, [progress, duration, currentTrack?.id, currentTrack?.workoutId, user?.id, persistProgress]);

  const value = useMemo(
    () => ({
      tracks,
      currentTrack,
      currentIndex,
      isPlaying,
      hasNext,
      hasPrevious,
      duration,
      progress,
      startPlaylist,
      playNext,
      playPrevious,
      togglePlay,
      seek,
      clearQueue,
      addToQueue,
      removeTrack,
      moveTrack,
      selectTrack,
    }),
    [
      tracks,
      currentTrack,
      currentIndex,
      isPlaying,
      hasNext,
      hasPrevious,
      duration,
      progress,
      startPlaylist,
      playNext,
      playPrevious,
      togglePlay,
      seek,
      clearQueue,
      addToQueue,
      removeTrack,
      moveTrack,
      selectTrack,
    ],
  );

  return (
    <AudioPlaylistContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" hidden />
    </AudioPlaylistContext.Provider>
  );
}

export function useAudioPlaylist() {
  const context = useContext(AudioPlaylistContext);
  if (!context) {
    throw new Error("useAudioPlaylist deve ser usado dentro de AudioPlaylistProvider");
  }
  return context;
}
