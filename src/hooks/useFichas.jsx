import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { listFichas } from "../services/fichas.js";
import { SAMPLE_WORKOUTS } from "../data/fitness.js";

const DEFAULT_ERROR_MESSAGE = "Nao foi possivel carregar as fichas de treino.";

function normalizeString(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesFilters(item, filters) {
  const {
    visibilidade,
    templatesOnly,
    communityOnly,
    usuarioId,
    excludeUsuarioId,
  } = filters;

  if (visibilidade && item.visibilidade !== visibilidade) {
    return false;
  }
  if (templatesOnly && item.usuario_id !== null) {
    return false;
  }
  if (communityOnly && (item.usuario_id === null || item.usuario_id === undefined)) {
    return false;
  }
  if (typeof usuarioId === "string" && usuarioId) {
    return item.usuario_id === usuarioId;
  }
  if (usuarioId === null) {
    return item.usuario_id === null;
  }
  if (excludeUsuarioId && item.usuario_id === excludeUsuarioId) {
    return false;
  }
  return true;
}

export function useFichas({
  search = "",
  limit = 50,
  offset = 0,
  visibilidade,
  templatesOnly = false,
  communityOnly = false,
  usuarioId,
  excludeUsuarioId,
  enabled = true,
} = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fallbackWarnedRef = useRef(false);

  const fetchFichas = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { items: data, count } = await listFichas({
        search,
        limit,
        offset,
        visibilidade,
        templatesOnly,
        communityOnly,
        usuarioId,
        excludeUsuarioId,
      });
      setItems(data);
      setTotal(typeof count === "number" ? count : data.length);
    } catch (err) {
      console.error("[useFichas] erro ao carregar fichas:", err);
      const message = err?.message ?? DEFAULT_ERROR_MESSAGE;
      setError(message);

      if (!fallbackWarnedRef.current) {
        toast.custom(
          (t) => (
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
              <p className="text-sm font-semibold">Conexao indisponivel</p>
              <p className="text-xs text-white/70">{message}</p>
              <p className="mt-2 text-xs text-white/80">Mostrando fichas demonstrativas por enquanto.</p>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="mt-3 inline-flex rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold"
              >
                Entendi
              </button>
            </div>
          ),
          { duration: 6000 },
        );
        fallbackWarnedRef.current = true;
      }

      const fallbackItems = SAMPLE_WORKOUTS.map((workout, index) => ({
        id: workout.id,
        nome: workout.name,
        descricao: workout.summary,
        objetivo: workout.goal,
        nivel: workout.level,
        foco: workout.focus,
        dias_semana: workout.days,
        thumbnail_url: workout.thumbnail,
        video_capa_url: workout.heroVideo,
        usuario_id: index % 3 === 0 ? null : `demo-user-${index % 5}`,
        visibilidade: index % 4 === 0 ? "privada" : "publica",
      }));

      const normalizedSearch = normalizeString(search);
      const filteredFallback = fallbackItems.filter((item) => {
        if (normalizedSearch) {
          const name = normalizeString(item.nome);
          const goal = normalizeString(item.objetivo);
          if (!name.includes(normalizedSearch) && !goal.includes(normalizedSearch)) {
            return false;
          }
        }
        return matchesFilters(item, {
          visibilidade,
          templatesOnly,
          communityOnly,
          usuarioId,
          excludeUsuarioId,
        });
      });

      const sliced = limit > 0 ? filteredFallback.slice(offset, offset + limit) : filteredFallback;
      setItems(sliced);
      setTotal(filteredFallback.length);
    } finally {
      setLoading(false);
    }
  }, [
    communityOnly,
    enabled,
    excludeUsuarioId,
    limit,
    offset,
    search,
    templatesOnly,
    usuarioId,
    visibilidade,
  ]);

  useEffect(() => {
    fetchFichas();
  }, [fetchFichas]);

  return {
    items,
    total,
    loading,
    error,
    reload: fetchFichas,
  };
}
