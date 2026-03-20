import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createPlaylist, favoritePlaylist, fetchPlaylists, logPlaylistPlay } from "../services/playlists.js";

const TABS = [
  { id: "objetivo", label: "Objetivo" },
  { id: "humor", label: "Humor" },
  { id: "tempo", label: "Tempo" },
  { id: "bpm", label: "BPM" },
];

const SAMPLE_PLAYLISTS = [
  {
    id: "hard-pump",
    titulo: "Hard Pump Focus",
    descricao: "Batidas eletrônicas e rock moderno para treinos de força com foco total.",
    objetivo: "Hipertrofia",
    humor: "Foco",
    tempo: 45,
    bpm: 132,
    tags: ["Perna", "Alta intensidade", "Força"],
    imagem:
      "https://images.unsplash.com/photo-1526481280695-3c469c2f88b8?auto=format&fit=crop&w=600&q=80",
    spotify_url: "https://open.spotify.com",
    apple_url: "https://music.apple.com",
    deezer_url: "https://www.deezer.com",
  },
  {
    id: "flow-cardio",
    titulo: "Cardio Elevado",
    descricao: "House melódico e pop acelerado para manter o ritmo do HIIT e corridas.",
    objetivo: "Emagrecimento",
    humor: "Energia",
    tempo: 35,
    bpm: 150,
    tags: ["HIIT", "Corrida", "Resistência"],
    imagem:
      "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=600&q=80",
    spotify_url: "https://open.spotify.com",
    apple_url: "https://music.apple.com",
    deezer_url: "https://www.deezer.com",
  },
  {
    id: "mindful-mobility",
    titulo: "Mobility & Flow",
    descricao: "Lo-fi, downtempo e R&B suave para alongamentos, mobilidade e baixa intensidade.",
    objetivo: "Recuperação",
    humor: "Calmo",
    tempo: 25,
    bpm: 92,
    tags: ["Mobilidade", "Alongamento", "Respiração"],
    imagem:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
    spotify_url: "https://open.spotify.com",
    apple_url: "https://music.apple.com",
    deezer_url: "https://www.deezer.com",
  },
  {
    id: "beast-mode",
    titulo: "Beast Mode Metal",
    descricao: "Metal moderno, breaks e guitarras pesadas para PRs e treinos densos.",
    objetivo: "Força máxima",
    humor: "Agressivo",
    tempo: 50,
    bpm: 138,
    tags: ["PR", "Peso livre", "Powerlifting"],
    imagem:
      "https://images.unsplash.com/photo-1526402462921-9e9f23f4fa2f?auto=format&fit=crop&w=600&q=80",
    spotify_url: "https://open.spotify.com",
    apple_url: "https://music.apple.com",
    deezer_url: "https://www.deezer.com",
  },
];

