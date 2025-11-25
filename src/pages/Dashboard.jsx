import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import WorkoutLink from "../components/WorkoutLink.jsx";
import { SAMPLE_MEAL_PLAN, SAMPLE_PROGRESS, SAMPLE_TIMELINE, SAMPLE_WORKOUTS } from "../data/fitness.js";
import { clearSelectedFicha, loadSelectedFicha, SELECTED_FICHA_STORAGE_KEY } from "../utils/selectedFicha.js";
import { resolveMediaUrl } from "../utils/media.js";
import { listFichaTreinos } from "../services/fichas.js";

const TODAY_WORKOUT = SAMPLE_WORKOUTS[0];
const UPCOMING_WORKOUTS = SAMPLE_WORKOUTS.slice(1, 4);

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

function infoFromMeals(plan) {
  const remaining = Math.max(plan.caloriesTarget - plan.caloriesConsumed, 0);
  return { remaining, proteinGap: Math.max(plan.protein.target - plan.protein.current, 0) };
}

export default function DashboardPage() {
  const [selectedFicha, setSelectedFicha] = useState(() => loadSelectedFicha());
  const [treinosState, setTreinosState] = useState({ loading: false, error: null, items: [] });
  const { remaining, proteinGap } = useMemo(() => infoFromMeals(SAMPLE_MEAL_PLAN), []);
  const latestWeight = SAMPLE_PROGRESS.weightHistory.at(-1)?.value ?? 0;
  const weightDelta = latestWeight - SAMPLE_PROGRESS.weightHistory[0]?.value;
  const weightHistory = useMemo(() => SAMPLE_PROGRESS.weightHistory.slice(-10), []);
  const hasSelectedTreinos = treinosState.items.length > 0;
  const todayTreino = hasSelectedTreinos ? treinosState.items[0] : null;
  const upcomingTreinos = hasSelectedTreinos ? treinosState.items.slice(1) : [];

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleStorage = (event) => {
      if (event.key && event.key !== SELECTED_FICHA_STORAGE_KEY) {
        return;
      }
      setSelectedFicha(loadSelectedFicha());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
    clearSelectedFicha();
    setSelectedFicha(null);
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

  return (
    <div className="space-y-12">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0d1a2b] to-[#111f35] p-6 text-white shadow-2xl shadow-black/40 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Panorama do Seu Shape</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight lg:text-4xl">
              Bom dia, atleta. Hoje é dia de ativar o plano <span className="text-[#67FF9A]">Shape Ignite</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/70">
              Você está há <strong className="text-white">6 semanas</strong> em modo consistência. Continue atualizando suas cargas e
              registre cada refeição para liberar recomendações de IA mais precisas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <WorkoutLink workoutId={TODAY_WORKOUT.id} className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-xl shadow-[#32C5FF]/40">
                Abrir treino do dia
              </WorkoutLink>
              <a
                href="#agenda"
                className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/70"
              >
                Ver agenda completa
              </a>
            </div>
          </div>
          <div className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Objetivo</p>
              <p className="mt-2 text-xl font-semibold">Hipertrofia</p>
              <p className="text-sm text-white/60">Ciclo atual • 55 min</p>
            </div>
            <div className="h-16 w-px bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Nível</p>
              <p className="mt-2 text-xl font-semibold">Intermediário</p>
              <p className="text-sm text-white/60">Carga média 80% 1RM</p>
            </div>
          </div>
        </div>
      </section>

      {selectedFicha && (
        <section className="rounded-[28px] border border-white/15 bg-white/10 p-5 text-white shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Ficha em uso</p>
              <h2 className="text-2xl font-semibold">{selectedFicha.nome ?? "Ficha selecionada"}</h2>
              <p className="mt-2 text-sm text-white/70">
                {selectedFicha.objetivo ?? "Objetivo livre"} • {selectedFicha.nivel ?? "Nivel livre"}
              </p>
              {selectedFicha.descricao ? <p className="mt-3 text-sm text-white/70">{selectedFicha.descricao}</p> : null}
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

      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#071126] via-[#0e1d3b] to-[#122652] p-6 text-white shadow-xl">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Treinos na semana" value="4/5" detail="Próxima sessão amanhã" />
        <StatCard label="Calorias restantes" value={`${remaining} kcal`} detail="Meta diária 2.600 kcal" accent="from-[#67FF9A] to-[#F5B759]" />
        <StatCard
          label="Peso atual"
          value={`${latestWeight.toFixed(1)} kg`}
          detail={`${weightDelta.toFixed(1)} kg nas últimas 10 semanas`}
          accent="from-[#F5B759] to-[#FF6CAB]"
        />
        <StatCard label="PR mais recente" value="Supino 105 kg" detail="Atualizado ontem" accent="from-[#32C5FF] to-[#FF6CAB]" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-900/70">
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
          </header>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg">
              <img
                src={resolveMediaUrl(selectedFicha?.capa_url || selectedFicha?.thumbnail_url) || TODAY_WORKOUT.coverImage}
                alt=""
                className="h-56 w-full object-cover"
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
            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Execução guiada</p>
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
            {(hasSelectedTreinos ? upcomingTreinos : UPCOMING_WORKOUTS).map((workout) => (
              <li
                key={workout.id}
                className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900/70"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
                  {hasSelectedTreinos
                    ? workout.subdivisao
                      ? `Treino ${workout.subdivisao}`
                      : "Bloco"
                    : workout.days.join(" • ")}
                </p>
                <p className="mt-1 font-semibold text-[rgb(var(--text-primary))]">
                  {hasSelectedTreinos ? workout.nome ?? "Treino" : workout.name}
                </p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  {hasSelectedTreinos
                    ? workout.descricao || selectedFicha?.objetivo || "Foco livre"
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
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Peso & medidas</p>
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Curva das últimas semanas</h2>
            </div>
          </header>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr,1fr]">
            <div className="flex flex-col justify-end">
              <div className="flex h-36 items-end gap-2 rounded-2xl bg-gradient-to-b from-slate-100 to-white p-4 dark:from-slate-800 dark:to-slate-900">
                {SAMPLE_PROGRESS.weightHistory.slice(-6).map((entry) => (
                  <div key={entry.week} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-full bg-gradient-to-t from-[#32C5FF] to-[#67FF9A]" style={{ height: `${Math.max(20, (entry.value / latestWeight) * 100)}%` }} />
                    <p className="text-xs font-semibold text-[rgb(var(--text-secondary))]">{entry.week}</p>
                    <p className="text-[10px] text-[rgb(var(--text-subtle))]">{entry.value.toFixed(1)} kg</p>
                  </div>
                ))}
              </div>
            </div>
            <ul className="space-y-3 rounded-2xl border border-white/40 bg-white/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
              {SAMPLE_PROGRESS.measures.map((measure) => (
                <li key={measure.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{measure.label}</p>
                    <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{measure.value} cm</p>
                  </div>
                  <span className={`text-xs font-semibold ${measure.delta >= 0 ? "text-[#67FF9A]" : "text-[#FF6CAB]"}`}>
                    {measure.delta > 0 ? "+" : ""}
                    {measure.delta} cm
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Calorias & macros</p>
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Nutrição do dia</h2>
            </div>
          </header>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {["protein", "carbs", "fats"].map((macroKey) => {
                const macro = SAMPLE_MEAL_PLAN[macroKey];
                const labels = { protein: "Proteína", carbs: "Carboidratos", fats: "Gorduras" };
                const percent = Math.min(100, Math.round((macro.current / macro.target) * 100));
                return (
                  <div key={macroKey}>
                    <div className="flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
                      <p>{labels[macroKey]}</p>
                      <p>
                        {macro.current}/{macro.target} g
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#32C5FF] to-[#F5B759]" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-3xl border border-white/40 bg-white/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Recomendações</p>
              <ul className="mt-3 space-y-3 text-[rgb(var(--text-secondary))]">
                <li>Faltam {proteinGap} g de proteína — considere shake ou refeição pós-treino.</li>
                <li>Hidratação em {SAMPLE_MEAL_PLAN.hydration} L (meta 3 L).</li>
                <li>Última refeição registrada às {SAMPLE_MEAL_PLAN.meals[2].time}. Planeje o jantar antecipadamente.</li>
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Linha do tempo</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Últimas ações</h2>
          </div>
        </header>
        <ul className="mt-6 space-y-4">
          {SAMPLE_TIMELINE.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/60 px-5 py-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div>
                <p className="font-semibold text-[rgb(var(--text-primary))]">{entry.label}</p>
                <p className="text-[rgb(var(--text-secondary))]">{entry.value}</p>
              </div>
              <span className="text-xs text-[rgb(var(--text-subtle))]">{entry.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
