import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { listWorkouts } from "../services/workouts.js";
import { SAMPLE_WORKOUTS } from "../data/fitness.js";

export function useWorkoutsCatalog({ limit = 24, status = "ativo", search = "", offset = 0 } = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fallbackWarnedRef = useRef(false);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data, count } = await listWorkouts({ limit, status, search, offset });
      setItems(data);
      setTotal(typeof count === "number" ? count : (data ?? []).length);
    } catch (err) {
      console.error("[useWorkoutsCatalog] erro ao carregar treinos:", err);
      const message = err?.message ?? "Não foi possível carregar os treinos.";
      setError(message);
      if (!fallbackWarnedRef.current) {
        toast.custom(
          (t) => (
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
              <p className="text-sm font-semibold">Sem conexão com o banco ainda</p>
              <p className="text-xs text-white/70">{message}</p>
              <p className="mt-2 text-xs text-white/80">Mostrando treinos demonstrativos do MEU SHAPE.</p>
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

      const normalizedSearch = search.trim().toLowerCase();
      const fallbackFiltered = normalizedSearch
        ? SAMPLE_WORKOUTS.filter(
            (workout) =>
              workout.name.toLowerCase().includes(normalizedSearch) ||
              workout.goal.toLowerCase().includes(normalizedSearch) ||
              workout.focus.toLowerCase().includes(normalizedSearch),
          )
        : SAMPLE_WORKOUTS;
      const sliced = limit > 0 ? fallbackFiltered.slice(offset, offset + limit) : fallbackFiltered;
      setItems(sliced);
      setTotal(fallbackFiltered.length);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search, status]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return {
    items,
    total,
    loading,
    error,
    reload: fetchWorkouts,
  };
}
