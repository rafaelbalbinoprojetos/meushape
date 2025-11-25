import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFichaById, listFichaTreinos } from "../services/fichas.js";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveMediaUrl } from "../utils/media.js";
import { listExercisePreferences, upsertExercisePreference } from "../services/preferences.js";
import { getExerciseLoadSuggestions } from "../services/suggestions.js";
import { createCompletedTreino, logExerciseExecution } from "../services/executions.js";
import { CheckCircle2, Play, Upload } from "lucide-react";
import audioLinksRaw from "../../linksaudio.txt?raw";
import toast from "react-hot-toast";
import { saveSelectedFicha } from "../utils/selectedFicha.js";

const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80";
const SUPER_USER_EMAIL = "balbino10@hotmail.com";
const LEVEL_LABELS = {
  iniciante: "Iniciante",
  intermediario: "Intermediario",
  avancado: "Avancado",
  pro: "Pro",
};
const AUDIO_SOURCES = audioLinksRaw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .map(normalizeAudioSource)
  .filter(Boolean);

function formatDate(value) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FichaDetailsPage() {
  const { fichaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, ficha: null });
  const [treinoState, setTreinoState] = useState({ loading: true, error: null, items: [] });
  const [sessionTreino, setSessionTreino] = useState(null);
  const [registerStatus, setRegisterStatus] = useState({});

  useEffect(() => {
    let active = true;
    async function loadFicha() {
      setState({ loading: true, error: null, ficha: null });
      setTreinoState({ loading: true, error: null, items: [] });
      try {
        const ficha = await getFichaById(fichaId);
        if (!active) return;
        if (!ficha) {
          setState({ loading: false, error: "Ficha nao encontrada.", ficha: null });
          setTreinoState({ loading: false, error: null, items: [] });
          return;
        }
        setState({ loading: false, error: null, ficha });
        try {
          const treinos = await listFichaTreinos(ficha.id);
          if (!active) return;
          setTreinoState({ loading: false, error: null, items: treinos });
        } catch (treinoError) {
          if (!active) return;
          setTreinoState({
            loading: false,
            error: treinoError?.message ?? "Nao foi possivel carregar os treinos vinculados.",
            items: [],
          });
        }
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          error: err?.message ?? "Nao foi possivel carregar os detalhes da ficha.",
          ficha: null,
        });
        setTreinoState({ loading: false, error: null, items: [] });
      }
    }
    loadFicha();
    return () => {
      active = false;
    };
  }, [fichaId]);

  const { loading, error, ficha } = state;
  const { loading: treinosLoading, error: treinosError, items: treinos } = treinoState;
  const isOwner = useMemo(() => {
    if (!user) return false;
    if (user.email && user.email.toLowerCase() === SUPER_USER_EMAIL) {
      return true;
    }
    return Boolean(user?.id && ficha?.usuario_id === user.id);
  }, [user, ficha]);
  const handleEditFicha = () => {
    if (!ficha?.id) return;
    navigate(`/fichas/${ficha.id}/editar`);
  };
  const ensureSessionTreino = useCallback(async () => {
    if (sessionTreino?.id) return sessionTreino;
    if (!user?.id) throw new Error("Entre para registrar execucoes.");
    const created = await createCompletedTreino({
      usuarioId: user.id,
      fichaId: ficha?.id ?? null,
      data: new Date(),
    });
    setSessionTreino(created);
    return created;
  }, [ficha?.id, sessionTreino, user?.id]);

  const handleRegisterExecution = useCallback(
    async (exercise, payload) => {
      if (!user?.id) {
        throw new Error("Entre para registrar execucoes.");
      }
      const session = await ensureSessionTreino();
      const repsText = payload.repeticoes ?? exercise.repeticoes ?? null;
      const cargaValue = payload.carga != null ? payload.carga : exercise.carga ?? null;
      await logExerciseExecution({
        treinoId: session.id,
        exercicioId: exercise.exercicio_id ?? exercise.exercicio?.id,
        seriesExecutadas: payload.series ?? exercise.series ?? null,
        repeticoesExecutadas: repsText,
        cargaExecutada: cargaValue != null && cargaValue !== "" ? cargaValue : null,
      });
      setRegisterStatus((prev) => ({ ...prev, [exercise.id]: "ok" }));
    },
    [ensureSessionTreino, user?.id],
  );
  const handleUseFicha = useCallback(() => {
    if (!ficha) return;
    const saved = saveSelectedFicha(ficha);
    if (saved) {
      toast.success("Ficha definida para o Panorama do Shape.");
      navigate("/");
    } else {
      toast.error("Nao foi possivel salvar esta ficha agora.");
    }
  }, [ficha, navigate]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]"
        >
          Voltar
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={handleEditFicha}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/80"
          >
            Editar ficha
          </button>
        )}
      </div>

      {loading && (
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-10 text-white shadow-2xl">
          <p className="text-sm font-semibold text-white/70">Carregando ficha...</p>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-[32px] border border-[#FF8F8F]/30 bg-[#2B0C0C] p-8 text-white">
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-white/80">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/fichas")}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Voltar para fichas
            </button>
          </div>
        </section>
      )}

      {ficha && (
        <>
          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#0f172a] p-6 text-white shadow-2xl lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  {ficha.visibilidade === "privada" ? "Ficha privada" : "Ficha publica"}
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{ficha.nome}</h1>
                <p className="mt-4 text-lg text-white/80">{ficha.descricao ?? "Ficha sem descricao detalhada ainda."}</p>

                <dl className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Nivel</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{LEVEL_LABELS[ficha.nivel] ?? ficha.nivel ?? "Livre"}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Objetivo</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{ficha.objetivo ?? "Custom"}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Criada em</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{formatDate(ficha.criado_em)}</dd>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs uppercase tracking-[0.35em] text-white/50">Atualizada em</dt>
                    <dd className="mt-2 text-xl font-semibold text-white">{formatDate(ficha.atualizado_em)}</dd>
                  </div>
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleUseFicha}
                    className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40"
                  >
                    Usar esta ficha
                  </button>
                  {isOwner ? (
                    <Link
                      to={`/fichas/${ficha.id}/editar`}
                      className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60"
                    >
                      Editar ficha
                    </Link>
                  ) : (
                    <button className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60">
                      Duplicar para minha conta
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
                <img
                  src={resolveMediaUrl(ficha.capa_url || ficha.thumbnail_url) || FALLBACK_THUMBNAIL}
                  alt={ficha.nome}
                  className="h-64 w-full rounded-3xl border border-white/10 object-cover"
                />
                <p className="mt-4 text-sm text-white/70">
                  Atualize as midias desta ficha direto no Supabase (campos `thumbnail_url` e `capa_url`) para melhorar a apresentacao no catalogo.
                </p>
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-xs text-white/70">
                  <p className="font-semibold text-white">ID da ficha</p>
                  <p className="mt-1 break-all text-white/80">{ficha.id}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
            <header className="mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Estrutura</p>
              <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Exercicios vinculados</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Dados carregados da tabela <code>ficha_exercicios</code>. Ajuste as ordens e observacoes direto no Supabase para refletir aqui.
              </p>
            </header>
            {isOwner && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-[rgb(var(--text-primary))]">
                  Precisa adicionar ou remover exercicios? Abra o modo de edicao para ajustar essa ficha.
                </p>
                <button
                  type="button"
                  onClick={handleEditFicha}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#0f1f3c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f1f3c] transition hover:border-[#32C5FF] hover:text-[#32C5FF] dark:border-white/50 dark:text-white"
                >
                  Editar exercicios
                </button>
              </div>
            )}

          {treinosLoading ? (
            <div className="rounded-3xl border border-white/20 p-6 text-center text-[rgb(var(--text-secondary))]">
              <p className="text-sm font-semibold">Carregando treinos...</p>
            </div>
          ) : treinosError ? (
            <div className="rounded-3xl border border-[#FF8F8F]/30 bg-[#2B0C0C] p-6 text-white">
                <p className="text-lg font-semibold">Nao foi possivel listar os treinos.</p>
                <p className="mt-2 text-sm text-white/80">{treinosError}</p>
              </div>
            ) : treinos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/40 p-8 text-center text-[rgb(var(--text-secondary))]">
                <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">Nenhum treino estruturado ainda.</p>
                <p className="mt-2 text-sm">
                  Adicione registros na tabela <code>ficha_treinos</code> e vincule exercicios em <code>ficha_exercicios</code> para liberar o passo a passo.
                </p>
              </div>
            ) : (
              treinos.map((treino) => {
                const subdivisaoTitulo =
                  treino.subdivisao_label ?? (treino.subdivisao ? `Treino ${treino.subdivisao}` : null);
                const tituloPrincipal = treino.nome ?? "Treino sem nome";
                const treinoReferencia = subdivisaoTitulo ? `${subdivisaoTitulo} · ${tituloPrincipal}` : tituloPrincipal;
                return (
                  <div key={treino.id} className="mb-8 last:mb-0">
                    <div className="mb-3">
                      {subdivisaoTitulo ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
                          {subdivisaoTitulo}
                        </p>
                      ) : null}
                      <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))]">{tituloPrincipal}</h3>
                      {treino.descricao ? (
                        <p className="text-sm text-[rgb(var(--text-secondary))]">{treino.descricao}</p>
                      ) : null}
                    </div>
                    {Array.isArray(treino.ficha_exercicios) && treino.ficha_exercicios.length > 0 ? (
                      <FichaExercisesTable
                        exercicios={treino.ficha_exercicios}
                        userId={user?.id ?? null}
                        onRegisterExecution={handleRegisterExecution}
                        registerStatus={registerStatus}
                      />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/40 p-6 text-center text-[rgb(var(--text-secondary))] dark:border-slate-800">
                        <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                          Nenhum exercicio vinculado a este treino.
                        </p>
                        <p className="mt-2 text-sm">
                          Inclua registros em <code>ficha_exercicios</code> relacionando-os ao {treinoReferencia}.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FichaExercisesTable({ exercicios = [], userId = null, onRegisterExecution = null, registerStatus = {} }) {
  const items = Array.isArray(exercicios) ? exercicios : [];
  const [timerModal, setTimerModal] = useState(createEmptyTimerState);
  const audioRef = useRef(null);
  const audioPlayedRef = useRef(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [loadValues, setLoadValues] = useState(() =>
    items.reduce((acc, item) => {
      acc[item.id] = item.carga ?? "";
      return acc;
    }, {}),
  );
  const [savingLoad, setSavingLoad] = useState({});
  const [loadError, setLoadError] = useState(null);
  const debounceTimersRef = useRef(new Map());
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    setLoadValues(
      items.reduce((acc, item) => {
        acc[item.id] = item.carga ?? "";
        return acc;
      }, {}),
    );
  }, [items]);

  useEffect(() => {
    if (!userId || items.length === 0) {
      setSuggestions({});
      return undefined;
    }
    const payload = items.map((item) => ({
      exercicioId: item.exercicio_id ?? item.exercicio?.id,
      targetReps: item.repeticoes ?? null,
    }));
    let active = true;
    getExerciseLoadSuggestions({ usuarioId: userId, exercises: payload })
      .then((data) => {
        if (active) setSuggestions(data ?? {});
      })
      .catch((error) => console.error("[FichaExercisesTable] erro sugestoes:", error));
    return () => {
      active = false;
    };
  }, [items, userId]);

  useEffect(() => {
    if (!userId || items.length === 0) return undefined;
    let active = true;
    const ids = items.map((item) => item.id).filter(Boolean);
    listExercisePreferences({ usuarioId: userId, fichaExercicioIds: ids })
      .then((prefs) => {
        if (!active) return;
        const map = new Map(prefs.map((pref) => [pref.ficha_exercicio_id, pref]));
        setLoadValues(
          items.reduce((acc, item) => {
            const pref = map.get(item.id);
            acc[item.id] = pref?.carga_sugerida ?? item.carga ?? "";
            return acc;
          }, {}),
        );
      })
      .catch((error) => {
        console.error("[FichaExercisesTable] erro ao carregar preferencias:", error);
      });
    return () => {
      active = false;
    };
  }, [items, userId]);

  const handleLoadChange = (exercise, value) => {
    setLoadValues((prev) => ({ ...prev, [exercise.id]: value }));
    setLoadError(null);
    scheduleSaveLoad(exercise, value);
  };

  const scheduleSaveLoad = (exercise, value) => {
    if (!userId) return;
    const existing = debounceTimersRef.current.get(exercise.id);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      saveLoad(exercise, value);
      debounceTimersRef.current.delete(exercise.id);
    }, 500);
    debounceTimersRef.current.set(exercise.id, timer);
  };

  const saveLoad = async (exercise, valueOverride = null) => {
    if (!userId) {
      setLoadError("Entre para salvar a carga nos seus favoritos.");
      return;
    }
    setSavingLoad((prev) => ({ ...prev, [exercise.id]: true }));
    try {
      const raw = valueOverride ?? loadValues[exercise.id] ?? "";
      const parsed = typeof raw === "string" ? raw.replace(",", ".").trim() : "";
      const cargaValue = parsed ? Number.parseFloat(parsed) : null;
      await upsertExercisePreference({
        usuarioId: userId,
        exercicioId: exercise.exercicio_id ?? exercise.exercicio?.id,
        fichaExercicioId: exercise.id,
        cargaSugerida: Number.isFinite(cargaValue) ? cargaValue : null,
        repeticoes: exercise.repeticoes ?? null,
        series: exercise.series ?? null,
      });
    } catch (error) {
      console.error("[FichaExercisesTable] erro ao salvar carga sugerida:", error);
      setLoadError(error?.message ?? "Nao foi possivel salvar a carga agora.");
    } finally {
      setSavingLoad((prev) => ({ ...prev, [exercise.id]: false }));
    }
  };

  const prepareAudioElement = useCallback((audioUrl) => {
    if (!audioUrl || typeof window === "undefined" || typeof Audio === "undefined") {
      return null;
    }
    const element = new Audio(audioUrl);
    if (/^https?:/i.test(audioUrl)) {
      element.crossOrigin = "anonymous";
    }
    element.preload = "auto";
    element.muted = true;
    element.volume = 0;
    const warmup = element.play();
    const resetAudio = () => {
      try {
        element.pause();
        element.currentTime = 0;
      } catch {
        // ignore
      }
      element.muted = false;
      element.volume = 1;
    };
    if (warmup?.then) {
      warmup.then(resetAudio).catch(resetAudio);
    } else {
      resetAudio();
    }
    return element;
  }, []);

  const startTimer = useCallback((exerciseName, restSeconds) => {
    const sanitized = Number.isFinite(restSeconds) && restSeconds > 0 ? Math.round(restSeconds) : null;
    if (!sanitized) return;
    audioPlayedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    const nextAudioUrl = pickRandomAudioUrl();
    const preparedAudio = prepareAudioElement(nextAudioUrl);
    audioRef.current = preparedAudio;
    setTimerModal({
      open: true,
      exerciseName: exerciseName ?? "Descanso",
      duration: sanitized,
      secondsLeft: sanitized,
      audioUrl: nextAudioUrl,
    });
  }, [prepareAudioElement]);

  const closeTimer = useCallback(() => {
    setTimerModal(createEmptyTimerState());
  }, []);

  const restartTimer = useCallback(() => {
    setTimerModal((prev) => {
      if (!prev.duration) return prev;
      const nextAudioUrl = pickRandomAudioUrl();
      const newAudio = prepareAudioElement(nextAudioUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current = newAudio;
      return {
        ...prev,
        secondsLeft: prev.duration,
        audioUrl: nextAudioUrl,
      };
    });
    audioPlayedRef.current = false;
  }, [prepareAudioElement]);

  useEffect(() => {
    if (!timerModal.open || timerModal.secondsLeft <= 0) return undefined;
    const intervalId = setInterval(() => {
      setTimerModal((prev) => {
        if (!prev.open || prev.secondsLeft <= 0) return prev;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timerModal.open, timerModal.secondsLeft]);

  useEffect(() => {
    if (!timerModal.open) {
      audioPlayedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      return;
    }
    if (timerModal.secondsLeft === 0 && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      if (audioRef.current) {
        audioRef.current.volume = 1;
        audioRef.current.play().catch(() => {});
      } else if (timerModal.audioUrl && typeof Audio !== "undefined") {
        const fallback = new Audio(timerModal.audioUrl);
        audioRef.current = fallback;
        fallback.play().catch(() => {});
      }
    }
  }, [timerModal.open, timerModal.secondsLeft, timerModal.audioUrl]);

  return (
    <div className="overflow-x-auto rounded-[28px] border border-white/20 bg-white/70 shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
      <table className="min-w-full text-sm">
        <thead className="bg-white/80 text-left text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] dark:bg-slate-900/40">
          <tr>
            <th className="px-4 py-3">Cronometro</th>
            <th className="px-4 py-3">Exercicio</th>
          <th className="px-4 py-3">Series</th>
          <th className="px-4 py-3">Repeticoes</th>
          <th className="px-4 py-3">Carga</th>
          <th className="px-4 py-3">Descanso</th>
          <th className="px-4 py-3">Observacoes</th>
          <th className="px-4 py-3 text-right">Acoes</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const exercicioMeta = item.exercicios ?? item.exercicio ?? {};
            const parsedRest = Number(item.descanso_segundos);
            const hasRestTime = Number.isFinite(parsedRest) && parsedRest > 0;
            const restSeconds = hasRestTime ? parsedRest : null;

            return (
              <tr key={item.id} className="border-t border-white/40 text-[rgb(var(--text-primary))] dark:border-slate-800">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => startTimer(exercicioMeta?.nome ?? "Exercicio", restSeconds)}
                    disabled={!restSeconds}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      restSeconds
                        ? "border-[#32C5FF]/60 text-[#032840] hover:border-[#32C5FF] hover:bg-[#32C5FF]/10"
                        : "cursor-not-allowed border-white/30 text-[rgb(var(--text-secondary))]"
                    }`}
                  >
                    {restSeconds ? `Iniciar ${restSeconds}s` : "Definir descanso"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{exercicioMeta?.nome ?? "Exercicio sem nome"}</p>
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    {exercicioMeta?.grupo ?? "Grupo livre"}
                    {exercicioMeta?.equipamento ? ` - ${exercicioMeta.equipamento}` : ""}
                  </p>
                </td>
              <td className="px-4 py-3">{item.series ?? "—"}</td>
              <td className="px-4 py-3">{item.repeticoes ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={loadValues[item.id] ?? ""}
                    onChange={(event) => handleLoadChange(item, event.target.value)}
                    onBlur={() => saveLoad(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveLoad(item);
                      }
                    }}
                    className="w-24 rounded-lg border border-white/30 bg-white/70 px-2 py-1 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:bg-slate-900 dark:text-white"
                    placeholder="Carga"
                    disabled={savingLoad[item.id]}
                  />
                  <span className="text-xs text-[rgb(var(--text-secondary))]">kg</span>
                </div>
                {(() => {
                  const suggestion = suggestions[item.exercicio_id ?? item.exercicio?.id];
                  if (!suggestion?.suggestedLoad) return null;
                  const basisLabel =
                    suggestion.basis === "history"
                      ? "histórico recente"
                      : suggestion.basis === "pr"
                        ? "PR ajustado"
                        : "sugestão";
                  return (
                    <p className="mt-1 text-[11px] text-[rgb(var(--text-secondary))]">
                      Sugestão: {suggestion.suggestedLoad} kg ({basisLabel}
                      {suggestion.target?.max ? ` · alvo ${suggestion.target.min || ""}-${suggestion.target.max} reps` : ""})
                    </p>
                  );
                })()}
              </td>
              <td className="px-4 py-3">{item.descanso_segundos ? `${item.descanso_segundos}s` : "Conforme sentir"}</td>
              <td className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">{item.observacoes ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {exercicioMeta?.video_url ? (
                  <a
                    href={exercicioMeta.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#32C5FF] px-3 py-1 text-xs font-semibold text-[#32C5FF] transition hover:bg-[#32C5FF]/10"
                  >
                    Ver video
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="text-xs text-[rgb(var(--text-secondary))]">Sem video</span>
                )}
                <div className="mt-2 flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onRegisterExecution?.(item, {
                        series: item.series ?? null,
                        repeticoes: item.repeticoes ?? null,
                        carga: loadValues[item.id] ? Number(loadValues[item.id]) : item.carga ?? null,
                      })
                    }
                    disabled={!userId}
                    className="inline-flex items-center gap-2 rounded-full border border-[#32C5FF]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#32C5FF] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Registrar
                  </button>
                  {registerStatus[item.id] === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Registrado
                    </span>
                  ) : null}
                  {!userId ? (
                    <span className="text-[10px] text-[rgb(var(--text-secondary))]">Entre para registrar</span>
                  ) : null}
                </div>
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {loadError ? (
        <p className="px-4 py-2 text-xs text-rose-500 dark:text-rose-300">{loadError}</p>
      ) : null}
      {Array.from(Object.entries(savingLoad)).some(([, value]) => value) ? (
        <p className="px-4 py-2 text-[11px] text-[rgb(var(--text-secondary))]">Salvando carga...</p>
      ) : null}
      {timerModal.open && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-8">
              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 text-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">Descanso</p>
                    <p className="text-lg font-semibold text-white/90">{timerModal.exerciseName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeTimer}
                    className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/60"
                  >
                    Fechar
                  </button>
                </div>
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">Tempo restante</p>
                  <p className="mt-6 font-mono text-6xl font-bold">{formatCountdown(timerModal.secondsLeft)}</p>
                  <p className="mt-6 text-sm text-white/70">
                    {timerModal.secondsLeft > 0 ? "Concentre a respiracao e prepare a proxima serie." : "Descanso concluido! Bora para a proxima execucao."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-white/10 px-6 py-4">
                  <button
                    type="button"
                    onClick={restartTimer}
                    disabled={!timerModal.duration}
                    className="flex-1 rounded-2xl border border-[#32C5FF]/60 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#32C5FF] transition enabled:hover:border-[#32C5FF] enabled:hover:bg-[#32C5FF]/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
                  >
                    Repetir
                  </button>
                  <button
                    type="button"
                    onClick={closeTimer}
                    className="flex-1 rounded-2xl border border-white/30 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </div>
  );
}

function pickRandomAudioUrl() {
  if (!AUDIO_SOURCES.length) return null;
  const index = Math.floor(Math.random() * AUDIO_SOURCES.length);
  return AUDIO_SOURCES[index];
}

function normalizeAudioSource(rawLink) {
  if (!rawLink) return null;
  const trimmed = rawLink.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    const driveDirectId = trimmed.match(/\/d\/([^/]+)(?:\/|$)/i);
    if (driveDirectId?.[1]) {
      return `https://docs.googleusercontent.com/uc?export=download&id=${driveDirectId[1]}`;
    }
    const driveQueryId = trimmed.match(/[?&]id=([^&]+)/i);
    if (driveQueryId?.[1]) {
      return `https://docs.googleusercontent.com/uc?export=download&id=${driveQueryId[1]}`;
    }
    return trimmed;
  }
  const sanitized = trimmed.replace(/^\.?\//, "");
  return `/${sanitized}`;
}

function createEmptyTimerState() {
  return {
    open: false,
    exerciseName: "",
    duration: 0,
    secondsLeft: 0,
    audioUrl: null,
  };
}

function formatCountdown(totalSeconds) {
  const safeValue = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
