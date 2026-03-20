import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchFeedPosts, fetchReactions, sendReaction } from "../services/feed.js";
import { resolveMediaUrl } from "../utils/media.js";

const TABS = [
  { id: "following", label: "Para você" },
  { id: "general", label: "Geral" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Mais recentes" },
  { id: "apoios", label: "Mais apoiados" },
];

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80";

const SAMPLE_FEED = [
  {
    id: "demo-1",
    usuario_id: "demo",
    tipo: "treino",
    titulo: "Concluiu Treino A (Peito e Tríceps)",
    conteudo: "Volume 9.850 kg • Tempo 62 min",
    imagem_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
    dados: {
      volume_total: 9850,
      duracao_min: 62,
      playlist: { nome: "Treino com energia", url: "https://open.spotify.com" },
      exercicios: [
        { nome: "Supino", series: 4, reps: "10", carga: "80 kg" },
        { nome: "Crossover", series: 3, reps: "12", carga: "20 kg" },
        { nome: "Tríceps testa", series: 3, reps: "10", carga: "35 kg" },
      ],
      destaques: ["Melhor série: Supino 80kg × 10", "RPE médio: 7"],
      apoios: { clap: 8, fire: 5, flex: 6 },
    },
    visibilidade: "public",
    criada_em: new Date().toISOString(),
    perfil: { nome: "Rafael", avatar_url: null },
  },
  {
    id: "demo-2",
    usuario_id: "demo",
    tipo: "pr",
    titulo: "Novo PR de agachamento",
    conteudo: "180 kg • 3 reps • RPE 9",
    dados: { pr: "180 kg", detalhe: "Agachamento livre", apoios: { clap: 4, fire: 7, flex: 3 } },
    visibilidade: "public",
    criada_em: new Date(Date.now() - 3600 * 1000).toISOString(),
    perfil: { nome: "Laura", avatar_url: null },
  },
];

function formatRelative(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  const weeks = Math.floor(days / 7);
  return `${weeks} sem atrás`;
}

function FeedCard({ post, onSupport }) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const avatar = resolveMediaUrl(post?.perfil?.avatar_url) || FALLBACK_AVATAR;
  const nome = post?.perfil?.nome ?? "Atleta";
  const badge =
    post.tipo === "treino"
      ? "🏋️‍♂️ Treino concluído"
      : post.tipo === "pr"
        ? "🚀 PR registrado"
        : post.tipo === "playlist"
          ? "🎧 Playlist do treino"
          : post.tipo === "dieta"
            ? "🍽️ Dieta / refeição"
            : "⭐ Atualização";

  return (
    <motion.article
      layout
      className="group rounded-[28px] border border-white/10 bg-white/75 p-4 shadow-lg transition hover:-translate-y-1 hover:border-[#32C5FF]/30 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/70"
    >
      <div className="flex items-start gap-3">
        <img src={avatar} alt={nome} className="h-12 w-12 rounded-full border-2 border-[#32C5FF]/40 object-cover shadow-sm" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--text-subtle))] dark:text-white/60">
            <span className="font-semibold text-[rgb(var(--text-primary))] dark:text-white">{nome}</span>
            <span>·</span>
            <span>{formatRelative(post.criada_em)}</span>
            <span className="rounded-full bg-[#32C5FF]/12 px-2 py-0.5 text-[11px] font-semibold text-[#0f1f3c] dark:bg-white/10 dark:text-white">
              {badge}
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">{post.titulo}</p>
          {post.conteudo ? (
            <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">{post.conteudo}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))] dark:text-white/50">
            <span>Visibilidade: {post.visibilidade === "friends" ? "Seguidores" : post.visibilidade === "private" ? "Privado" : "Público"}</span>
          </div>

          {post.imagem_url ? (
            <img
              src={resolveMediaUrl(post.imagem_url)}
              alt=""
              className="mt-3 max-h-64 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">
            <div className="flex flex-wrap gap-2">
              {post.dados?.volume_total ? (
                <span className="rounded-full bg-white/60 px-3 py-1 font-semibold dark:bg-white/10">
                  Volume: {post.dados.volume_total.toLocaleString()} kg
                </span>
              ) : null}
              {post.dados?.duracao_min ? (
                <span className="rounded-full bg-white/60 px-3 py-1 font-semibold dark:bg-white/10">
                  Tempo: {post.dados.duracao_min} min
                </span>
              ) : null}
              {post.dados?.playlist?.nome ? (
                <span className="rounded-full bg-white/60 px-3 py-1 font-semibold dark:bg-white/10">
                  🎧 {post.dados.playlist.nome}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-xl border border-white/40 px-3 py-1 text-[11px] font-semibold text-[rgb(var(--text-primary))] transition hover:border-[#32C5FF]/50 dark:border-white/20 dark:text-white"
            >
              {open ? "Recolher ↑" : "Expandir ↓"}
            </button>
          </div>

          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-3 space-y-3 rounded-2xl border border-white/20 bg-white/70 p-3 text-sm text-[rgb(var(--text-secondary))] shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-white/80"
              >
                {Array.isArray(post.dados?.exercicios) && post.dados.exercicios.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/60">Exercícios</p>
                    <ul className="mt-2 space-y-1">
                      {post.dados.exercicios.map((ex) => (
                        <li key={`${ex.nome}-${ex.series}`} className="flex justify-between">
                          <span>{ex.nome}</span>
                          <span className="text-xs text-[rgb(var(--text-subtle))] dark:text-white/60">
                            {ex.series ? `${ex.series}×${ex.reps ?? "?"}` : ex.reps ?? ""}
                            {ex.carga ? ` • ${ex.carga}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(post.dados?.destaques) && post.dados.destaques.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/60">Destaques</p>
                    <ul className="mt-2 space-y-1">
                      {post.dados.destaques.map((d) => (
                        <li key={d}>• {d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {post.dados?.playlist?.nome ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] dark:border-white/10 dark:bg-white/10 dark:text-white">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))] dark:text-white/60">Playlist</p>
                      <p>{post.dados.playlist.nome}</p>
                    </div>
                    {post.dados.playlist.url ? (
                      <a
                        href={post.dados.playlist.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[#1DB954] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                      >
                        Abrir Spotify
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "clap", label: "👏 Boa!" },
                    { id: "fire", label: "🔥 Insano!" },
                    { id: "flex", label: "💪 Mandou bem!" },
                  ].map((reaction) => {
                    const count = post.dados?.apoios?.[reaction.id] ?? 0;
                    const active = post.dados?.meuApoio === reaction.id;
                    return (
                      <button
                        key={reaction.id}
                        type="button"
                        onClick={() => onSupport?.(post.id, reaction.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-[#32C5FF] bg-[#32C5FF]/15 text-[#0f1f3c]"
                            : "border-white/30 bg-white/60 text-[rgb(var(--text-primary))] hover:border-[#32C5FF]/50 dark:border-white/20 dark:bg-white/10 dark:text-white"
                        }`}
                      >
                        <span>{reaction.label}</span>
                        <span className="text-[11px] text-[rgb(var(--text-subtle))] dark:text-white/60">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                  <button
                    type="button"
                    className="rounded-xl border border-white/30 px-3 py-1 transition hover:border-[#32C5FF]/50 dark:border-white/20"
                  >
                    Ver treino completo
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/30 px-3 py-1 transition hover:border-[#32C5FF]/50 dark:border-white/20"
                  >
                    Ver perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="rounded-xl border border-white/30 px-3 py-1 transition hover:border-[#32C5FF]/50 dark:border-white/20"
                  >
                    Compartilhar
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {shareOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/90 p-4 text-sm text-[rgb(var(--text-primary))] shadow-2xl dark:border-white/10 dark:bg-slate-900/90 dark:text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Compartilhar meu progresso</h3>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs text-[rgb(var(--text-secondary))] hover:bg-white/10 dark:text-white/70"
                >
                  Fechar
                </button>
              </div>
              <p className="mt-1 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">
                Exportar de forma controlada, sem repostar no feed de outros.
              </p>
              <div className="mt-3 grid gap-2">
                {[
                  "Copiar imagem do card",
                  "Exportar para Instagram Story",
                  "Enviar link do post",
                  "Compartilhar só com seguidores",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="flex items-center justify-between rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-left font-semibold transition hover:border-[#32C5FF]/50 dark:border-white/20 dark:bg-white/10"
                  >
                    <span>{option}</span>
                    <span className="text-[11px] text-[rgb(var(--text-subtle))] dark:text-white/60">→</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("following");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({ counts: {}, mine: {} });
  const [reactionsEnabled, setReactionsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFeedPosts({ scope: tab, userId: user?.id });
        if (cancelled) return;
        setPosts(Array.isArray(data) && data.length ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message ?? "Não foi possível carregar o feed agora.");
        setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tab, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const ids = posts.map((p) => p.id).filter(Boolean);
    if (!ids.length) {
      setReactions({ counts: {}, mine: {} });
      return undefined;
    }
    if (!reactionsEnabled) return undefined;
    async function loadReactions() {
      try {
        const res = await fetchReactions(ids, user?.id);
        if (!cancelled) setReactions(res);
      } catch (err) {
        console.error("[Feed] falha ao carregar reações:", err);
        if (/feed_reactions/i.test(err?.message ?? "") || err?.code === "PGRST205" || err?.status === 404) {
          setReactionsEnabled(false);
          if (typeof localStorage !== "undefined") localStorage.setItem("feed:reactions:disabled", "true");
        }
      }
    }
    loadReactions();
    return () => {
      cancelled = true;
    };
  }, [posts, user?.id]);

  const handleSupport = (postId, reactionId) => {
    if (!user?.id) {
      toast.error("Entre para reagir aos posts.");
      return;
    }
    if (!reactionsEnabled) {
      toast.error("Reações indisponíveis no momento.");
      return;
    }

    // Otimista
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const current = post.dados?.apoios?.[reactionId] ?? 0;
        return {
          ...post,
          dados: {
            ...post.dados,
            apoios: { ...(post.dados?.apoios ?? {}), [reactionId]: current + 1 },
            meuApoio: reactionId,
          },
        };
      }),
    );

    sendReaction({ postId, userId: user.id, reaction: reactionId })
      .then((res) => {
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;
            return {
              ...post,
              dados: {
                ...post.dados,
                apoios: { ...(post.dados?.apoios ?? {}), ...res.counts },
                meuApoio: res.mine ?? reactionId,
              },
            };
          }),
        );
        setReactions((prev) => ({
          counts: { ...prev.counts, [postId]: res.counts },
          mine: { ...prev.mine, [postId]: res.mine ?? reactionId },
        }));
      })
      .catch((err) => {
        console.error("[Feed] falha ao reagir:", err);
        toast.error(
          /feed_reactions/i.test(err?.message ?? "")
            ? "Reações indisponíveis no momento."
            : "Não foi possível registrar sua reação agora.",
        );
        if (/feed_reactions/i.test(err?.message ?? "") || err?.code === "PGRST205" || err?.status === 404) {
          setReactionsEnabled(false);
        }
      });
  };

  const displayPosts = useMemo(() => {
    const source = posts.length ? posts : SAMPLE_FEED;
    // merge reactions state over source for consistency
    const merged = source.map((post) => {
      const counts = reactions.counts[post.id];
      const mine = reactions.mine[post.id];
      return counts || mine
        ? {
            ...post,
            dados: {
              ...(post.dados ?? {}),
              apoios: { ...(post.dados?.apoios ?? {}), ...(counts ?? {}) },
              meuApoio: mine ?? post.dados?.meuApoio,
            },
          }
        : post;
    });
    if (sort === "apoios") {
      return [...merged].sort((a, b) => {
        const sum = (post) => {
          const apoios = post.dados?.apoios ?? {};
          return (apoios.clap ?? 0) + (apoios.fire ?? 0) + (apoios.flex ?? 0);
        };
        return sum(b) - sum(a);
      });
    }
    return merged;
  }, [posts, sort, reactions]);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 text-[rgb(var(--text-primary))] shadow-2xl dark:bg-gradient-to-br dark:from-[#050914] dark:via-[#0f1f3c] dark:to-[#111f35] dark:text-white lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))] dark:text-white/60">Feed do Shape</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">Acompanhe treinos, progresso e playlists</h1>
        <p className="mt-3 max-w-3xl text-[rgb(var(--text-secondary))] dark:text-white/75">
          Motivacional, compacto e útil. Sem competição exagerada — só consistência, evolução e boas ideias.
        </p>
        <div className="mt-5 inline-flex rounded-full border border-white/30 bg-white/70 p-1 text-sm font-semibold dark:border-white/15 dark:bg-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 transition ${
                tab === t.id
                  ? "bg-[#32C5FF] text-[#041220] dark:bg-white dark:text-[#0b2940]"
                  : "bg-white/60 text-[rgb(var(--text-secondary))] hover:bg-white/80 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/70 px-3 py-2 text-xs dark:border-white/15 dark:bg-white/5">
          <span className="uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))] dark:text-white/60">Ordenar</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSort(opt.id)}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                sort === opt.id
                  ? "bg-[#32C5FF] text-[#041220] dark:bg-white dark:text-[#0b2940]"
                  : "bg-white/60 text-[rgb(var(--text-secondary))] hover:bg-white/80 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {error ? (
          <p className="rounded-2xl border border-dashed border-[#FF8F8F]/50 bg-white/80 p-4 text-sm text-[#b00020] dark:border-white/20 dark:bg-slate-900/60">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="rounded-2xl border border-dashed border-[#32C5FF]/50 bg-white/80 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Carregando feed...
          </p>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {displayPosts.map((post) => (
                <FeedCard key={post.id} post={post} onSupport={handleSupport} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
