import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const PERIODS = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "custom", label: "Custom" },
];

const GROUP_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "peito", label: "Peito" },
  { value: "costas", label: "Costas" },
  { value: "ombros", label: "Ombros" },
  { value: "pernas", label: "Pernas" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "abdomen", label: "Abdomen" },
  { value: "gluteos", label: "Gluteos" },
  { value: "cardio", label: "Cardio" },
  { value: "fullbody", label: "Full body" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const safe = new Date(`${value}T00:00:00`);
  if (Number.isNaN(safe.getTime())) return value;
  return safe.toLocaleDateString("pt-BR");
};

const formatNumber = (value, digits = 0) => {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
};

const normalizeString = (value) => {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const parseRepsRange = (value) => {
  if (!value) return { min: null, max: null, avg: null };
  const matches = String(value).match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return { min: null, max: null, avg: null };
  const nums = matches.map((item) => Number(item.replace(",", "."))).filter((num) => Number.isFinite(num));
  if (nums.length === 0) return { min: null, max: null, avg: null };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = (min + max) / 2;
  return { min, max, avg };
};

const toISODate = (date) => date.toISOString().slice(0, 10);

const buildPeriodRange = (period, customStart, customEnd) => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);

  if (period === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (period === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (period === "custom" && customStart && customEnd) {
    const safeStart = new Date(`${customStart}T00:00:00`);
    const safeEnd = new Date(`${customEnd}T00:00:00`);
    if (!Number.isNaN(safeStart.getTime())) start.setTime(safeStart.getTime());
    if (!Number.isNaN(safeEnd.getTime())) end.setTime(safeEnd.getTime());
  }

  return { start: toISODate(start), end: toISODate(end) };
};

const buildSparkPath = (values, width, height) => {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x} ${y}`;
    })
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point}`)
    .join(" ");
};

