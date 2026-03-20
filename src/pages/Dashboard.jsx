import React, { useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import WorkoutLink from "../components/WorkoutLink.jsx";
import toast from "react-hot-toast";
import { SAMPLE_MEAL_PLAN, SAMPLE_PROGRESS, SAMPLE_TIMELINE, SAMPLE_WORKOUTS } from "../data/fitness.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  clearSelectedFicha,
  getSelectedFichaStorageKey,
  loadSelectedFicha,
  saveSelectedFicha,
  SELECTED_FICHA_STORAGE_KEY,
} from "../utils/selectedFicha.js";
import { resolveMediaUrl } from "../utils/media.js";
import { getFichaById, listFichaTreinos } from "../services/fichas.js";
import { getSelectedFichaPreference, saveSelectedFichaPreference } from "../services/profile.js";
import {
  createCompletedTreino,
  deleteCompletedTreino,
  getWeeklyTreinosSummary,
  listCompletedTreinosInRange,
  updateCompletedTreinoDate,
} from "../services/executions.js";
import { createFeedPost } from "../services/feed.js";
import { getLatestMeasures, getWeightHistory } from "../services/evolution.js";
import { getConsumedMealsSummary, getLatestConsumedMeal } from "../services/meals.js";
import { getWaterIntakeToday, registerWaterIntake } from "../services/water.js";

const TODAY_WORKOUT = SAMPLE_WORKOUTS[0];
const UPCOMING_WORKOUTS = SAMPLE_WORKOUTS.slice(1, 4);
let html2canvasPromise = null;