const COLLECTIONS = [
  { nome: "Motivação Insana 🚀", descricao: "Para dias de PR e treinos longos." },
  { nome: "Dia cansado, só vai 💪", descricao: "Levanta o humor em 3 músicas." },
  { nome: "Pump pesado 🔥", descricao: "Graves marcados para leg day." },
  { nome: "Cardio / Running 👟", descricao: "Mantém cadência estável no aeróbico." },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526481280695-3c469c2f88b8?auto=format&fit=crop&w=600&q=80";

function normalizePlaylist(entry) {
  const tagsFromCategoria = entry.categoria ? [entry.categoria] : [];
  return {
    id: entry.id ?? entry.titulo ?? `playlist-${Math.random().toString(36).slice(2, 9)}`,
    titulo: entry.titulo ?? "Playlist sem nome",
    descricao: entry.descricao ?? "Playlist recomendada para seu treino.",
    objetivo: entry.categoria ?? entry.objetivo ?? "Performance",
    humor: entry.humor ?? entry.categoria ?? "Foco",
    tempo: entry.duracao_aprox ?? entry.tempo ?? null,
    bpm: entry.bpm ?? null,
    tags: entry.tags ?? tagsFromCategoria ?? [],
    imagem: entry.imagem_url ?? entry.imagem ?? FALLBACK_IMAGE,
    spotify_url: entry.spotify_url ?? null,
    apple_url: entry.apple_url ?? null,
    deezer_url: entry.deezer_url ?? null,
  };
}

function TabPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#32C5FF] bg-[#32C5FF]/15 text-[#0f1f3c]"
          : "border-white/30 text-[rgb(var(--text-secondary))] hover:border-[#32C5FF]/50 dark:border-white/15 dark:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function PlaylistCard({ playlist, onOpen }) {
  return (
    <article className="flex flex-col gap-4 rounded-[28px] border border-white/15 bg-white/70 p-4 shadow-lg transition hover:-translate-y-1 hover:border-[#32C5FF]/40 hover:bg-white/85 dark:bg-slate-900/70">
      <div className="grid gap-4 md:grid-cols-[140px,1fr]">
        <img
          src={playlist.imagem}
          alt={playlist.titulo}
          className="h-full w-full rounded-2xl object-cover shadow-inner md:h-36"
          loading="lazy"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))]">
            <span>{playlist.objetivo}</span>
            <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))]" />
            <span>{playlist.humor}</span>
          </div>
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">{playlist.titulo}</h3>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">{playlist.descricao}</p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">
              {playlist.bpm ? `${playlist.bpm} bpm` : "BPM livre"}
            </span>
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">
              {playlist.tempo ? `${playlist.tempo} min` : "Tempo livre"}
            </span>
            {playlist.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/70 px-2 py-1 text-[rgb(var(--text-secondary))] shadow-sm dark:bg-white/10 dark:text-white/80"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {playlist.spotify_url && (
              <a
                onClick={(event) => onOpen?.(event, playlist, "spotify", playlist.spotify_url)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1DB954] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                href={playlist.spotify_url}
                target="_blank"
                rel="noreferrer"
              >
                Ouvir no Spotify
              </a>
            )}
            {playlist.apple_url && (
              <a
                onClick={(event) => onOpen?.(event, playlist, "apple", playlist.apple_url)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f94c57] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                href={playlist.apple_url}
                target="_blank"
                rel="noreferrer"
              >
                Ouvir no Apple Music
              </a>
            )}
            {playlist.deezer_url && (
              <a
                onClick={(event) => onOpen?.(event, playlist, "deezer", playlist.deezer_url)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2d2dff] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                href={playlist.deezer_url}
                target="_blank"
                rel="noreferrer"
              >
                Ouvir no Deezer
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function EnergiaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remotePlaylists, setRemotePlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState("objetivo");
  const [formState, setFormState] = useState({
    titulo: "",
    categoria: "",
    descricao: "",
    imagem_url: "",
    spotify_url: "",
    deezer_url: "",
    apple_url: "",
    duracao_aprox: "",
    bpm: "",
    visibilidade: "publica",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPlaylists();
        if (cancelled) return;
        setRemotePlaylists(data ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message ?? "Não foi possível carregar playlists agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedPlaylists = useMemo(() => {
    const source = remotePlaylists.length ? remotePlaylists : SAMPLE_PLAYLISTS;
    return source.map(normalizePlaylist);
  }, [remotePlaylists]);

  const filteredPlaylists = useMemo(() => {
    if (activeTab === "tempo") {
      return [...normalizedPlaylists].sort((a, b) => (a.tempo ?? 0) - (b.tempo ?? 0));
    }
    if (activeTab === "bpm") {
      return [...normalizedPlaylists].sort((a, b) => (b.bpm ?? 0) - (a.bpm ?? 0));
    }
    return normalizedPlaylists;
  }, [activeTab, normalizedPlaylists]);

  const recommendation = filteredPlaylists[0];

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      if (!formState.titulo || !formState.categoria) {
        throw new Error("Preencha pelo menos título e categoria.");
      }
      const payload = {
        titulo: formState.titulo.trim(),
        categoria: formState.categoria.trim(),
        descricao: formState.descricao?.trim() || null,
        imagem_url: formState.imagem_url?.trim() || null,
        spotify_url: formState.spotify_url?.trim() || null,
        deezer_url: formState.deezer_url?.trim() || null,
        apple_url: formState.apple_url?.trim() || null,
        duracao_aprox: formState.duracao_aprox ? Number(formState.duracao_aprox) : null,
        bpm: formState.bpm ? Number(formState.bpm) : null,
      };
      const created = await createPlaylist(payload);
      if (formState.visibilidade === "pessoal" && user?.id) {
        await favoritePlaylist(user.id, created.id);
      }
      setFormSuccess("Playlist salva com sucesso!");
      setFormState({
        titulo: "",
        categoria: "",
        descricao: "",
        imagem_url: "",
        spotify_url: "",
        deezer_url: "",
        apple_url: "",
        duracao_aprox: "",
        bpm: "",
        visibilidade: formState.visibilidade,
      });
      setRemotePlaylists((prev) => [created, ...prev]);
    } catch (err) {
      setFormError(err?.message ?? "Não foi possível salvar a playlist agora.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenPlaylist = async (event, playlist, platform, url) => {
    if (event) {
      event.preventDefault();
    }
    if (!url) return;

    const isUuid = typeof playlist?.id === "string" && /^[0-9a-fA-F-]{36}$/.test(playlist.id);

    // Dispara o registro sem bloquear a abertura do player.
    try {
      if (playlist?.id && isUuid) {
        await logPlaylistPlay({ usuarioId: user?.id ?? null, playlistId: playlist.id });
      }
    } catch (err) {
      console.warn("[Energia] falhou ao registrar play da playlist:", err?.message ?? err);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 text-[rgb(var(--text-primary))] shadow-2xl dark:bg-gradient-to-br dark:from-[#040d1f] dark:via-[#0f1f3c] dark:to-[#0f172a] dark:text-white lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))] dark:text-white/60">
              Som que puxa performance
            </p>
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">Energia do Treino</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/75">
              Playlists inteligentes para aquecer, focar e explodir no treino. A IA recomenda com base no treino do dia, duração e
              intensidade.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] dark:bg-white/10 dark:text-white/90">
              🔥 IA recomenda baseado no treino do dia
            </span>
          </div>
          <div className="rounded-3xl border border-white/30 bg-white/70 p-5 text-sm text-[rgb(var(--text-secondary))] shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-subtle))] dark:text-white/60">Integração com treino</p>
            <p className="mt-3 font-semibold">
              Iniciou um treino no MEU SHAPE? A playlist certa aparece com o tempo e o BPM que batem com o bloco selecionado.
            </p>
            <p className="mt-3 text-[rgb(var(--text-secondary))] dark:text-white/70">Funciona para Spotify, Apple Music e Deezer.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/70 p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70 lg:grid-cols-[2fr,1.2fr]">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Recomendação da IA</p>
          <div className="rounded-2xl border border-[#32C5FF]/30 bg-white/80 p-4 text-[rgb(var(--text-primary))] shadow-md dark:bg-gradient-to-r dark:from-[#0f1f3c] dark:to-[#12476c] dark:text-white">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/70">
              <span>Treino de Pernas</span>
              <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))] dark:bg-white/50" />
              <span>{recommendation?.tempo ? `${recommendation.tempo} min` : "Tempo livre"}</span>
              <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))] dark:bg-white/50" />
              <span>{recommendation?.bpm ? `${recommendation.bpm} bpm` : "Vibe livre"}</span>
            </div>
            <h3 className="mt-2 text-xl font-semibold">
              Playlist sugerida: {recommendation?.titulo ?? "Seleção automática"}{" "}
              {recommendation?.tempo ? `(${recommendation.tempo} min)` : ""}
            </h3>
            <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/80">
              Plataforma: {recommendation?.spotify_url ? "Spotify" : recommendation?.apple_url ? "Apple Music" : "Deezer"} · Abrir
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#32C5FF]/10 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] dark:bg-white/10 dark:text-white">
                🎯 Foco
              </span>
              <span className="rounded-full bg-[#32C5FF]/10 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] dark:bg-white/10 dark:text-white">
                🚀 Pré-treino
              </span>
              <span className="rounded-full bg-[#32C5FF]/10 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] dark:bg-white/10 dark:text-white">
                🔥 Pump rápido
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/30 bg-white/60 p-4 text-sm text-[rgb(var(--text-primary))] shadow-inner dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))] dark:text-white/70">Sincronização inteligente</p>
          <ul className="space-y-1 text-[rgb(var(--text-secondary))] dark:text-white/70">
            <li>• Ajuste automático pela duração do treino.</li>
            <li>• Sugestão por tipo de divisão (perna, push, pull, cardio).</li>
            <li>• Carrega a mesma vibe em Spotify, Apple Music ou Deezer.</li>
            <li>• Salva no histórico e permite favoritar.</li>
          </ul>
          <button
            type="button"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-4 py-2 text-sm font-semibold text-[#050914] shadow-md shadow-[#32C5FF]/25 transition hover:scale-[1.01]"
          >
            Ativar recomendação automática
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/70 p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Categorias</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Escolha a vibe do momento</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <TabPill key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </TabPill>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-dashed border-[#FF8F8F]/50 bg-white/70 p-4 text-sm text-[#b00020] dark:border-white/20 dark:bg-slate-900/60">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[#32C5FF]/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Carregando playlists...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} onOpen={handleOpenPlaylist} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/70 p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Cadastrar playlist</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">
              Inclua sua trilha e escolha se é pública ou pessoal
            </h2>
          </div>
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Título *</span>
            <input
              value={formState.titulo}
              onChange={(e) => handleFormChange("titulo", e.target.value)}
              required
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Categoria *</span>
            <input
              value={formState.categoria}
              onChange={(e) => handleFormChange("categoria", e.target.value)}
              required
              placeholder="hipertrofia, motivacao, cardio..."
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Descrição</span>
            <textarea
              value={formState.descricao}
              onChange={(e) => handleFormChange("descricao", e.target.value)}
              rows={2}
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Imagem (URL)</span>
            <input
              value={formState.imagem_url}
              onChange={(e) => handleFormChange("imagem_url", e.target.value)}
              placeholder="https://..."
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Spotify URL</span>
            <input
              value={formState.spotify_url}
              onChange={(e) => handleFormChange("spotify_url", e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Apple Music URL</span>
            <input
              value={formState.apple_url}
              onChange={(e) => handleFormChange("apple_url", e.target.value)}
              placeholder="https://music.apple.com/..."
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Deezer URL</span>
            <input
              value={formState.deezer_url}
              onChange={(e) => handleFormChange("deezer_url", e.target.value)}
              placeholder="https://www.deezer.com/..."
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">Duração aprox (min)</span>
            <input
              type="number"
              min="0"
              value={formState.duracao_aprox}
              onChange={(e) => handleFormChange("duracao_aprox", e.target.value)}
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[rgb(var(--text-primary))] dark:text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">BPM</span>
            <input
              type="number"
              min="0"
              value={formState.bpm}
              onChange={(e) => handleFormChange("bpm", e.target.value)}
              className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/25 dark:border-slate-800 dark:bg-slate-900/70"
            />
          </label>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-primary))] shadow-inner dark:border-slate-800 dark:bg-slate-900/60 dark:text-white md:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/70">Visibilidade</p>
            <div className="flex flex-wrap gap-3">
              {[
                { id: "publica", label: "Pública (aparece para todos)" },
                { id: "pessoal", label: "Pessoal (favorita para você)" },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    formState.visibilidade === option.id
                      ? "border-[#32C5FF] bg-[#32C5FF]/15 text-[#0f1f3c]"
                      : "border-white/30 text-[rgb(var(--text-secondary))] hover:border-[#32C5FF]/40 dark:border-white/20 dark:text-white/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibilidade"
                    value={option.id}
                    checked={formState.visibilidade === option.id}
                    onChange={() => handleFormChange("visibilidade", option.id)}
                    className="accent-[#32C5FF]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {formError ? (
            <p className="md:col-span-2 rounded-xl border border-dashed border-[#FF8F8F]/50 bg-white/80 px-4 py-3 text-sm text-[#b00020] dark:border-white/20 dark:bg-slate-900/50">
              {formError}
            </p>
          ) : null}
          {formSuccess ? (
            <p className="md:col-span-2 rounded-xl border border-[#32C5FF]/40 bg-[#32C5FF]/10 px-4 py-3 text-sm font-semibold text-[#0f1f3c] dark:border-white/20 dark:bg-white/10 dark:text-white">
              {formSuccess}
            </p>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={formLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formLoading ? "Salvando..." : "Salvar playlist"}
            </button>
            {formState.visibilidade === "pessoal" && !user ? (
              <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">
                Faça login para salvar como pessoal/favorita.
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[28px] border border-dashed border-[#32C5FF]/30 bg-white/70 p-5 shadow-inner dark:border-white/15 dark:bg-slate-900/60">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Coleções especiais</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {COLLECTIONS.map((collection) => (
            <div
              key={collection.nome}
              className="rounded-2xl border border-white/30 bg-white/80 p-4 text-sm text-[rgb(var(--text-primary))] shadow-sm transition hover:border-[#32C5FF]/40 hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <p className="text-base font-semibold">{collection.nome}</p>
              <p className="text-[rgb(var(--text-secondary))] dark:text-white/70">{collection.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/70 p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Sincronização com o treino</p>
          <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">Playlist certa, no momento certo</h3>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">
            Iniciou um treino no MEU SHAPE → sugerimos automaticamente uma playlist que combina com a duração, intensidade e estilo do
            bloco. Nada de ficar procurando no meio das séries.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">Objetivo</span>
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">Humor</span>
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">Tempo</span>
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-1 text-[#0f1f3c] dark:bg-white/10 dark:text-white">BPM</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-[#32C5FF]/15 via-white to-[#67FF9A]/10 p-4 text-sm text-[rgb(var(--text-primary))] shadow-md dark:from-[#12476c]/40 dark:via-slate-900 dark:to-[#12476c]/20 dark:text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/70">Integração com apps</p>
          <ul className="mt-2 space-y-2">
            <li>• Spotify, Apple Music e Deezer</li>
            <li>• Histórico automático de playlists usadas</li>
            <li>• Favoritos e repetição inteligente</li>
            <li>• Linha do tempo do treino + música</li>
          </ul>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#0f1f3c] px-4 py-2 text-xs font-semibold text-[#0f1f3c] transition hover:border-[#32C5FF] hover:text-[#032840] dark:border-white/30 dark:text-white"
          >
            Ver histórico de playlists
          </button>
        </div>
      </section>
    </div>
  );
}