const formatDelta = (value, unit = "") => {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit}`;
};

const getLoad = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

const calcVolume = (series, repsAvg, load) => {
  if (!Number.isFinite(series) || !Number.isFinite(repsAvg) || !Number.isFinite(load)) return null;
  return series * repsAvg * load;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [fichaFilter, setFichaFilter] = useState("");
  const [onlyPR, setOnlyPR] = useState(false);
  const [onlyIncrease, setOnlyIncrease] = useState(false);
  const [activeTab, setActiveTab] = useState("treinos");
  const [detailTreinoId, setDetailTreinoId] = useState(null);
  const [exerciseHistoryId, setExerciseHistoryId] = useState(null);

  const [treinosState, setTreinosState] = useState({ loading: false, error: null, items: [] });
  const [execucoesState, setExecucoesState] = useState({ loading: false, error: null, items: [] });
  const [prState, setPrState] = useState({ loading: false, items: [] });
  const [fichasState, setFichasState] = useState({ loading: false, items: [] });

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const { start, end } = useMemo(() => buildPeriodRange(period, customStart, customEnd), [customEnd, customStart, period]);

  useEffect(() => {
    if (!user?.id) {
      setFichasState({ loading: false, items: [] });
      return;
    }
    let active = true;
    const loadFichas = async () => {
      setFichasState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await supabase
        .from("fichas")
        .select("id, nome")
        .eq("usuario_id", user.id)
        .order("nome", { ascending: true })
        .limit(200);
      if (!active) return;
      if (error) {
        setFichasState({ loading: false, items: [] });
        return;
      }
      setFichasState({ loading: false, items: data ?? [] });
    };
    loadFichas();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setTreinosState({ loading: false, error: null, items: [] });
      setExecucoesState({ loading: false, error: null, items: [] });
      setPrState({ loading: false, items: [] });
      return;
    }
    let active = true;
    const load = async () => {
      setTreinosState({ loading: true, error: null, items: [] });
      setExecucoesState({ loading: true, error: null, items: [] });
      setPrState((prev) => ({ ...prev, loading: true }));
      try {
        const baseSelect = "id, data, duracao_minutos, calorias_queimadas, ficha_id, ficha:fichas(id, nome), treino_nome";
        const extendedSelect = `${baseSelect}, volume_total_kg, total_series, total_exercicios, rpe`;
        let treinoResponse = await supabase
          .from("treinos_concluidos")
          .select(extendedSelect)
          .eq("usuario_id", user.id)
          .gte("data", start)
          .lte("data", end)
          .order("data", { ascending: false });

        if (treinoResponse.error) {
          treinoResponse = await supabase
            .from("treinos_concluidos")
            .select(baseSelect)
            .eq("usuario_id", user.id)
            .gte("data", start)
            .lte("data", end)
            .order("data", { ascending: false });
        }

        if (treinoResponse.error) throw treinoResponse.error;
        const treinos = treinoResponse.data ?? [];
        const treinoIds = treinos.map((item) => item.id).filter(Boolean);

        let execucoes = [];
        if (treinoIds.length) {
          const { data, error } = await supabase
            .from("execucoes")
            .select(
              "id, treino_id, exercicio_id, series_executadas, repeticoes_executadas, carga_executada, criado_em, exercicio:exercicios(id, nome, grupo)",
            )
            .in("treino_id", treinoIds)
            .order("criado_em", { ascending: true });
          if (error) throw error;
          execucoes = data ?? [];
        }

        const { data: prs, error: prError } = await supabase
          .from("personal_records")
          .select("id, exercicio_id, data, carga, repeticoes")
          .eq("usuario_id", user.id)
          .gte("data", start)
          .lte("data", end);
        if (prError) throw prError;

        if (!active) return;
        setTreinosState({ loading: false, error: null, items: treinos });
        setExecucoesState({ loading: false, error: null, items: execucoes });
        setPrState({ loading: false, items: prs ?? [] });
      } catch (error) {
        if (!active) return;
        setTreinosState({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar o historico.",
          items: [],
        });
        setExecucoesState({ loading: false, error: error?.message ?? "", items: [] });
        setPrState({ loading: false, items: [] });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [end, start, user?.id]);

  const execucoesNormalized = useMemo(() => {
    const treinoMap = new Map(treinosState.items.map((item) => [item.id, item]));
    return execucoesState.items.map((item) => {
      const treino = treinoMap.get(item.treino_id) ?? {};
      const reps = parseRepsRange(item.repeticoes_executadas);
      const series = Number(item.series_executadas) || 0;
      const load = getLoad(item.carga_executada);
      const repsAvg = Number.isFinite(reps.avg) ? reps.avg : null;
      const volume = calcVolume(series, repsAvg, load);
      return {
        id: item.id,
        treinoId: item.treino_id,
        treinoDate: treino.data,
        treino,
        exercicioId: item.exercicio_id,
        exercicio: item.exercicio,
        series,
        reps,
        load,
        volume,
        createdAt: item.criado_em,
      };
    });
  }, [execucoesState.items, treinosState.items]);

  const execucoesByTreino = useMemo(() => {
    const map = new Map();
    execucoesNormalized.forEach((item) => {
      const list = map.get(item.treinoId) ?? [];
      list.push(item);
      map.set(item.treinoId, list);
    });
    return map;
  }, [execucoesNormalized]);

  const exerciseHistory = useMemo(() => {
    const map = new Map();
    execucoesNormalized.forEach((item) => {
      if (!item.exercicioId) return;
      const list = map.get(item.exercicioId) ?? [];
      list.push(item);
      map.set(item.exercicioId, list);
    });
    map.forEach((list, key) => {
      list.sort((a, b) => {
        const dateA = new Date(`${a.treinoDate}T00:00:00`).getTime();
        const dateB = new Date(`${b.treinoDate}T00:00:00`).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
      map.set(key, list);
    });
    return map;
  }, [execucoesNormalized]);

  const execucaoPrevMap = useMemo(() => {
    const map = new Map();
    exerciseHistory.forEach((list) => {
      list.forEach((entry, index) => {
        if (index === 0) return;
        map.set(entry.id, list[index - 1]);
      });
    });
    return map;
  }, [exerciseHistory]);

  const prKeySet = useMemo(() => {
    const set = new Set();
    prState.items.forEach((record) => {
      if (!record?.data || !record?.exercicio_id) return;
      set.add(`${record.data}|${record.exercicio_id}`);
    });
    return set;
  }, [prState.items]);

  const treinoSummaries = useMemo(() => {
    return treinosState.items.map((treino) => {
      const execs = execucoesByTreino.get(treino.id) ?? [];
      const uniqueExercises = new Set(execs.map((item) => item.exercicioId).filter(Boolean));
      const totalSeries = execs.reduce((sum, item) => sum + (item.series || 0), 0);
      const totalReps = execs.reduce((sum, item) => {
        if (!Number.isFinite(item.reps?.avg) || !Number.isFinite(item.series)) return sum;
        return sum + item.series * item.reps.avg;
      }, 0);
      const totalVolume = execs.reduce((sum, item) => sum + (item.volume || 0), 0);
      const hasLoadIncrease = execs.some((item) => {
        const prev = execucaoPrevMap.get(item.id);
        if (!prev || !Number.isFinite(item.load) || !Number.isFinite(prev.load)) return false;
        return item.load > prev.load;
      });
      const hasPR = execs.some((item) => item.exercicioId && prKeySet.has(`${treino.data}|${item.exercicioId}`));
      return {
        ...treino,
        execucoes: execs,
        totalSeries: Number.isFinite(treino.total_series) ? treino.total_series : totalSeries,
        totalReps,
        totalVolume: Number.isFinite(treino.volume_total_kg) ? treino.volume_total_kg : totalVolume,
        totalExercicios: Number.isFinite(treino.total_exercicios) ? treino.total_exercicios : uniqueExercises.size,
        hasLoadIncrease,
        hasPR,
      };
    });
  }, [execucaoPrevMap, execucoesByTreino, prKeySet, treinosState.items]);

  const filteredTreinos = useMemo(() => {
    const groupValue = normalizeString(groupFilter);
    const searchTerm = normalizeString(exerciseSearch);
    return treinoSummaries.filter((treino) => {
      if (fichaFilter && treino.ficha_id !== fichaFilter) return false;
      if (onlyPR && !treino.hasPR) return false;
      if (onlyIncrease && !treino.hasLoadIncrease) return false;
      if (groupValue !== "all" || searchTerm) {
        const matches = treino.execucoes.some((exec) => {
          const exerciseName = normalizeString(exec.exercicio?.nome);
          const groupName = normalizeString(exec.exercicio?.grupo);
          const groupOk = groupValue === "all" ? true : groupName === groupValue;
          const searchOk = searchTerm ? exerciseName.includes(searchTerm) : true;
          return groupOk && searchOk;
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [exerciseSearch, fichaFilter, groupFilter, onlyIncrease, onlyPR, treinoSummaries]);

  const kpis = useMemo(() => {
    const totals = filteredTreinos.reduce(
      (acc, treino) => {
        acc.treinos += 1;
        acc.volume += treino.totalVolume || 0;
        acc.series += treino.totalSeries || 0;
        acc.reps += treino.totalReps || 0;
        return acc;
      },
      { treinos: 0, volume: 0, series: 0, reps: 0 },
    );
    const prCount = prState.items.length;
    return { ...totals, prs: prCount };
  }, [filteredTreinos, prState.items.length]);

  const exercisesAggregated = useMemo(() => {
    const groupValue = normalizeString(groupFilter);
    const searchTerm = normalizeString(exerciseSearch);
    const data = [];

    exerciseHistory.forEach((entries, exerciseId) => {
      if (!entries.length) return;
      const exerciseMeta = entries[0].exercicio || {};
      const exerciseName = normalizeString(exerciseMeta.nome);
      const groupName = normalizeString(exerciseMeta.grupo);

      if (groupValue !== "all" && groupName !== groupValue) return;
      if (searchTerm && !exerciseName.includes(searchTerm)) return;
      const hasPR = entries.some((entry) => prKeySet.has(`${entry.treinoDate}|${exerciseId}`));
      if (onlyPR && !hasPR) return;

      const last = entries[entries.length - 1];
      const prev = entries.length > 1 ? entries[entries.length - 2] : null;
      const bestLoad = Math.max(...entries.map((entry) => entry.load || 0));
      const volumeTotal = entries.reduce((sum, entry) => sum + (entry.volume || 0), 0);
      const trend =
        prev && Number.isFinite(last.load) && Number.isFinite(prev.load)
          ? last.load > prev.load
            ? "up"
            : last.load < prev.load
              ? "down"
              : "flat"
          : "flat";
      if (onlyIncrease && trend !== "up") return;
      data.push({
        exerciseId,
        name: exerciseMeta.nome ?? "Exercicio",
        group: exerciseMeta.grupo ?? "",
        lastDate: last.treinoDate,
        lastLoad: last.load,
        lastReps: last.reps,
        bestLoad: Number.isFinite(bestLoad) ? bestLoad : null,
        volumeTotal,
        trend,
        entries,
        hasPR,
      });
    });

    data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return data;
  }, [exerciseHistory, exerciseSearch, groupFilter, onlyIncrease, onlyPR, prKeySet]);

  const selectedTreino = useMemo(
    () => filteredTreinos.find((item) => item.id === detailTreinoId) ?? null,
    [detailTreinoId, filteredTreinos],
  );
  const selectedExercise = useMemo(
    () => exercisesAggregated.find((item) => item.exerciseId === exerciseHistoryId) ?? null,
    [exerciseHistoryId, exercisesAggregated],
  );

  const treinoExerciseRows = useMemo(() => {
    if (!selectedTreino) return [];
    const grouped = new Map();
    selectedTreino.execucoes.forEach((entry) => {
      if (!entry.exercicioId) return;
      const existing = grouped.get(entry.exercicioId) || {
        id: entry.exercicioId,
        name: entry.exercicio?.nome ?? "Exercicio",
        group: entry.exercicio?.grupo ?? "",
        series: 0,
        repsMin: null,
        repsMax: null,
        loadMin: null,
        loadMax: null,
        volume: 0,
        prev: execucaoPrevMap.get(entry.id) ?? null,
      };
      existing.series += entry.series || 0;
      if (Number.isFinite(entry.reps.min)) {
        existing.repsMin = existing.repsMin === null ? entry.reps.min : Math.min(existing.repsMin, entry.reps.min);
      }
      if (Number.isFinite(entry.reps.max)) {
        existing.repsMax = existing.repsMax === null ? entry.reps.max : Math.max(existing.repsMax, entry.reps.max);
      }
      if (Number.isFinite(entry.load)) {
        existing.loadMin = existing.loadMin === null ? entry.load : Math.min(existing.loadMin, entry.load);
        existing.loadMax = existing.loadMax === null ? entry.load : Math.max(existing.loadMax, entry.load);
      }
      if (Number.isFinite(entry.volume)) {
        existing.volume += entry.volume;
      }
      grouped.set(entry.exercicioId, existing);
    });
    return Array.from(grouped.values());
  }, [execucaoPrevMap, selectedTreino]);

  const treinoHighlights = useMemo(() => {
    if (!selectedTreino) return [];
    const insights = [];
    treinoExerciseRows.forEach((row) => {
      const prev = row.prev;
      if (!prev || !Number.isFinite(row.loadMax) || !Number.isFinite(prev.load)) return;
      const delta = row.loadMax - prev.load;
      if (delta > 0) {
        insights.push(`+${formatNumber(delta, 1)} kg em ${row.name} vs ultima sessao.`);
      }
      if (Number.isFinite(row.volume) && Number.isFinite(prev.volume)) {
        const deltaVol = ((row.volume - prev.volume) / Math.max(prev.volume, 1)) * 100;
        if (deltaVol > 5) {
          insights.push(`Volume +${Math.round(deltaVol)}% em ${row.name} vs ultima sessao.`);
        }
      }
    });
    return insights.slice(0, 3);
  }, [selectedTreino, treinoExerciseRows]);

  const rangeLabel = useMemo(() => `${formatDate(start)} a ${formatDate(end)}`, [end, start]);
  const hasFilters = Boolean(fichaFilter || exerciseSearch || groupFilter !== "all" || onlyPR || onlyIncrease);

  return (
    <div className="space-y-10">
      <section
        className="rounded-[32px] border border-[color:var(--border-soft)] p-6 text-[rgb(var(--text-primary))] shadow-2xl lg:p-10"
        style={{
          backgroundColor: "rgb(var(--surface-card))",
          backgroundImage:
            "linear-gradient(140deg, rgba(var(--color-accent-primary), 0.18), rgba(var(--color-secondary-primary), 0.12)), radial-gradient(circle at 10% 10%, rgba(var(--color-accent-primary), 0.12), transparent 60%)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Historico do treino</p>
        <h1 className="mt-3 text-3xl font-semibold">Resumo por treino + analise por exercicio.</h1>
        <p className="mt-4 max-w-3xl text-[rgb(var(--text-secondary))]">
          Acompanhe volumes, series, PRs e evolucao por exercicio. Filtros rapidos e drill-down estilo Strava do treino.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <KpiCard label="Treinos no periodo" value={formatNumber(kpis.treinos)} />
        <KpiCard label="Volume total (kg)" value={formatNumber(Math.round(kpis.volume))} />
        <KpiCard label="Series" value={formatNumber(Math.round(kpis.series))} />
        <KpiCard label="Reps" value={formatNumber(Math.round(kpis.reps))} />
        <KpiCard label="PRs batidos" value={formatNumber(kpis.prs)} />
      </section>

      <section className="rounded-[32px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Filtros rapidos</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Periodo e segmentacao</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Periodo atual: {rangeLabel}</p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setGroupFilter("all");
                setExerciseSearch("");
                setFichaFilter("");
                setOnlyPR(false);
                setOnlyIncrease(false);
              }}
              className="rounded-2xl border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[rgb(var(--text-secondary))] transition hover:border-[rgba(var(--color-accent-primary),0.6)]"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPeriod(option.id)}
                className={`rounded-full border px-4 py-2 transition ${
                  period === option.id
                    ? "border-[rgb(var(--color-accent-primary))] bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--text-primary))]"
                    : "border-[color:var(--border-strong)] text-[rgb(var(--text-secondary))] hover:border-[rgba(var(--color-accent-primary),0.5)]"
                }`}
              >
                {option.label}
              </button>
            ))}
            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-full border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/90 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-primary))]"
                />
                <span className="text-[11px] text-[rgb(var(--text-secondary))]">ate</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-full border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/90 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-primary))]"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Grupo muscular</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GROUP_OPTIONS.map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => setGroupFilter(group.value)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                      groupFilter === group.value
                        ? "border-[rgb(var(--color-accent-primary))] bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--text-primary))]"
                        : "border-[color:var(--border-strong)] text-[rgb(var(--text-secondary))] hover:border-[rgba(var(--color-accent-primary),0.5)]"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Exercicio</span>
              <input
                type="search"
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
                placeholder="Buscar exercicio"
                className="w-full rounded-2xl border border-[color:var(--border-strong)] bg-[rgb(var(--surface-card))] px-4 py-3 text-sm outline-none focus:border-[rgb(var(--color-accent-primary))] focus:ring-[rgba(var(--color-accent-primary),0.2)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Ficha (opcional)</span>
              <select
                value={fichaFilter}
                onChange={(event) => setFichaFilter(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--border-strong)] bg-[rgb(var(--surface-card))] px-3 py-3 text-sm outline-none focus:border-[rgb(var(--color-accent-primary))]"
              >
                <option value="">Todas</option>
                {fichasState.items.map((ficha) => (
                  <option key={ficha.id} value={ficha.id}>
                    {ficha.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <ToggleChip active={onlyPR} onClick={() => setOnlyPR((prev) => !prev)}>
              Somente PR
            </ToggleChip>
            <ToggleChip active={onlyIncrease} onClick={() => setOnlyIncrease((prev) => !prev)}>
              Somente com aumento de carga
            </ToggleChip>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Historico</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Resumo e detalhamento</h2>
          </div>
          <div className="inline-flex rounded-full border border-[color:var(--border-strong)] bg-[rgb(var(--surface-card))]/80 p-1 text-xs font-semibold">
            {[
              { id: "treinos", label: "Treinos" },
              { id: "exercicios", label: "Exercicios" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === tab.id
                    ? "bg-[rgb(var(--color-accent-primary))] text-[rgb(var(--text-primary))]"
                    : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {treinosState.loading ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[rgba(var(--color-accent-primary),0.4)] bg-[rgb(var(--surface-card))]/80 px-5 py-6 text-sm text-[rgb(var(--text-secondary))]">
            Carregando historico...
          </p>
        ) : treinosState.error ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[#FF8F8F]/40 bg-white/70 px-5 py-6 text-sm text-[#b00020]">
            {treinosState.error}
          </p>
        ) : activeTab === "treinos" ? (
          <div className="mt-6 overflow-x-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/80 shadow-inner">
            <table className="min-w-full text-left text-sm text-[rgb(var(--text-secondary))]">
              <thead>
                <tr className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Ficha</th>
                  <th className="px-4 py-3">Treino</th>
                  <th className="px-4 py-3">Duracao</th>
                  <th className="px-4 py-3">Volume (kg)</th>
                  <th className="px-4 py-3">Series</th>
                  <th className="px-4 py-3">Exercicios</th>
                  <th className="px-4 py-3">RPE</th>
                  <th className="px-4 py-3 text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {filteredTreinos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-sm text-[rgb(var(--text-secondary))]">
                      Nenhum treino encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTreinos.map((treino) => (
                    <tr key={treino.id} className="border-t border-[color:var(--border-soft)]">
                      <td className="px-4 py-3 font-semibold text-[rgb(var(--text-primary))]">{formatDate(treino.data)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[rgb(var(--text-primary))]">{treino.ficha?.nome ?? "Ficha livre"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[rgb(var(--text-primary))]">
                          {treino.treino_nome ?? treino.treino_label ?? "Treino"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{treino.duracao_minutos ? `${treino.duracao_minutos} min` : "—"}</td>
                      <td className="px-4 py-3">{formatNumber(Math.round(treino.totalVolume))}</td>
                      <td className="px-4 py-3">{formatNumber(Math.round(treino.totalSeries))}</td>
                      <td className="px-4 py-3">{formatNumber(treino.totalExercicios)}</td>
                      <td className="px-4 py-3">{treino.rpe ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailTreinoId(treino.id)}
                          className="rounded-full border border-[rgba(var(--color-accent-primary),0.6)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[rgb(var(--color-accent-primary))] transition hover:border-[rgb(var(--color-accent-primary))] hover:bg-[rgba(var(--color-accent-primary),0.1)]"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {exercisesAggregated.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(var(--color-accent-primary),0.4)] bg-[rgb(var(--surface-card))]/80 px-5 py-6 text-sm text-[rgb(var(--text-secondary))]">
                Nenhum exercicio encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/80 shadow-inner">
                <table className="min-w-full text-left text-sm text-[rgb(var(--text-secondary))]">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                      <th className="px-4 py-3">Exercicio</th>
                      <th className="px-4 py-3">Ultima execucao</th>
                      <th className="px-4 py-3">Melhor carga</th>
                      <th className="px-4 py-3">Volume 30d</th>
                      <th className="px-4 py-3">Tendencia</th>
                      <th className="px-4 py-3 text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercisesAggregated.map((item) => (
                      <tr key={item.exerciseId} className="border-t border-[color:var(--border-soft)]">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-[rgb(var(--text-primary))]">{item.name}</p>
                            <p className="text-xs text-[rgb(var(--text-subtle))]">{item.group || "Grupo livre"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{item.lastDate ? formatDate(item.lastDate) : "—"}</td>
                        <td className="px-4 py-3">
                          {Number.isFinite(item.bestLoad) ? `${formatNumber(item.bestLoad, 1)} kg` : "—"}
                        </td>
                        <td className="px-4 py-3">{formatNumber(Math.round(item.volumeTotal))}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              item.trend === "up"
                                ? "bg-emerald-100 text-emerald-600"
                                : item.trend === "down"
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExerciseHistoryId(item.exerciseId)}
                            className="rounded-full border border-[rgba(var(--color-accent-primary),0.6)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[rgb(var(--color-accent-primary))] transition hover:border-[rgb(var(--color-accent-primary))] hover:bg-[rgba(var(--color-accent-primary),0.1)]"
                          >
                            Ver historico
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {detailTreinoId && selectedTreino && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(3,10,24,0.55)] px-4 py-8 backdrop-blur-sm">
              <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/95 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-soft)] px-6 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Detalhes do treino</p>
                    <h3 className="mt-2 text-xl font-semibold text-[rgb(var(--text-primary))]">
                      {selectedTreino.treino_nome ?? selectedTreino.ficha?.nome ?? "Treino livre"} •{" "}
                      {formatDate(selectedTreino.data)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailTreinoId(null)}
                    className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[rgb(var(--text-secondary))] transition hover:border-[rgba(var(--color-accent-primary),0.6)]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <DetailCard
                      label="Duracao"
                      value={selectedTreino.duracao_minutos ? `${selectedTreino.duracao_minutos} min` : "—"}
                    />
                    <DetailCard label="Volume" value={`${formatNumber(Math.round(selectedTreino.totalVolume))} kg`} />
                    <DetailCard label="Series" value={formatNumber(Math.round(selectedTreino.totalSeries))} />
                    <DetailCard label="Exercicios" value={formatNumber(selectedTreino.totalExercicios)} />
                  </div>

                  {treinoHighlights.length ? (
                    <div className="mt-4 rounded-2xl border border-[rgba(var(--color-secondary-primary),0.35)] bg-[rgba(var(--color-secondary-primary),0.12)] p-4 text-sm text-[rgb(var(--text-primary))]">
                      <p className="text-xs uppercase tracking-[0.25em]">Comparativos automaticos</p>
                      <ul className="mt-2 space-y-1">
                        {treinoHighlights.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-x-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/85">
                    <table className="min-w-full text-left text-sm text-[rgb(var(--text-secondary))]">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                          <th className="px-4 py-3">Exercicio</th>
                          <th className="px-4 py-3">Series</th>
                          <th className="px-4 py-3">Reps</th>
                          <th className="px-4 py-3">Carga</th>
                          <th className="px-4 py-3">Volume</th>
                          <th className="px-4 py-3">Δ vs ultima vez</th>
                        </tr>
                      </thead>
                      <tbody>
                        {treinoExerciseRows.map((row) => {
                          const deltaLoad =
                            row.prev && Number.isFinite(row.loadMax) && Number.isFinite(row.prev.load)
                              ? row.loadMax - row.prev.load
                              : null;
                          const deltaVolume =
                            row.prev && Number.isFinite(row.volume) && Number.isFinite(row.prev.volume)
                              ? row.volume - row.prev.volume
                              : null;
                          const repsLabel =
                            row.repsMin !== null && row.repsMax !== null
                              ? `${row.repsMin}-${row.repsMax}`
                              : row.repsMin ?? row.repsMax ?? "—";
                          const loadLabel =
                            row.loadMin !== null && row.loadMax !== null
                              ? `${formatNumber(row.loadMin, 1)}-${formatNumber(row.loadMax, 1)} kg`
                              : row.loadMin != null
                                ? `${formatNumber(row.loadMin, 1)} kg`
                                : "—";
                          return (
                            <tr key={row.id} className="border-t border-[color:var(--border-soft)]">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-[rgb(var(--text-primary))]">{row.name}</p>
                                <p className="text-xs text-[rgb(var(--text-subtle))]">{row.group || "Grupo livre"}</p>
                              </td>
                              <td className="px-4 py-3">{formatNumber(Math.round(row.series))}</td>
                              <td className="px-4 py-3">{repsLabel}</td>
                              <td className="px-4 py-3">{loadLabel}</td>
                              <td className="px-4 py-3">{formatNumber(Math.round(row.volume))}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold">
                                  {Number.isFinite(deltaLoad) ? `Carga ${formatDelta(deltaLoad, " kg")}` : "—"}
                                </span>
                                {Number.isFinite(deltaVolume) ? (
                                  <p className="text-[11px] text-[rgb(var(--text-subtle))]">
                                    Volume {formatDelta(Math.round(deltaVolume), " kg")}
                                  </p>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}

      {exerciseHistoryId && selectedExercise && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(3,10,24,0.55)] px-4 py-8 backdrop-blur-sm">
              <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/95 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-soft)] px-6 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Historico do exercicio</p>
                    <h3 className="mt-2 text-xl font-semibold text-[rgb(var(--text-primary))]">{selectedExercise.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExerciseHistoryId(null)}
                    className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[rgb(var(--text-secondary))] transition hover:border-[rgba(var(--color-accent-primary),0.6)]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                  <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/80 p-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Evolucao de carga</p>
                    <Sparkline values={selectedExercise.entries.map((entry) => entry.load || 0)} />
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/85">
                    <table className="min-w-full text-left text-sm text-[rgb(var(--text-secondary))]">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Series</th>
                          <th className="px-4 py-3">Reps</th>
                          <th className="px-4 py-3">Carga</th>
                          <th className="px-4 py-3">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedExercise.entries].reverse().map((entry) => (
                          <tr key={entry.id} className="border-t border-[color:var(--border-soft)]">
                            <td className="px-4 py-3">{formatDate(entry.treinoDate)}</td>
                            <td className="px-4 py-3">{entry.series || "—"}</td>
                            <td className="px-4 py-3">
                              {entry.reps?.min !== null ? `${entry.reps.min}-${entry.reps.max}` : "—"}
                            </td>
                            <td className="px-4 py-3">{Number.isFinite(entry.load) ? `${formatNumber(entry.load, 1)} kg` : "—"}</td>
                            <td className="px-4 py-3">{entry.volume ? formatNumber(Math.round(entry.volume)) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/90 p-5 text-[rgb(var(--text-primary))] shadow-lg">
      <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition ${
        active
          ? "border-[rgb(var(--color-accent-primary))] bg-[rgba(var(--color-accent-primary),0.15)] text-[rgb(var(--text-primary))]"
          : "border-[color:var(--border-strong)] text-[rgb(var(--text-secondary))]"
      }`}
    >
      {children}
    </button>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/80 p-4 text-sm text-[rgb(var(--text-secondary))]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))]">{value}</p>
    </div>
  );
}

function Sparkline({ values }) {
  const safeValues = (values || []).filter((value) => Number.isFinite(value));
  if (safeValues.length < 2) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-[color:var(--border-soft)] bg-[rgb(var(--surface-card))]/70 p-4 text-xs text-[rgb(var(--text-secondary))]">
        Sem dados suficientes para grafico.
      </div>
    );
  }
  const width = 220;
  const height = 60;
  const path = buildSparkPath(safeValues, width, height);
  return (
    <svg width={width} height={height} className="mt-3">
      <path d={`M 0 ${height} L ${width} ${height}`} stroke="#E2E8F0" strokeWidth="2" fill="none" />
      <path d={path} stroke="#32C5FF" strokeWidth="3" fill="none" />
    </svg>
  );
}
