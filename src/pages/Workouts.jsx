import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import WorkoutLink from "../components/WorkoutLink.jsx";
import { SAMPLE_WORKOUTS } from "../data/fitness.js";

const GOAL_FILTERS = [
  { id: "all", label: "Todos os objetivos" },
  { id: "Hipertrofia", label: "Hipertrofia" },
  { id: "Emagrecimento", label: "Emagrecimento" },
  { id: "Saúde geral", label: "Saúde geral" },
];

const LEVEL_FILTERS = ["Todos", "Iniciante", "Intermediário", "Avançado"];

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#32C5FF] bg-[#32C5FF]/10 text-[#0F1F3C]"
          : "border-white/20 bg-white/5 text-[rgb(var(--text-secondary))] hover:border-white/40"
      }`}
    >
      {children}
    </button>
  );
}

export default function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [goalFilter, setGoalFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("Todos");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  const handleSearchChange = (value) => {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("search", value);
    } else {
      next.delete("search");
    }
    setSearchParams(next, { replace: true });
  };

  const filteredWorkouts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return SAMPLE_WORKOUTS.filter((workout) => {
      const matchesGoal = goalFilter === "all" || workout.goal === goalFilter;
      const matchesLevel = levelFilter === "Todos" || workout.level === levelFilter;
      const matchesSearch =
        !term ||
        workout.name.toLowerCase().includes(term) ||
        workout.focus.toLowerCase().includes(term) ||
        workout.summary.toLowerCase().includes(term);
      return matchesGoal && matchesLevel && matchesSearch;
    });
  }, [goalFilter, levelFilter, search]);

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#040d1f] via-[#0f1f3c] to-[#0f172a] p-6 text-white shadow-2xl lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Centro de treinos</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">
              Escolha um bloco, siga o cronômetro inteligente e deixe o MEU SHAPE ajustar sua progressao.
            </h1>
            <p className="mt-4 max-w-2xl text-white/70">
              Combine fichas full body, divisoes classicas ou sessões de mobilidade. Cada programa traz séries, vídeos, tempos de descanso
              e recomendações de carga baseadas no seu historico.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/treinos/novo"
                className="inline-flex min-w-[200px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40"
              >
                Montar ficha personalizada
              </Link>
              <Link
                to="/coach"
                className="inline-flex min-w-[200px] items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/70"
              >
                Pedir treino ao Coach IA
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-white/80 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Resumo rapido</p>
            <ul className="mt-4 space-y-2">
              <li className="flex justify-between font-semibold">
                <span>Planos ativos</span>
                <span>{SAMPLE_WORKOUTS.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Treinos recomendados</span>
                <span>+2 com base no seu objetivo</span>
              </li>
              <li className="flex justify-between">
                <span>Última atualização</span>
                <span>ha 4 h</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Filtrar treinos</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Personalize sua busca</h2>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Busque por nome, foco ou equipamento"
            className="w-full rounded-2xl border border-white/60 px-4 py-3 text-sm outline-none ring-2 ring-transparent transition focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white md:max-w-sm"
          />
        </div>
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            {GOAL_FILTERS.map((filter) => (
              <FilterButton key={filter.id} active={goalFilter === filter.id} onClick={() => setGoalFilter(filter.id)}>
                {filter.label}
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {LEVEL_FILTERS.map((level) => (
              <FilterButton key={level} active={levelFilter === level} onClick={() => setLevelFilter(level)}>
                {level}
              </FilterButton>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Resultados</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
              {filteredWorkouts.length} treinos prontos para usar
            </h2>
          </div>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Cada ficha inclui séries, tempo de descanso, multimidia e observações de seguranca.
          </p>
        </header>

        {filteredWorkouts.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Nenhum treino encontrado para os filtros selecionados. Ajuste o objetivo, nível ou equipamentos disponíveis.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredWorkouts.map((workout) => (
              <article
                key={workout.id}
                className="flex flex-col gap-5 rounded-[32px] border border-white/40 bg-white/70 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                  <img src={workout.thumbnail} alt={workout.name} loading="lazy" className="h-44 w-full rounded-3xl object-cover md:h-full" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">
                      <span>{workout.goal}</span>
                      <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))]" />
                      <span>{workout.level}</span>
                      <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))]" />
                      <span>{workout.focus}</span>
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">{workout.name}</h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))]">{workout.summary}</p>
                    <div className="mt-4 grid gap-3 text-xs text-[rgb(var(--text-secondary))] sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                        <p className="text-[rgb(var(--text-subtle))]">Duração</p>
                        <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{workout.durationMinutes} min</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                        <p className="text-[rgb(var(--text-subtle))]">Dias</p>
                        <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{workout.days.join(" / ")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[rgb(var(--text-secondary))]">
                  {workout.equipment.map((item) => (
                    <span key={item} className="rounded-full border border-white/40 px-3 py-1">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <WorkoutLink
                    workoutId={workout.id}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#0f1f3c] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-slate-900/30"
                  >
                    Abrir ficha
                  </WorkoutLink>
                  <Link
                    to={`/treinos/${workout.id}?modo=guia`}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[#0f1f3c] px-4 py-2 text-sm font-semibold text-[#0f1f3c] dark:border-white/30 dark:text-white"
                  >
                    Iniciar execução
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