function StatCard({ label, value, detail, accent = "from-[#32C5FF] to-[#67FF9A]" }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-white shadow-lg shadow-slate-900/30">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {detail ? <p className="text-sm text-white/70">{detail}</p> : null}
      <span className={`mt-4 inline-flex h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
    </div>
  );
}

function WeeklyConsistency({ label, summary, pattern, rangeLabel }) {
  const maxValue = Math.max(...pattern.map((item) => Number(item.value) || 0), 0) || 1;
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-white shadow-lg shadow-slate-900/30">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <div className="mt-4 flex w-full items-end justify-between gap-3">
        {pattern.map((item) => {
          const value = Number(item.value) || 0;
          const height = value > 0 ? Math.max(18, (value / maxValue) * 56) : 12;
          return (
            <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`relative w-full max-w-[52px] rounded-full ${
                  value > 0 ? "bg-gradient-to-br from-[#32C5FF] to-[#67FF9A]" : "bg-white/15"
                }`}
                style={{ height }}
                title={item.day}
              >
                {value > 0 ? (
                  <span className="absolute inset-0 flex items-start justify-center text-[10px] font-semibold text-[#041220] drop-shadow">
                    {value}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 text-[11px] font-semibold text-white/60">
        {pattern.map((item) => (
          <span key={`${item.day}-label`} className="text-center">
            {item.day}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-white/70">{summary}</p>
      {rangeLabel ? <p className="text-[11px] text-white/50">{rangeLabel}</p> : null}
    </div>
  );
}

function infoFromMeals(plan) {
  const remaining = Math.max(plan.caloriesTarget - plan.caloriesConsumed, 0);
  return { remaining, proteinGap: Math.max(plan.protein.target - plan.protein.current, 0) };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedFicha, setSelectedFicha] = useState(null);
  const [treinosState, setTreinosState] = useState({ loading: false, error: null, items: [] });
  const [remotePreferenceChecked, setRemotePreferenceChecked] = useState(false);
  const [todayKey, setTodayKey] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [weeklyConsistency, setWeeklyConsistency] = useState({
    loading: false,
    error: null,
    items: [],
    total: 0,
    rangeLabel: "",
  });
  const [weightState, setWeightState] = useState({ loading: false, error: null, items: [] });
  const [measureState, setMeasureState] = useState({ loading: false, error: null, items: [] });
  const [waterForm, setWaterForm] = useState({ value: "", saving: false });
  const [waterState, setWaterState] = useState({ loading: false, error: null, total: 0 });
  const [mealSummary, setMealSummary] = useState({
    loading: false,
    error: null,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
    date: todayKey,
  });
  const [lastMealState, setLastMealState] = useState({ loading: false, error: null, meal: null });
  const [completionDate, setCompletionDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [completionState, setCompletionState] = useState({ saving: false, error: null, success: null });
  const [weeklyCompletedState, setWeeklyCompletedState] = useState({ loading: false, error: null, items: [] });
  const [editingTreinoId, setEditingTreinoId] = useState(null);
  const [editingTreinoDate, setEditingTreinoDate] = useState("");
  const [savingTreinoId, setSavingTreinoId] = useState(null);
  const [deletingTreinoId, setDeletingTreinoId] = useState(null);
  const [shareState, setShareState] = useState({ loading: false, error: null });
  const shareCardRef = useRef(null);
  const hasNutritionData = Boolean(
    mealSummary.totalCalories || mealSummary.totalProtein || mealSummary.totalCarbs || mealSummary.totalFats,
  );
  const resolvedMealPlan = useMemo(() => {
    const basePlan = hasNutritionData
      ? SAMPLE_MEAL_PLAN
      : {
          ...SAMPLE_MEAL_PLAN,
          caloriesTarget: 0,
          protein: { ...SAMPLE_MEAL_PLAN.protein, target: 0 },
          carbs: { ...SAMPLE_MEAL_PLAN.carbs, target: 0 },
          fats: { ...SAMPLE_MEAL_PLAN.fats, target: 0 },
          hydration: 0,
          meals: [],
        };
    return {
      ...basePlan,
      caloriesConsumed: mealSummary.totalCalories || 0,
      protein: {
        ...basePlan.protein,
        current: mealSummary.totalProtein || 0,
      },
      carbs: {
        ...basePlan.carbs,
        current: mealSummary.totalCarbs || 0,
      },
      fats: {
        ...basePlan.fats,
        current: mealSummary.totalFats || 0,
      },
    };
  }, [hasNutritionData, mealSummary.totalCalories, mealSummary.totalCarbs, mealSummary.totalFats, mealSummary.totalProtein]);
  const { remaining, proteinGap } = useMemo(() => infoFromMeals(resolvedMealPlan), [resolvedMealPlan]);
  const weightHistory = useMemo(() => {
    if (weightState.items?.length) {
      const sorted = [...weightState.items].sort((a, b) => new Date(a.data) - new Date(b.data));
      return sorted.slice(-10).map((item, index) => {
        const dateLabel = item.data
          ? new Date(item.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
          : `S${index + 1}`;
        return {
          week: dateLabel,
          value: Number(item.peso) || 0,
        };
      });
    }
    return [];
  }, [weightState.items]);
  const latestWeight = weightHistory.at(-1)?.value ?? 0;
  const weightDelta = weightHistory.length > 0 ? latestWeight - (weightHistory[0]?.value ?? 0) : 0;
  const weightInsight = useMemo(() => {
    if (!weightState.items?.length) {
      return {
        tone: "neutral",
        icon: "•",
        text: "Sem registros de peso ainda.",
      };
    }
    const delta = Number(weightDelta) || 0;
    const abs = Math.abs(delta).toFixed(1);
    if (delta > 0.2) {
      return {
        tone: "up",
        icon: "▲",
        text: `Peso subiu ${abs} kg nas ultimas semanas — dentro do esperado para hipertrofia.`,
      };
    }
    if (delta < -0.2) {
      return {
        tone: "down",
        icon: "▼",
        text: `Peso caiu ${abs} kg nas ultimas semanas — ajuste calorias se o objetivo for hipertrofia.`,
      };
    }
    return {
      tone: "flat",
      icon: "■",
      text: "Peso esta estavel nas ultimas semanas — bom para manter consistencia.",
    };
  }, [weightDelta, weightState.items]);
  const measuresDisplay = useMemo(() => {
    if (measureState.items?.length) {
      const [latest, previous] = measureState.items;
      const entries = [
        { key: "braco", label: "Braço" },
        { key: "peito", label: "Peito" },
        { key: "cintura", label: "Cintura" },
        { key: "quadril", label: "Quadril" },
        { key: "perna", label: "Perna" },
        { key: "braco_contraido", label: "Braço contraído" },
      ];
      return entries
        .map((entry) => {
          const value = Number(latest?.[entry.key]);
          const prev = Number(previous?.[entry.key]);
          const hasValue = Number.isFinite(value);
          const delta = Number.isFinite(prev) && hasValue ? Number((value - prev).toFixed(1)) : null;
          return hasValue
            ? {
                ...entry,
                value: value.toFixed(1),
                delta,
              }
            : null;
        })
        .filter(Boolean);
    }
    return [];
  }, [measureState.items]);
  const hasSelectedTreinos = treinosState.items.length > 0;
  const todayTreino = hasSelectedTreinos ? treinosState.items[0] : null;
  const upcomingTreinos = hasSelectedTreinos ? treinosState.items.slice(1) : [];
  const calorieBurnToday = useMemo(() => {
    if (!weeklyCompletedState.items?.length) return null;
    const todayItems = weeklyCompletedState.items.filter((item) => item?.data === todayKey);
    if (!todayItems.length) return null;
    const total = todayItems.reduce((acc, item) => acc + (Number(item?.calorias_queimadas) || 0), 0);
    if (total <= 0) return null;
    const treinosLabel = todayItems.length === 1 ? "treino" : "treinos";
    return {
      total,
      detail: `${todayItems.length} ${treinosLabel} registrado${todayItems.length === 1 ? "" : "s"} hoje`,
    };
  }, [todayKey, weeklyCompletedState.items]);
  const consistencyPattern = useMemo(() => {
    if (weeklyConsistency.items?.length) {
      return weeklyConsistency.items.map((item, index) => ({
        day: item.day || ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index] || `D${index + 1}`,
        value: Number(item.value) || 0,
      }));
    }
    return [
      { day: "Seg", value: 0 },
      { day: "Ter", value: 0 },
      { day: "Qua", value: 0 },
      { day: "Qui", value: 0 },
      { day: "Sex", value: 0 },
      { day: "Sáb", value: 0 },
      { day: "Dom", value: 0 },
    ];
  }, [weeklyConsistency.items]);
  const hydrationTargetLiters = 3;
  const hydrationCurrentLiters = waterState.total ? waterState.total / 1000 : resolvedMealPlan.hydration || 0;
  const nutritionQuick = useMemo(
    () => [
      {
        icon: "🥩",
        label: "Proteína",
        value: hasNutritionData
          ? `${resolvedMealPlan.protein.current}/${resolvedMealPlan.protein.target} g`
          : "—",
      },
      {
        icon: "🔥",
        label: "Calorias",
        value: hasNutritionData
          ? `${resolvedMealPlan.caloriesConsumed}/${resolvedMealPlan.caloriesTarget} kcal`
          : "—",
      },
      {
        icon: "💧",
        label: "Hidratação",
        value: hasNutritionData
          ? `${hydrationCurrentLiters.toFixed(2)} L / ${hydrationTargetLiters} L`
          : "—",
      },
    ],
    [hasNutritionData, hydrationCurrentLiters, resolvedMealPlan],
  );
  const nutritionTimeline = useMemo(
    () =>
      (resolvedMealPlan.meals || []).map((meal) => ({
        id: `meal-${meal.id}`,
        icon: meal.id === "breakfast" ? "🍳" : meal.id === "lunch" ? "🍗" : meal.id === "snack" ? "🥛" : "🍽️",
        title: meal.title || meal.name,
        value: `${meal.calories} kcal`,
        time: meal.time || "",
      })),
    [resolvedMealPlan.meals],
  );
  const timelineItems = useMemo(() => [...SAMPLE_TIMELINE, ...nutritionTimeline], [nutritionTimeline]);
  const getMealDateTime = (meal) => {
    if (!meal?.data || !meal?.horario) return null;
    const dateTime = new Date(`${meal.data}T${meal.horario}`);
    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
  };
  const isSameDay = (first, second) =>
    first &&
    second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
  const isYesterday = (date, reference = new Date()) => {
    if (!date || !reference) return false;
    const yesterday = new Date(reference);
    yesterday.setDate(reference.getDate() - 1);
    return isSameDay(date, yesterday);
  };
  const getRelativeMealLabel = (dateTime) => {
    if (!dateTime) return "horário indisponível";
    const diffMs = Date.now() - dateTime.getTime();
    if (!Number.isFinite(diffMs)) return "horário indisponível";
    if (diffMs <= 0) return "agora mesmo";
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) return `há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  };
  const formatAbsoluteMealLabel = (dateTime, timeLabel) => {
    if (!dateTime) return "horário indisponível";
    const hasTime = timeLabel && timeLabel !== "—";
    const timeSuffix = hasTime ? `às ${timeLabel}` : "";
    if (isSameDay(dateTime, new Date())) return timeSuffix ? `hoje ${timeSuffix}` : "hoje";
    if (isYesterday(dateTime)) return timeSuffix ? `ontem ${timeSuffix}` : "ontem";
    const dateLabel = dateTime.toLocaleDateString("pt-BR");
    return timeSuffix ? `${dateLabel} ${timeSuffix}` : dateLabel;
  };
  const lastMealMeta = useMemo(() => {
    const meal = lastMealState.meal;
    if (!meal) {
      return {
        hasMeal: false,
        timeLabel: "—",
        recommendation: "Nenhuma refeição registrada ainda — registre a primeira para liberar recomendações.",
        suggestionDetail: "Registre a primeira refeição para liberar sugestões baseadas no horário.",
      };
    }
    const dateTime = getMealDateTime(meal);
    const timeLabel = meal?.horario ? meal.horario.slice(0, 5) : "—";
    const fallbackDateLabel = meal?.data ? new Date(meal.data).toLocaleDateString("pt-BR") : null;
    const showDate = dateTime && !isSameDay(dateTime, new Date());
    const timeDisplay = showDate
      ? timeLabel === "—"
        ? dateTime.toLocaleDateString("pt-BR")
        : `${timeLabel} • ${dateTime.toLocaleDateString("pt-BR")}`
      : timeLabel === "—" && fallbackDateLabel
        ? fallbackDateLabel
        : timeLabel;
    const relativeLabel = getRelativeMealLabel(dateTime);
    const absoluteLabel = formatAbsoluteMealLabel(dateTime, timeLabel);
    if (!dateTime) {
      return {
        hasMeal: true,
        timeLabel: timeDisplay,
        recommendation: "Última refeição registrada, mas sem horário — registre a próxima para manter a cadência.",
        suggestionDetail: "Última refeição registrada, mas sem horário.",
      };
    }
    return {
      hasMeal: true,
      timeLabel: timeDisplay,
      recommendation: `Última refeição ${relativeLabel} (${absoluteLabel}) — registre a próxima para manter a cadência.`,
      suggestionDetail: `Última refeição ${relativeLabel}.`,
    };
  }, [lastMealState.meal]);
  const nextMealSuggestion = useMemo(
    () => ({
      title: "Próxima refeição sugerida",
      items: ["Frango grelhado", "Arroz integral", "Salada verde"],
      calories: 520,
      macros: { protein: 38, carbs: 60, fats: 12 },
      reason: "Ideal para manter a meta diária e recuperar pós-treino.",
    }),
    [],
  );
  const lastMealSuggestion = useMemo(
    () => ({
      title: "Pré-treino leve sugerido",
      window: "150–250 kcal",
      detail: lastMealMeta.hasMeal
        ? `${lastMealMeta.suggestionDetail} Inclua carb leve + proteína rápida.`
        : "Sem refeições registradas — comece com um lanche leve para ajustar a cadência.",
    }),
    [lastMealMeta.hasMeal, lastMealMeta.suggestionDetail],
  );
  const nutritionScore = useMemo(
    () => ({ score: 82, note: "Consistência boa. Pouca fibra hoje." }),
    [],
  );
  const iaRecommendations = useMemo(() => {
    if (!hasNutritionData) {
      return [
        "Nenhuma refeição registrada ainda — comece com um lanche leve.",
        "Defina metas nutricionais no perfil para liberar recomendações personalizadas.",
      ];
    }
    return [
      `Você ainda precisa de ${Math.max(proteinGap, 0)} g de proteína hoje.`,
      lastMealMeta.recommendation,
      "Carbo alto no dia; ajuste o jantar com proteína magra + vegetal fibroso.",
    ];
  }, [hasNutritionData, lastMealMeta.recommendation, proteinGap]);
  const dailySummary = useMemo(() => {
    const hasTreinoHoje = weeklyCompletedState.items?.some((item) => item?.data === todayKey);
    const hasMeals = (mealSummary.totalCalories || 0) > 0;
    const gap = Math.max(proteinGap, 0);

    if (!hasMeals && !hasTreinoHoje) {
      return "Dia leve por aqui. Registre a primeira refeição e programe seu treino.";
    }
    if (hasTreinoHoje && !hasMeals) {
      return "Treino feito hoje. Registre sua refeição para fechar o dia com qualidade.";
    }
    if (!hasTreinoHoje && hasMeals) {
      return gap > 10
        ? `Alimentação começou bem, mas faltam ${gap} g de proteína. Falta o treino do dia.`
        : "Boa alimentação hoje. Falta o treino para fechar o dia perfeito.";
    }
    if (hasTreinoHoje) {
      return gap > 10
        ? `Treino registrado. Ajuste proteína: faltam ${gap} g para fechar o dia.`
        : "Dia forte de treino. Alimentação quase perfeita.";
    }
    return "Resumo do dia indisponível no momento.";
  }, [mealSummary.totalCalories, proteinGap, todayKey, weeklyCompletedState.items]);
  const hasSelectedFicha = Boolean(selectedFicha?.id);
  const activePlanName = hasSelectedFicha ? selectedFicha?.nome ?? "Ficha em uso" : "Nenhuma ficha selecionada";
  const activePlanObjective = hasSelectedFicha
    ? selectedFicha?.objetivo ?? "Objetivo personalizado"
    : "Crie ou selecione sua ficha para liberar o panorama.";
  const panoramaAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.photo_url || null;
  const activeFichaLink = hasSelectedFicha ? `/fichas/${selectedFicha.id}` : "/fichas";
  const formatBR = (date) => {
    if (!date) return "";
    const safe = date instanceof Date ? date : new Date(date);
    return safe.toLocaleDateString("pt-BR");
  };
  const formatISODateLabel = (value) => {
    if (!value) return "—";
    const safe = new Date(`${value}T00:00:00`);
    if (Number.isNaN(safe.getTime())) return value;
    return safe.toLocaleDateString("pt-BR");
  };
  const weeklyRange = useMemo(() => {
    const today = new Date();
    const dayIndex = today.getDay();
    const offsetToMonday = (dayIndex + 6) % 7;
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(today.getDate() - offsetToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start,
      end,
      label: `${formatBR(start)} a ${formatBR(end)}`,
    };
  }, [todayKey]);
  const weeklySummaryText = useMemo(() => {
    const total = weeklyConsistency.total ?? 0;
    if (weeklyConsistency.loading) return "Carregando histórico semanal...";
    return `${total} treinos`;
  }, [weeklyConsistency.loading, weeklyConsistency.rangeLabel, weeklyConsistency.total]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const storageKey = getSelectedFichaStorageKey(user?.id);
    const handleStorage = (event) => {
      if (!event.key) return;
      if (event.key !== storageKey && event.key !== SELECTED_FICHA_STORAGE_KEY) {
        return;
      }
      setSelectedFicha(loadSelectedFicha(user?.id));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateTodayKey = () => {
      const nextKey = new Date().toLocaleDateString("en-CA");
      setTodayKey((prev) => (prev === nextKey ? prev : nextKey));
    };
    updateTodayKey();
    const timer = window.setInterval(updateTodayKey, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setRemotePreferenceChecked(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setSelectedFicha(null);
      return;
    }
    setSelectedFicha(loadSelectedFicha(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWeeklyConsistency({ loading: false, error: null, items: [], total: 0, rangeLabel: "" });
      return undefined;
    }
    let active = true;

    setWeeklyConsistency((prev) => ({ ...prev, loading: true, error: null }));
    getWeeklyTreinosSummary({ usuarioId: user.id, startDate: weeklyRange.start, endDate: weeklyRange.end })
      .then((items) => {
        if (!active) return;
        const total = Array.isArray(items) ? items.reduce((sum, item) => sum + (Number(item.value) || 0), 0) : 0;
        setWeeklyConsistency({
          loading: false,
          error: null,
          items: Array.isArray(items) ? items : [],
          total,
          rangeLabel: weeklyRange.label,
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar treinos concluidos da semana:", error);
        const fallbackItems = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => ({ day, value: 0 }));
        setWeeklyConsistency({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar os treinos da semana.",
          items: fallbackItems,
          total: 0,
          rangeLabel: weeklyRange.label,
        });
      });

    return () => {
      active = false;
    };
  }, [user?.id, weeklyRange.end, weeklyRange.label, weeklyRange.start]);

  const loadWeeklyCompleted = async () => {
    if (!user?.id) {
      setWeeklyCompletedState({ loading: false, error: null, items: [] });
      return;
    }
    setWeeklyCompletedState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const items = await listCompletedTreinosInRange({
        usuarioId: user.id,
        startDate: weeklyRange.start,
        endDate: weeklyRange.end,
      });
      setWeeklyCompletedState({ loading: false, error: null, items: Array.isArray(items) ? items : [] });
    } catch (error) {
      console.error("[Dashboard] falha ao carregar treinos concluidos:", error);
      setWeeklyCompletedState({
        loading: false,
        error: error?.message ?? "Nao foi possivel carregar os treinos concluidos.",
        items: [],
      });
    }
  };

  useEffect(() => {
    loadWeeklyCompleted();
  }, [user?.id, weeklyRange.end, weeklyRange.start]);

  useEffect(() => {
    if (!user?.id) {
      setWeightState({ loading: false, error: null, items: [] });
      setMeasureState({ loading: false, error: null, items: [] });
      return undefined;
    }
    let active = true;
    setWeightState((prev) => ({ ...prev, loading: true, error: null }));
    getWeightHistory({ usuarioId: user.id, limit: 12 })
      .then((items) => {
        if (!active) return;
        setWeightState({ loading: false, error: null, items: Array.isArray(items) ? items : [] });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar historico de peso:", error);
        setWeightState({ loading: false, error: error?.message ?? "Nao foi possivel carregar peso.", items: [] });
      });
    getLatestMeasures({ usuarioId: user.id, limit: 2 })
      .then((items) => {
        if (!active) return;
        setMeasureState({ loading: false, error: null, items: Array.isArray(items) ? items : [] });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar medidas:", error);
        setMeasureState({ loading: false, error: error?.message ?? "Nao foi possivel carregar medidas.", items: [] });
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWaterState({ loading: false, error: null, total: 0 });
      setMealSummary({
        loading: false,
        error: null,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        date: todayKey,
      });
      setLastMealState({ loading: false, error: null, meal: null });
      return undefined;
    }
    let active = true;
    setWaterState((prev) => ({ ...prev, loading: true, error: null }));
    getWaterIntakeToday({ usuarioId: user.id })
      .then((result) => {
        if (!active) return;
        setWaterState({ loading: false, error: null, total: result?.total ?? 0 });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar agua consumida:", error);
        setWaterState({ loading: false, error: error?.message ?? "Nao foi possivel carregar agua.", total: 0 });
      });
    setMealSummary({
      loading: true,
      error: null,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      date: todayKey,
    });
    setLastMealState({ loading: true, error: null, meal: null });
    getConsumedMealsSummary({ usuarioId: user.id, date: todayKey })
      .then((summary) => {
        if (!active) return;
        setMealSummary({
          loading: false,
          error: null,
          totalCalories: summary?.totalCalorias ?? 0,
          totalProtein: summary?.totalProteina ?? 0,
          totalCarbs: summary?.totalCarboidratos ?? 0,
          totalFats: summary?.totalGorduras ?? 0,
          date: summary?.date ?? todayKey,
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar refeicoes do dia:", error);
        setMealSummary({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar refeicoes.",
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFats: 0,
          date: todayKey,
        });
      });
    getLatestConsumedMeal({ usuarioId: user.id })
      .then((meal) => {
        if (!active) return;
        setLastMealState({ loading: false, error: null, meal: meal ?? null });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[Dashboard] falha ao carregar ultima refeicao:", error);
        setLastMealState({ loading: false, error: error?.message ?? "Nao foi possivel carregar ultima refeicao.", meal: null });
      });
    return () => {
      active = false;
    };
  }, [todayKey, user?.id]);

  useEffect(() => {
    if (!user?.id || remotePreferenceChecked) {
      return undefined;
    }

    let active = true;
    const syncFromProfile = async () => {
      try {
        const remoteFichaId = await getSelectedFichaPreference(user.id);
        if (!active) return;
        if (remoteFichaId) {
          const ficha = await getFichaById(remoteFichaId);
          if (!active || !ficha) return;
          saveSelectedFicha(ficha, user.id);
          setSelectedFicha(ficha);
        }
      } catch (error) {
        console.error("[Dashboard] falha ao recuperar ficha preferida:", error);
      } finally {
        if (active) {
          setRemotePreferenceChecked(true);
        }
      }
    };

    syncFromProfile();
    return () => {
      active = false;
    };
  }, [remotePreferenceChecked, selectedFicha?.id, user?.id]);

  useEffect(() => {
    if (!selectedFicha?.id) {
      setTreinosState({ loading: false, error: null, items: [] });
      return undefined;
    }

    let active = true;
    setTreinosState((prev) => ({ ...prev, loading: true, error: null }));

    listFichaTreinos(selectedFicha.id)
      .then((items) => {
        if (!active) return;
        setTreinosState({ loading: false, error: null, items: Array.isArray(items) ? items : [] });
      })
      .catch((error) => {
        if (!active) return;
        setTreinosState({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar os treinos desta ficha.",
          items: [],
        });
      });

    return () => {
      active = false;
    };
  }, [selectedFicha?.id]);

  const handleClearSelectedFicha = () => {
    clearSelectedFicha(user?.id);
    setSelectedFicha(null);
    if (user?.id) {
      saveSelectedFichaPreference({ usuarioId: user.id, fichaId: null }).catch((error) =>
        console.error("[Dashboard] falha ao limpar preferencia remota:", error),
      );
    }
  };

  const handleCompleteToday = async () => {
    if (!hasSelectedTreinos || !todayTreino) {
      return;
    }
    if (!user?.id) {
      setCompletionState({ saving: false, error: "Entre para marcar o treino como concluido.", success: null });
      return;
    }
    setCompletionState({ saving: true, error: null, success: null });
    try {
      const dateKey = completionDate || new Date().toLocaleDateString("en-CA");
      await createCompletedTreino({
        usuarioId: user.id,
        fichaId: selectedFicha?.id ?? null,
        data: dateKey,
      });
      await loadWeeklyCompleted();

      // cria post no feed (best effort)
      const conteudo = [];
      if (selectedFicha?.nome) conteudo.push(`Ficha: ${selectedFicha.nome}`);
      if (todayTreino?.nome) conteudo.push(`Treino: ${todayTreino.nome}`);
      if (todayTreino?.subdivisao) conteudo.push(`Divisão: ${todayTreino.subdivisao}`);
      const volumeTotal =
        todayTreino?.volume_total ??
        todayTreino?.volume_estimado ??
        todayTreino?.volume_estimado_kg ??
        todayTreino?.volume_estimado_total ??
        null;
      const duracaoMin =
        todayTreino?.tempo_estimado_min ?? todayTreino?.duracao_min ?? todayTreino?.tempo_total_min ?? TODAY_WORKOUT.durationMinutes;
      if (volumeTotal) conteudo.push(`Volume: ${volumeTotal}`);
      if (duracaoMin) conteudo.push(`Tempo: ${duracaoMin} min`);
      const exerciciosResumo = Array.isArray(todayTreino?.ficha_exercicios)
        ? todayTreino.ficha_exercicios.slice(0, 5).map((ex) => ({
            nome: ex.exercicio?.nome ?? "Exercício",
            series: ex.series ?? null,
            reps: ex.repeticoes ?? null,
            carga: ex.carga ?? null,
          }))
        : [];
      const destaques = [];
      if (volumeTotal) destaques.push(`Volume total: ${volumeTotal}`);
      if (duracaoMin) destaques.push(`Tempo: ${duracaoMin} min`);
      createFeedPost({
        usuario_id: user.id,
        tipo: "treino",
        titulo: todayTreino?.nome ?? "Treino concluído",
        conteudo: conteudo.join(" • ") || null,
        visibilidade: "public",
        dados: {
          fichaId: selectedFicha?.id ?? null,
          treinoId: todayTreino?.id ?? null,
          fichaNome: selectedFicha?.nome ?? null,
          subdivisao: todayTreino?.subdivisao ?? todayTreino?.subdivisao_label ?? null,
          origem: "dashboard",
          volume_total: volumeTotal,
          duracao_min: duracaoMin,
          playlist: todayTreino?.playlist_nome ? { nome: todayTreino.playlist_nome, url: todayTreino.playlist_url } : null,
          exercicios: exerciciosResumo,
          destaques,
        },
      }).catch((err) => {
        console.error("[Dashboard] falha ao publicar no feed:", err);
      });

      setTreinosState((prev) => {
        const items = Array.isArray(prev.items) ? prev.items : [];
        if (items.length === 0) return prev;
        const [first, ...rest] = items;
        return { ...prev, items: [...rest, first] };
      });

      setCompletionState({
        saving: false,
        error: null,
        success: "Treino concluido! Proximo treino atualizado.",
      });
    } catch (error) {
      console.error("[Dashboard] falha ao concluir treino:", error);
      setCompletionState({
        saving: false,
        error: error?.message ?? "Nao foi possivel concluir o treino agora.",
        success: null,
      });
    }
  };

  const handleStartEditTreinoDate = (item) => {
    setEditingTreinoId(item.id);
    setEditingTreinoDate(item.data || "");
  };

  const handleCancelEditTreinoDate = () => {
    setEditingTreinoId(null);
    setEditingTreinoDate("");
  };

  const handleSaveTreinoDate = async (item) => {
    if (!user?.id || !item?.id) return;
    if (!editingTreinoDate) {
      toast.error("Selecione uma data valida.");
      return;
    }
    setSavingTreinoId(item.id);
    try {
      await updateCompletedTreinoDate({
        usuarioId: user.id,
        treinoId: item.id,
        data: editingTreinoDate,
      });
      await loadWeeklyCompleted();
      setEditingTreinoId(null);
      setEditingTreinoDate("");
      toast.success("Data do treino atualizada.");
    } catch (error) {
      console.error("[Dashboard] falha ao atualizar data do treino:", error);
      toast.error(error?.message ?? "Nao foi possivel atualizar a data do treino.");
    } finally {
      setSavingTreinoId(null);
    }
  };

  const handleDeleteTreino = async (item) => {
    if (!user?.id || !item?.id) return;
    const confirmed = window.confirm("Deseja excluir este treino concluido?");
    if (!confirmed) return;
    setDeletingTreinoId(item.id);
    try {
      await deleteCompletedTreino({ usuarioId: user.id, treinoId: item.id });
      await loadWeeklyCompleted();
      toast.success("Treino excluido.");
    } catch (error) {
      console.error("[Dashboard] falha ao excluir treino:", error);
      toast.error(error?.message ?? "Nao foi possivel excluir o treino.");
    } finally {
      setDeletingTreinoId(null);
    }
  };

  const ensureHtml2Canvas = async () => {
    if (typeof window === "undefined") {
      throw new Error("Compartilhamento indisponivel neste dispositivo.");
    }
    if (window.html2canvas) return window.html2canvas;
    if (!html2canvasPromise) {
      html2canvasPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error("Falha ao carregar gerador de imagem para compartilhar."));
        document.body.appendChild(script);
      });
    }
    return html2canvasPromise;
  };

  const shareCardData = useMemo(() => {
    const treinoNome = todayTreino?.nome ?? selectedFicha?.nome ?? "Treino Meu Shape";
    const duracao =
      todayTreino?.tempo_estimado_min ??
      todayTreino?.duracao_min ??
      todayTreino?.tempo_total_min ??
      TODAY_WORKOUT.durationMinutes ??
      null;
    const volume =
      todayTreino?.volume_total ??
      todayTreino?.volume_estimado ??
      todayTreino?.volume_estimado_total ??
      todayTreino?.volume_estimado_kg ??
      null;
    const principaisExercicios = Array.isArray(todayTreino?.ficha_exercicios)
      ? todayTreino.ficha_exercicios.slice(0, 4).map((ex) => ex.exercicio?.nome ?? "Exercicio")
      : TODAY_WORKOUT.phases?.[0]?.exercises?.slice(0, 4).map((ex) => ex.name) ?? [];
    const playlist = todayTreino?.playlist_nome ?? selectedFicha?.playlist_nome ?? "Playlist do treino";
    const playlistUrl = todayTreino?.playlist_url ?? selectedFicha?.playlist_url ?? null;
    const calorias = todayTreino?.calorias ?? TODAY_WORKOUT.metrics?.estimatedCalories ?? 650;
    const fotoUsuario =
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.photo_url ||
      resolveMediaUrl(selectedFicha?.thumbnail_url || selectedFicha?.capa_url) ||
      null;
    return {
      treinoNome,
      duracao,
      volume,
      principaisExercicios,
      playlist,
      playlistUrl,
      calorias,
      fotoUsuario,
      usuarioNome: user?.user_metadata?.full_name || user?.email || "Atleta Meu Shape",
    };
  }, [selectedFicha, todayTreino, user]);

  const handleShareToday = async () => {
    if (!shareCardRef.current) return;
    setShareState({ loading: true, error: null });
    try {
      const html2canvas = await ensureHtml2Canvas();
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "meu-shape-treino.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareCardData.treinoNome,
          text: "Treino concluido no app MEU SHAPE",
        });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "meu-shape-treino.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error("[Dashboard] falha ao compartilhar card:", error);
      setShareState({ loading: false, error: error?.message ?? "Nao foi possivel gerar o card agora." });
      return;
    }
    setShareState({ loading: false, error: null });
  };

  const weightChartOptions = useMemo(() => {
    const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: "#67FF9A" },
      { offset: 1, color: "#32C5FF" },
    ]);
    return {
      tooltip: {
        trigger: "axis",
        className: "text-sm",
        formatter: (params) => {
          if (!params?.length) return "";
          const { axisValue, data } = params[0];
          return `Semana ${axisValue}<br/><strong>${data} kg</strong>`;
        },
      },
      grid: { top: 18, left: 45, right: 12, bottom: 35 },
      xAxis: {
        type: "category",
        data: weightHistory.map((item) => item.week),
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } },
        axisLabel: { color: "rgba(255,255,255,0.7)" },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: "rgba(255,255,255,0.7)", formatter: "{value} kg" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)", type: "dashed" } },
      },
      series: [
        {
          name: "Peso",
          type: "bar",
          barWidth: "55%",
          data: weightHistory.map((item) => item.value),
          itemStyle: {
            borderRadius: [12, 12, 0, 0],
            color: gradient,
          },
        },
      ],
    };
  }, [weightHistory]);

  const handleSubmitWater = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error("Entre para registrar sua hidratação.");
      return;
    }
    const quantidade = Number.parseInt(waterForm.value, 10);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("Informe um valor em ml.");
      return;
    }
    setWaterForm((prev) => ({ ...prev, saving: true }));
    try {
      await registerWaterIntake({ usuarioId: user.id, quantidadeMl: quantidade });
      toast.success("Água registrada!");
      setWaterState((prev) => ({ ...prev, total: (prev.total || 0) + quantidade }));
      setWaterForm({ value: "", saving: false });
    } catch (error) {
      console.error("[Dashboard] falha ao registrar agua:", error);
      toast.error(error?.message ?? "Não foi possível registrar agora.");
      setWaterForm((prev) => ({ ...prev, saving: false }));
    }
  };

  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden rounded-[32px] border border-[color:var(--border-soft)] bg-[rgba(var(--surface-card),0.95)] p-7 text-[rgb(var(--text-primary))] shadow-2xl shadow-[rgba(15,31,60,0.15)] transition-colors lg:p-12 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#050914] dark:via-[#0d1a2b] dark:to-[#111f35] dark:text-white dark:shadow-black/40">
        {panoramaAvatarUrl ? (
          <img
            src={panoramaAvatarUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-10 lg:block"
          />
        ) : null}
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-subtle))] dark:text-white/60">Panorama do Seu Shape</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-[rgb(var(--text-primary))] lg:text-4xl dark:text-white">
              Bom dia, atleta. Hoje é dia de ativar o plano{" "}
              <span className="text-[rgb(var(--color-secondary-primary))] dark:text-[#67FF9A]">{activePlanName}</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-[rgb(var(--text-secondary))] leading-relaxed dark:text-white/70">
              {selectedFicha ? (
                <>
                  Ficha selecionada com foco em{" "}
                  <strong className="text-[rgb(var(--text-primary))] dark:text-white">{activePlanObjective}</strong>. Ajuste cargas e registre as
                  execuções para manter o coach alinhado ao que você está fazendo hoje.
                </>
              ) : (
                <>
                  Você ainda não tem uma ficha selecionada.{" "}
                  <strong className="text-[rgb(var(--text-primary))] dark:text-white">
                    Crie ou selecione sua ficha
                  </strong>{" "}
                  para liberar o panorama completo.
                </>
              )}
            </p>
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-white/70 px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] shadow-sm dark:border-white/20 dark:bg-white/5 dark:text-white">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/60">Resumo do dia</span>
              <span>{dailySummary}</span>
            </div>
            {selectedFicha ? (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))] dark:text-white/60">
                <span className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 dark:border-white/20">Objetivo: {activePlanObjective}</span>
                {todayTreino?.subdivisao ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 dark:border-white/20">
                    Treino de hoje: {todayTreino.subdivisao}
                  </span>
                ) : null}
                {selectedFicha?.playlist_nome ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 dark:border-white/20">
                    Playlist: {selectedFicha.playlist_nome}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {selectedFicha?.id || hasSelectedTreinos ? (
                <Link
                  to={activeFichaLink}
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-xl shadow-[#32C5FF]/40"
                >
                  Abrir treino do dia
                </Link>
              ) : (
                <Link
                  to="/fichas"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-xl shadow-[#32C5FF]/40"
                >
                  Selecionar ficha
                </Link>
              )}
              <a
                href="#agenda"
                className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-[color:var(--border-soft)] px-5 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[color:var(--border-strong)] hover:bg-[rgba(var(--surface-muted),0.4)] dark:border-white/30 dark:text-white dark:hover:border-white/70"
              >
                Ver agenda completa
              </a>
            </div>
          </div>
          <div className="flex gap-4 rounded-3xl border border-[color:var(--border-soft)] bg-white/80 p-4 text-[rgb(var(--text-primary))] shadow-lg shadow-[rgba(15,31,60,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-black/30">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))] dark:text-white/60">Objetivo</p>
              <p className="mt-2 text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                {hasSelectedFicha ? selectedFicha?.objetivo ?? "Objetivo livre" : "—"}
              </p>
              <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60">
                {hasSelectedFicha ? "Ciclo atual" : "Selecione uma ficha"}
              </p>
            </div>
            <div className="h-16 w-px bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Nível</p>
              <p className="mt-2 text-xl font-semibold">{hasSelectedFicha ? selectedFicha?.nivel ?? "Nivel livre" : "—"}</p>
              <p className="text-sm text-white/60">
                {hasSelectedFicha ? "Carga média ajustada no treino" : "Cadastre sua ficha"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {selectedFicha && (
        <section className="card rounded-[28px] border border-[color:var(--border-soft)] bg-[rgba(var(--surface-card),0.86)] p-6 text-[rgb(var(--text-primary))] shadow-xl backdrop-blur-2xl dark:border-white/15 dark:bg-white/10 dark:text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))] dark:text-white/60">Ficha em uso</p>
              <h2 className="text-2xl font-semibold">{selectedFicha.nome ?? "Ficha selecionada"}</h2>
              <p className="mt-2 text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">
                {selectedFicha.objetivo ?? "Objetivo livre"} • {selectedFicha.nivel ?? "Nivel livre"}
              </p>
              {selectedFicha.descricao ? <p className="mt-3 text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">{selectedFicha.descricao}</p> : null}
              <ul className="mt-3 grid gap-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70 sm:grid-cols-2">
                <li>Volume semanal: {selectedFicha.volume_series ?? 82} séries (demo)</li>
                <li>Tempo médio: {selectedFicha.tempo_medio_min ?? 54} min</li>
                <li>Dias: {selectedFicha.dias_divisao ?? "Seg / Qua / Sex"}</li>
                <li>Grupos fortes: {selectedFicha.grupos_fortes ?? "peito, ombro, costas"}</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {selectedFicha.id ? (
                <Link
                  to={`/fichas/${selectedFicha.id}`}
                  className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60"
                >
                  Abrir ficha
                </Link>
              ) : null}
              <Link
                to="/fichas"
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-white/50"
              >
                Escolher outra
              </Link>
              <button
                type="button"
                onClick={handleClearSelectedFicha}
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-white/50"
              >
                Trocar ficha
              </button>
            </div>
          </div>
          {treinosState.loading && (
            <p className="mt-3 text-xs text-white/70">Carregando treinos desta ficha...</p>
          )}
          {treinosState.error && (
            <p className="mt-3 text-xs text-[#FF8F8F]">
              Nao foi possivel carregar os treinos desta ficha. Exibindo sugestoes padrao.
            </p>
          )}
        </section>
      )}

      <section className="card rounded-[32px] border border-white/10 bg-white/75 p-6 shadow-lg transition hover:bg-white/85 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Recomendações de IA</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Ações sugeridas antes de ver os números</h2>
          </div>
          <span className="rounded-full bg-[#32C5FF]/15 px-3 py-1 text-xs font-semibold text-[#0b2940]">Nutrição + treino</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--text-secondary))] dark:text-white/80">
          {iaRecommendations.map((rec) => (
            <li
              key={rec}
              className="flex items-start gap-2 rounded-2xl border border-white/40 bg-white/70 px-3 py-2 shadow-sm transition hover:bg-white/90 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <span className="mt-0.5 text-lg">⚡</span>
              <p>{rec}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card rounded-[32px] border border-white/10 bg-gradient-to-br from-[#071126] via-[#0e1d3b] to-[#122652] p-6 text-white shadow-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Peso corporal</p>
            <h2 className="text-2xl font-semibold">Evolução das últimas 10 semanas</h2>
            <p className="text-sm text-white/70">Visualize rapidamente se o peso está seguindo a cadência planejada.</p>
          </div>
          <p className="text-xs text-white/60">Atualização automática a partir dos check-ins semanais</p>
        </div>
        <ReactECharts option={weightChartOptions} notMerge lazyUpdate style={{ height: 260 }} />
      </section>

      <section className="hidden" data-water-grid>
        <WeeklyConsistency
          label="Treinos na semana"
          summary={weeklySummaryText}
          rangeLabel={weeklyConsistency.rangeLabel}
          pattern={consistencyPattern}
        />
        <StatCard label="Calorias restantes" value={`${remaining} kcal`} detail="Meta diária 2.600 kcal" accent="from-[#67FF9A] to-[#F5B759]" />
        <article className="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Hidratação</p>
            <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">
              Hoje: <strong className="text-[rgb(var(--text-primary))] dark:text-white">{waterState.total} ml</strong>
            </p>
          <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">Registrar água</h3>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmitWater}>
            <input
              type="number"
              min="0"
              step="50"
              inputMode="numeric"
              value={waterForm.value}
              onChange={(event) => setWaterForm((prev) => ({ ...prev, value: event.target.value }))}
              className="flex-1 rounded-2xl border border-[color:var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
              placeholder="Quantidade em ml (ex: 250)"
            />
            <button
              type="submit"
              disabled={waterForm.saving}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg shadow-[#32C5FF]/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {waterForm.saving ? "Salvando..." : "Registrar"}
            </button>
          </form>
          <p className="mt-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">Sempre em ml. Use o botão flutuante para atalhos rápidos.</p>
        </article>
        <StatCard
          label="Gasto calórico de hoje"
          value={calorieBurnToday ? `${calorieBurnToday.total} kcal` : "—"}
          detail={calorieBurnToday?.detail ?? "Sem treinos registrados hoje."}
          accent="from-[#FF9F43] to-[#FF6CAB]"
        />
      <StatCard
        label="Peso atual"
        value={`${latestWeight.toFixed(1)} kg`}
        detail={`${weightDelta.toFixed(1)} kg nas últimas 10 semanas`}
        accent="from-[#F5B759] to-[#FF6CAB]"
      />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <WeeklyConsistency
          label="Treinos na semana"
          summary={weeklySummaryText}
          rangeLabel={weeklyConsistency.rangeLabel}
          pattern={consistencyPattern}
        />
        <article className="card rounded-3xl border border-white/10 bg-white/80 p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Hidratação</p>
          <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">Registrar água</h3>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmitWater}>
            <input
              type="number"
              min="0"
              step="50"
              inputMode="numeric"
              value={waterForm.value}
              onChange={(event) => setWaterForm((prev) => ({ ...prev, value: event.target.value }))}
              className="flex-1 rounded-2xl border border-[color:var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
              placeholder="Quantidade em ml (ex: 250)"
            />
            <button
              type="submit"
              disabled={waterForm.saving}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg shadow-[#32C5FF]/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {waterForm.saving ? "Salvando..." : "Registrar"}
            </button>
          </form>
          <p className="mt-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">Sempre em ml. Use o botão flutuante para atalhos rápidos.</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Calorias restantes" value={`${remaining} kcal`} detail="Meta diária 2.600 kcal" accent="from-[#67FF9A] to-[#F5B759]" />
        <StatCard
          label="Gasto calórico de hoje"
          value={calorieBurnToday ? `${calorieBurnToday.total} kcal` : "—"}
          detail={calorieBurnToday?.detail ?? "Sem treinos registrados hoje."}
          accent="from-[#32C5FF] to-[#67FF9A]"
        />
        <StatCard
          label="Peso atual"
          value={`${latestWeight.toFixed(1)} kg`}
          detail={`${weightDelta.toFixed(1)} kg nas últimas 10 semanas`}
          accent="from-[#F5B759] to-[#FF6CAB]"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {nutritionQuick.map((item) => (
          <div
            key={item.label}
            className="card flex items-center justify-between rounded-3xl border border-white/15 bg-white/80 px-4 py-3 text-sm text-[rgb(var(--text-secondary))] shadow-sm transition hover:bg-white/90 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            <span className="text-lg">{item.icon}</span>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/60">{item.label}</p>
              <p className="text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <article className="card rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-900/70">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">
                Treino do dia ·{" "}
                {todayTreino
                  ? todayTreino.subdivisao
                    ? `Treino ${todayTreino.subdivisao}`
                    : "Bloco selecionado"
                  : "Sugestao demo"}
              </p>
              <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">
                {todayTreino ? todayTreino.nome ?? selectedFicha?.nome ?? "Treino selecionado" : TODAY_WORKOUT.name}
              </h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                {todayTreino
                  ? `${selectedFicha?.objetivo ?? "Objetivo livre"} • ${selectedFicha?.nivel ?? "Nivel livre"} • ${
                      todayTreino.ficha_exercicios?.length ?? 0
                    } exercicios`
                  : `${TODAY_WORKOUT.focus} • ${TODAY_WORKOUT.durationMinutes} min • ${TODAY_WORKOUT.days.join(" / ")}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {selectedFicha?.id ? (
                <Link
                  to={`/fichas/${selectedFicha.id}`}
                  className="rounded-2xl border border-[rgba(50,197,255,0.4)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-accent-primary))]"
                >
                  Ver ficha completa
                </Link>
              ) : (
                <WorkoutLink
                  workoutId={TODAY_WORKOUT.id}
                  className="rounded-2xl border border-[rgba(50,197,255,0.4)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-accent-primary))]"
                >
                  Ver ficha completa
                </WorkoutLink>
              )}
              <button
                type="button"
                onClick={handleShareToday}
                disabled={shareState.loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(103,255,154,0.4)] px-4 py-2 text-sm font-semibold text-[color:rgb(var(--color-secondary-primary))] transition hover:border-[rgba(103,255,154,0.7)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" />
                {shareState.loading ? "Gerando..." : "Compartilhar"}
              </button>
              {hasSelectedTreinos ? (
                <label className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
                  Data
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(event) => setCompletionDate(event.target.value)}
                    className="rounded-lg border border-white/40 bg-white/20 px-2 py-1 text-[11px] font-semibold text-white/90 outline-none transition focus:border-white/70"
                  />
                </label>
              ) : null}
              {hasSelectedTreinos ? (
                <button
                  type="button"
                  onClick={handleCompleteToday}
                  disabled={completionState.saving}
                  className="rounded-2xl bg-[#67FF9A] px-4 py-2 text-sm font-semibold text-[#041220] shadow-lg shadow-[#67FF9A]/30 transition hover:shadow-[#67FF9A]/50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {completionState.saving ? "Fechando treino..." : "Concluir treino"}
                </button>
              ) : null}
            </div>
          </header>

          {completionState.error ? (
            <p className="mt-2 text-sm text-[#FF8F8F]">{completionState.error}</p>
          ) : null}
          {completionState.success ? (
            <p className="mt-2 text-sm text-emerald-300">{completionState.success}</p>
          ) : null}
          {shareState.error ? (
            <p className="mt-2 text-sm text-amber-300">{shareState.error}</p>
          ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg">
              <img
                src={resolveMediaUrl(selectedFicha?.capa_url || selectedFicha?.thumbnail_url) || TODAY_WORKOUT.coverImage}
                alt=""
                className="h-56 w-full object-cover ring-1 ring-white/10"
                loading="lazy"
              />
              <div className="p-4 text-sm text-white/80">
                <p>
                  {todayTreino
                    ? todayTreino.descricao || selectedFicha?.descricao || "Bloco selecionado a partir da ficha atual."
                    : TODAY_WORKOUT.summary}
                </p>
                <ul className="mt-4 grid gap-3 text-xs uppercase text-white/60 sm:grid-cols-3">
                  <li>
                    <p className="text-white text-base font-semibold">
                      {todayTreino ? todayTreino.ficha_exercicios?.length ?? 0 : TODAY_WORKOUT.metrics.weeklyVolumeKg.toLocaleString()}
                    </p>
                    {todayTreino ? "exercicios" : "volume semanal"}
                  </li>
                  <li>
                    <p className="text-white text-base font-semibold">
                      {todayTreino
                        ? todayTreino.ficha_exercicios?.reduce((sum, item) => sum + (item.series ?? 0), 0) ?? 0
                        : TODAY_WORKOUT.metrics.estimatedCalories}
                    </p>
                    {todayTreino ? "series totais" : "estimado por sessão"}
                  </li>
                  <li>
                    <p className="text-white text-base font-semibold">{todayTreino ? todayTreino.subdivisao ?? "—" : TODAY_WORKOUT.metrics.sessionsPerWeek}</p>
                    {todayTreino ? "subdivisao" : "por semana"}
                  </li>
                </ul>
              </div>
            </div>
            <div
              className="space-y-4 rounded-3xl border p-4 text-white shadow-lg"
              style={{
                backgroundImage:
                  "linear-gradient(140deg, rgba(var(--color-accent-primary),0.9), rgba(var(--color-secondary-primary),0.82))",
                borderColor: "rgba(var(--color-accent-primary),0.35)",
                boxShadow: "0 28px 72px -40px rgba(0,0,0,0.55)",
              }}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Execução guiada</p>
              {todayTreino && Array.isArray(todayTreino.ficha_exercicios) && todayTreino.ficha_exercicios.length > 0 ? (
                todayTreino.ficha_exercicios.slice(0, 8).map((exercise) => {
                  const exercicioMeta = exercise.exercicio ?? {};
                  return (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{exercicioMeta.nome ?? "Exercicio"}</p>
                        <p className="text-xs text-white/60">{exercicioMeta.grupo ?? "Grupo livre"}</p>
                      </div>
                      <div className="text-right text-xs text-white/70">
                        <p>{exercise.series ? `${exercise.series} series` : "Series livres"}</p>
                        <p>
                          {exercise.repeticoes ? `${exercise.repeticoes} reps` : "Repeticoes livres"}
                          {exercise.descanso_segundos ? ` • ${exercise.descanso_segundos}s descanso` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                TODAY_WORKOUT.phases.map((phase) => (
                  <div key={phase.title}>
                    <p className="text-sm font-semibold text-white">{phase.title}</p>
                    <ul className="mt-2 space-y-2 text-xs text-white/80">
                      {phase.exercises.map((exercise) => (
                        <li
                          key={`${phase.title}-${exercise.name}`}
                          className="flex justify-between gap-2 rounded-xl bg-white/5 px-3 py-2"
                        >
                          <span>{exercise.name}</span>
                          <span className="text-white/60">
                            {exercise.reps ? `${exercise.series ?? 0}x${exercise.reps}` : exercise.duration || exercise.distance}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/80" id="agenda">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Agenda</p>
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Próximos treinos</h2>
            </div>
          </header>
          <ul className="mt-5 space-y-4">
            {(hasSelectedTreinos ? upcomingTreinos : UPCOMING_WORKOUTS).map((workout, index) => {
              const dayLabel = hasSelectedTreinos
                ? ["Amanhã", "Quinta", "Sexta", "Sábado"][index] || "Em breve"
                : workout.days?.[0] || "Em breve";
              const statusIcon = ["❗️", "✔️", "💤", "⏱"][index] || "⏱";
              return (
              <li
                key={workout.id}
                className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900/70"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                  {hasSelectedTreinos
                    ? workout.subdivisao
                      ? `Treino ${workout.subdivisao}`
                      : "Bloco"
                    : workout.days.join(" • ")}{" "}
                  · {dayLabel} {statusIcon}
                </p>
                <p className="mt-1 font-semibold text-[rgb(var(--text-primary))]">
                  {hasSelectedTreinos ? workout.nome ?? "Treino" : workout.name}
                </p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  {hasSelectedTreinos
                    ? `${workout.descricao || selectedFicha?.objetivo || "Foco livre"} • ênfase: ${workout.enfase || "dorsais / lombar"}`
                    : `${workout.goal} • ${workout.durationMinutes} min`}
                </p>
                {hasSelectedTreinos ? (
                  <Link
                    to={`/fichas/${selectedFicha?.id ?? ""}`}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:rgb(var(--color-accent-primary))]"
                  >
                    Ver ficha →
                  </Link>
                ) : (
                  <WorkoutLink
                    workoutId={workout.id}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:rgb(var(--color-accent-primary))]"
                  >
                    Abrir ficha →
                  </WorkoutLink>
                )}
              </li>
            );
            })}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Peso & medidas</p>
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Curva das últimas semanas</h2>
            </div>
          </header>
          <div
            className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold ${
              weightInsight.tone === "up"
                ? "text-emerald-500"
                : weightInsight.tone === "down"
                  ? "text-rose-500"
                  : weightInsight.tone === "flat"
                    ? "text-slate-500"
                    : "text-[rgb(var(--text-secondary))]"
            }`}
          >
            <span>{weightInsight.icon}</span>
            <span>{weightInsight.text}</span>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr,1fr]">
            <div className="flex flex-col justify-end">
              <div className="flex h-36 items-end gap-2 rounded-2xl bg-gradient-to-b from-slate-100 to-white p-4 dark:from-slate-800 dark:to-slate-900">
                {(weightHistory.length ? weightHistory : SAMPLE_PROGRESS.weightHistory).slice(-6).map((entry, index) => (
                  <div key={`${entry.week}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-[#32C5FF] to-[#67FF9A]"
                      style={{ height: `${Math.max(20, latestWeight ? (entry.value / latestWeight) * 100 : 20)}%` }}
                    />
                    <p className="text-xs font-semibold text-[rgb(var(--text-secondary))]">{entry.week}</p>
                    <p className="text-[10px] text-[rgb(var(--text-subtle))]">{(entry.value ?? 0).toFixed(1)} kg</p>
                  </div>
                ))}
              </div>
            </div>
            {measureState.items?.length ? (
              <ul className="space-y-3 rounded-2xl border border-white/40 bg-white/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                {measuresDisplay.map((measure, index) => (
                  <li key={`${measure.label}-${index}`} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{measure.label}</p>
                      <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                        {measure.value}
                        {measure.value != null ? " cm" : ""}
                      </p>
                    </div>
                    {Number.isFinite(measure.delta) ? (
                      <span className={`text-xs font-semibold ${measure.delta >= 0 ? "text-[#67FF9A]" : "text-[#FF6CAB]"}`}>
                        {measure.delta > 0 ? "+" : ""}
                        {measure.delta} cm
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[rgb(var(--text-secondary))]">—</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 rounded-2xl border border-dashed border-white/40 bg-white/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  Sem medidas corporais registradas. Cadastre agora para acompanhar sua evolução.
                </p>
                <Link
                  to="/evolucao#medidas-form"
                  className="inline-flex items-center justify-center rounded-full border border-[#32C5FF]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#32C5FF] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10"
                >
                  Registrar medidas
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Calorias & macros</p>
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Nutrição do dia</h2>
            </div>
          </header>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-3">
              {!hasNutritionData ? (
                <div className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-sm">
                    Sem dados nutricionais registrados ainda. Registre sua primeira refeição ou defina metas no perfil.
                  </p>
                </div>
              ) : (
                <>
                  {["protein", "carbs", "fats"].map((macroKey) => {
                    const macro = resolvedMealPlan[macroKey];
                    const labels = { protein: "Proteína", carbs: "Carboidratos", fats: "Gorduras" };
                    const percent = Math.min(100, Math.round(((macro?.current ?? 0) / (macro?.target || 1)) * 100));
                    return (
                      <div key={macroKey}>
                        <div className="flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
                          <p>{labels[macroKey]}</p>
                          <p>
                            {macro.current}/{macro.target} g
                          </p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#32C5FF] to-[#F5B759]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">⏱️ Última refeição</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                        {lastMealMeta.timeLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">⭐ Score nutricional</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">{nutritionScore.score}/100</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">{nutritionScore.note}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-3">
              {!hasNutritionData ? (
                <div className="rounded-3xl border border-dashed border-white/40 bg-white/60 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800 dark:bg-slate-900/60">
                  Registre refeições ou defina metas nutricionais para liberar recomendações personalizadas.
                </div>
              ) : (
                <>
                  <div className="rounded-3xl border border-white/40 bg-white/60 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Recomendações</p>
                    <ul className="mt-3 space-y-3 text-[rgb(var(--text-secondary))]">
                      <li>🥩 Faltam {proteinGap} g de proteína → ovo mexido ou shake agora.</li>
                      <li>💧 Água: +800 ml até 20h (hoje {resolvedMealPlan.hydration} L · ontem 2.2 L).</li>
                      <li>🍚 Jantar: priorize fonte magra + vegetal; ontem o carbo foi 12% maior.</li>
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-white/40 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">🍽️ Próxima refeição sugerida</p>
                    <p className="mt-1 text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">{nextMealSuggestion.title}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">{nextMealSuggestion.items.join(" + ")}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">
                      {nextMealSuggestion.calories} kcal • {nextMealSuggestion.macros.protein}g proteína • {nextMealSuggestion.macros.carbs}g carbo
                    </p>
                    <p className="mt-1 text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">{nextMealSuggestion.reason}</p>
                  </div>
                  <div className="rounded-3xl border border-dashed border-[#32C5FF]/40 bg-white/60 p-4 text-sm shadow-sm dark:border-white/25 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">⏳ Sugestão baseada na última refeição</p>
                    <p className="mt-1 text-base font-semibold text-[rgb(var(--text-primary))] dark:text-white">{lastMealSuggestion.title}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">{lastMealSuggestion.window}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/70">{lastMealSuggestion.detail}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="card rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Linha do tempo</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Últimas ações</h2>
          </div>
        </header>
        <ul className="mt-6 space-y-4">
          {timelineItems.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/60 px-5 py-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div>
                <p className="font-semibold text-[rgb(var(--text-primary))]">
                  {entry.icon ? `${entry.icon} ` : ""}
                  {entry.label ?? entry.title}
                </p>
                <p className="text-[rgb(var(--text-secondary))]">{entry.value}</p>
              </div>
              <span className="text-xs text-[rgb(var(--text-subtle))]">{entry.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Treinos concluidos</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Semana atual</h2>
          </div>
          <p className="text-xs text-[rgb(var(--text-secondary))]">{weeklyRange.label}</p>
        </header>

        {weeklyCompletedState.loading ? (
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">Carregando treinos...</p>
        ) : null}
        {weeklyCompletedState.error ? (
          <p className="mt-4 text-sm text-[#FF8F8F]">{weeklyCompletedState.error}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[rgb(var(--text-secondary))]">
            <thead>
              <tr className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Duração</th>
                <th className="px-3 py-2">Calorias</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {weeklyCompletedState.items.length === 0 && !weeklyCompletedState.loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-sm text-[rgb(var(--text-secondary))]">
                    Nenhum treino registrado nesta semana.
                  </td>
                </tr>
              ) : null}
              {weeklyCompletedState.items.map((item) => {
                const isEditing = editingTreinoId === item.id;
                return (
                  <tr key={item.id} className="border-t border-white/30 dark:border-slate-800">
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editingTreinoDate}
                          onChange={(event) => setEditingTreinoDate(event.target.value)}
                          className="rounded-lg border border-white/40 bg-white/70 px-2 py-1 text-xs font-semibold text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="font-semibold text-[rgb(var(--text-primary))]">
                          {formatISODateLabel(item.data)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {item.duracao_minutos ? `${item.duracao_minutos} min` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {item.calorias_queimadas ? `${item.calorias_queimadas} kcal` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveTreinoDate(item)}
                            disabled={savingTreinoId === item.id}
                            className="rounded-full border border-[#32C5FF]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#32C5FF] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingTreinoId === item.id ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditTreinoDate}
                            className="rounded-full border border-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] transition hover:border-white/70 hover:text-[rgb(var(--text-primary))]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditTreinoDate(item)}
                            className="rounded-full border border-[#32C5FF]/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#32C5FF] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTreino(item)}
                            disabled={deletingTreinoId === item.id}
                            className="rounded-full border border-[#FF6CAB]/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6CAB] transition hover:border-[#FF6CAB] hover:bg-[#FF6CAB]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingTreinoId === item.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fixed left-[-9999px] top-[-9999px]" aria-hidden ref={shareCardRef}>
        <div className="w-[920px] rounded-[32px] border border-[#32C5FF]/40 bg-gradient-to-br from-[#050915] via-[#0b1a30] to-[#0b1f3b] p-8 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Treino concluido</p>
              <h2 className="mt-2 text-4xl font-semibold leading-tight text-white">{shareCardData.treinoNome}</h2>
            </div>
            <img src="/images/logo_light.png" alt="MEU SHAPE" className="h-10 w-auto opacity-80" />
          </div>

          <div className="mt-6 grid grid-cols-[1.1fr,1fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                {shareCardData.fotoUsuario ? (
                  <img
                    src={shareCardData.fotoUsuario}
                    alt={shareCardData.usuarioNome}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#32C5FF]/60"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#32C5FF] to-[#67FF9A] text-lg font-semibold text-[#041220] ring-2 ring-[#32C5FF]/60">
                    {shareCardData.usuarioNome?.slice(0, 2)?.toUpperCase() ?? "MS"}
                  </div>
                )}
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-white/60">Atleta</p>
                  <p className="text-lg font-semibold text-white">{shareCardData.usuarioNome}</p>
                  <p className="text-xs text-white/70">Criado no app MEU SHAPE</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Duração</p>
                  <p className="text-2xl font-semibold text-white">{shareCardData.duracao ? `${shareCardData.duracao} min` : "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Volume total</p>
                  <p className="text-2xl font-semibold text-white">{shareCardData.volume ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Calorias</p>
                  <p className="text-2xl font-semibold text-white">{shareCardData.calorias ? `${shareCardData.calorias} kcal` : "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Playlist</p>
                  <p className="text-base font-semibold text-white">
                    {shareCardData.playlist}
                  </p>
                  {shareCardData.playlistUrl ? <p className="text-[10px] text-white/60">{shareCardData.playlistUrl}</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#32C5FF]/30 bg-gradient-to-br from-[#0b1a30] via-[#0e2447] to-[#0c2b52] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#67FF9A]">Principais exercicios</p>
              <ul className="mt-3 space-y-2 text-sm text-white">
                {shareCardData.principaisExercicios.map((exercise, index) => (
                  <li
                    key={`${exercise}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>{exercise}</span>
                    <span className="text-xs text-white/60">#{index + 1}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-dashed border-[#32C5FF]/50 bg-white/5 p-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
                Criado no app MEU SHAPE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
