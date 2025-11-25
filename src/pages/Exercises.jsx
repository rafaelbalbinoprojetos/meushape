import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useExercises } from "../hooks/useExercises.js";

const GROUP_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "Peito", label: "Peito" },
  { value: "Costas", label: "Costas" },
  { value: "Pernas", label: "Pernas" },
  { value: "Posterior", label: "Posterior" },
  { value: "Ombro", label: "Ombro" },
  { value: "Braços", label: "Braços" },
  { value: "Core", label: "Core" },
];

const LEVEL_OPTIONS = [
  { value: "all", label: "Todos os niveis" },
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediario" },
  { value: "avancado", label: "Avancado" },
  { value: "pro", label: "Pro" },
];

const RISK_OPTIONS = [
  { value: "all", label: "Todos os riscos" },
  { value: "baixo", label: "Baixo impacto" },
  { value: "moderado", label: "Moderado" },
  { value: "alto", label: "Alto / tecnico" },
];

const EXECUTION_OPTIONS = [
  { value: "all", label: "Todos os estilos" },
  { value: "maquina", label: "Maquina guiada" },
  { value: "livre", label: "Livre / barra" },
  { value: "peso_corporal", label: "Peso corporal" },
  { value: "isometrico", label: "Isometrico" },
];

const VIDEO_OPTIONS = [
  { value: "any", label: "Qualquer video" },
  { value: "withVideo", label: "Apenas com video" },
  { value: "withoutVideo", label: "Sem video" },
];

const LEVEL_BADGES = {
  iniciante: { label: "Iniciante", className: "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200" },
  intermediario: { label: "Intermediario", className: "border border-sky-400/40 bg-sky-500/10 text-sky-200" },
  avancado: { label: "Avancado", className: "border border-orange-400/40 bg-orange-500/10 text-orange-200" },
  pro: { label: "Pro", className: "border border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200" },
};

const RISK_BADGES = {
  baixo: { label: "Baixo impacto", className: "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200" },
  moderado: { label: "Moderado", className: "border border-amber-400/40 bg-amber-500/10 text-amber-200" },
  alto: { label: "Alto risco", className: "border border-rose-400/40 bg-rose-500/10 text-rose-200" },
};

const EXECUTION_LABELS = {
  maquina: "Maquina guiada",
  livre: "Livre / barra",
  peso_corporal: "Peso corporal",
  peso_livre: "Peso livre",
  isometrico: "Isometrico",
  cardio: "Cardio",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1600&q=80";

function normalizeGroup(group) {
  if (!group) return "";
  return group.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getBadgeMeta(map, value, fallback) {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (map[normalized]) {
    return map[normalized];
  }
  return {
    label: value,
    className: fallback.className,
  };
}

function formatExecutionLabel(value) {
  if (!value) return "Execucao livre";
  const normalized = value.toLowerCase();
  if (EXECUTION_LABELS[normalized]) {
    return EXECUTION_LABELS[normalized];
  }
  return value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

function parseExecutionNotes(execucao) {
  if (!execucao) return [];
  return execucao
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ExercisesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [videoFilter, setVideoFilter] = useState("any");
  const [nivelFilter, setNivelFilter] = useState("all");
  const [riscoFilter, setRiscoFilter] = useState("all");
  const [tipoExecucaoFilter, setTipoExecucaoFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [spotlightId, setSpotlightId] = useState(null);

  const filters = useMemo(
    () => ({
      search,
      group: groupFilter !== "all" ? groupFilter : undefined,
      equipment: equipmentFilter || undefined,
      hasVideo: videoFilter === "any" ? undefined : videoFilter === "withVideo",
      nivel: nivelFilter !== "all" ? nivelFilter : undefined,
      risco: riscoFilter !== "all" ? riscoFilter : undefined,
      tipoExecucao: tipoExecucaoFilter !== "all" ? tipoExecucaoFilter : undefined,
      limit: 150,
    }),
    [search, groupFilter, equipmentFilter, videoFilter, nivelFilter, riscoFilter, tipoExecucaoFilter],
  );

  const { items, loading, error, reload } = useExercises(filters);

  useEffect(() => {
    if (items.length === 0) {
      setSpotlightId(null);
      return;
    }
    if (!spotlightId || !items.some((exercise) => exercise.id === spotlightId)) {
      setSpotlightId(items[0].id);
    }
  }, [items, spotlightId]);

  const spotlightExercise = useMemo(
    () => items.find((exercise) => exercise.id === spotlightId) ?? null,
    [items, spotlightId],
  );

  const stats = useMemo(() => {
    const total = items.length;
    const withVideo = items.filter((item) => Boolean(item.video_url)).length;
    const advanced = items.filter((item) => ["avancado", "pro"].includes((item.nivel ?? "").toLowerCase())).length;
    const lowImpact = items.filter((item) => (item.risco ?? "").toLowerCase() === "baixo").length;
    return { total, withVideo, advanced, lowImpact };
  }, [items]);

  const toggleSelection = (exerciseId) => {
    setSelected((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      }
      return [...prev, exerciseId];
    });
  };

  const handleCreateFicha = () => {
    if (selected.length === 0) {
      navigate("/treinos/novo");
      return;
    }
    const qs = new URLSearchParams({ exercicios: selected.join(",") });
    navigate(`/treinos/novo?${qs.toString()}`);
  };

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-[#050914] via-[#0b1f3a] to-[#041229] p-8 text-white shadow-2xl">
        <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-white/60">Atlas premium de exercicios</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight lg:text-5xl">Organize execucoes com visual profissional.</h1>
            <p className="mt-5 max-w-2xl text-lg text-white/70">
              Explore o acervo oficial do Meu Shape, visualize tecnicas, avalie o risco biomecanico e envie os movimentos direto para a construcao das fichas.
            </p>

            {error && (
              <p className="mt-4 rounded-2xl border border-[#FF8F8F]/30 bg-[#2B0C0C] px-4 py-3 text-sm text-[#FF8F8F]">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.35em] text-white/70">
              <span className="rounded-full border border-white/20 px-4 py-2">
                {stats.total} catalogados
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                {stats.withVideo} com video
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                {stats.advanced} avançados
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                {stats.lowImpact} baixo impacto
              </span>
            </div>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
            <div className="relative h-64 overflow-hidden rounded-[28px] border border-white/10">
              <img
                src={spotlightExercise?.imagem_url || DEFAULT_IMAGE}
                alt={spotlightExercise?.nome ?? "Exercicio destaque"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {spotlightExercise?.video_url && (
                <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Video disponivel
                </span>
              )}
            </div>
            <div className="mt-4 space-y-2 text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Em foco</p>
              <p className="text-2xl font-semibold">{spotlightExercise?.nome ?? "Selecione um movimento"}</p>
              <p className="text-sm text-white/70">
                {spotlightExercise?.descricao ?? "Escolha um exercicio para visualizar nivel, execucao e observacoes."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleCreateFicha}
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-6 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/30"
          >
            {selected.length === 0 ? "Montar ficha do zero" : `Enviar ${selected.length} para o construtor`}
          </button>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-3 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Atualizar biblioteca
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/40 bg-white/40 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busque por nome, descricao ou equipamento"
                className="flex-1 bg-transparent text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-secondary))] focus:outline-none dark:text-white"
              />
              <span className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-secondary))]">CTRL + K</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))] dark:text-white/70">
              {GROUP_FILTERS.map((group) => (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => setGroupFilter(group.value)}
                  className={`rounded-full px-3 py-1 ${
                    groupFilter === group.value
                      ? "bg-[#050914] text-white dark:bg-white/90 dark:text-slate-900"
                      : "border border-white/40 text-[rgb(var(--text-secondary))] dark:border-white/10"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Nivel" value={nivelFilter} options={LEVEL_OPTIONS} onChange={setNivelFilter} />
            <FilterSelect label="Risco" value={riscoFilter} options={RISK_OPTIONS} onChange={setRiscoFilter} />
            <FilterSelect
              label="Execucao"
              value={tipoExecucaoFilter}
              options={EXECUTION_OPTIONS}
              onChange={setTipoExecucaoFilter}
            />
            <FilterSelect label="Videos" value={videoFilter} options={VIDEO_OPTIONS} onChange={setVideoFilter} />
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={equipmentFilter}
              onChange={(event) => setEquipmentFilter(event.target.value)}
              placeholder="Filtrar por equipamento (ex.: barra, pulley, halteres)"
              className="flex-1 rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-secondary))] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setEquipmentFilter("");
                setGroupFilter("all");
                setVideoFilter("any");
                setNivelFilter("all");
                setRiscoFilter("all");
                setTipoExecucaoFilter("all");
              }}
              className="rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-white/60 dark:border-white/10 dark:text-white"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-secondary))]">Resumos rapidos</p>
          <div className="mt-4 space-y-4">
            <StatItem label="Catalogo ativo" value={`${stats.total} exercicios`} />
            <StatItem label="Com guia em video" value={`${stats.withVideo}`} />
            <StatItem label="Alta performance" value={`${stats.advanced}`} hint="Niveis avancado / pro" />
            <StatItem label="Baixo risco" value={`${stats.lowImpact}`} hint="Recomendados para iniciantes" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Resultados</p>
            <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">
              {loading ? "Carregando..." : `${items.length} movimentos`}
            </h2>
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-white/60 dark:text-white"
            >
              Limpar selecao
            </button>
          )}
        </div>

        {loading ? (
          <ExercisesSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-white/40 p-10 text-center text-[rgb(var(--text-secondary))] dark:border-slate-800">
            <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">Nenhum exercicio encontrado.</p>
            <p className="mt-2 text-sm">Experimente ajustar os filtros ou cadastrar novos movimentos no Supabase.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                selected={selected.includes(exercise.id)}
                onToggleSelect={() => toggleSelection(exercise.id)}
                onHighlight={() => setSpotlightId(exercise.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[rgb(var(--text-secondary))] dark:text-white/70">
      <span className="text-xs uppercase tracking-[0.35em]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatItem({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-[rgb(var(--text-primary))] shadow-inner dark:border-white/5 dark:bg-slate-900/60 dark:text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-[rgb(var(--text-secondary))]">{hint}</p>}
    </div>
  );
}

function ExerciseCard({ exercise, selected, onToggleSelect, onHighlight }) {
  const normalizedGroup = normalizeGroup(exercise.grupo);
  const levelBadge = getBadgeMeta(LEVEL_BADGES, exercise.nivel, {
    label: "Nivel livre",
    className: "border border-white/30 bg-white/10 text-[rgb(var(--text-secondary))]",
  });
  const riskBadge = getBadgeMeta(RISK_BADGES, exercise.risco, {
    label: "Risco avaliado",
    className: "border border-white/30 bg-white/10 text-[rgb(var(--text-secondary))]",
  });
  const executionLabel = formatExecutionLabel(exercise.tipo_execucao);
  const executionNotes = parseExecutionNotes(exercise.execucao).slice(0, 2);

  return (
    <article
      className={`flex flex-col rounded-[28px] border border-white/20 bg-white/80 p-4 shadow-lg transition hover:translate-y-[-2px] hover:shadow-2xl dark:border-white/5 dark:bg-slate-900/60 ${
        selected ? "border-[#32C5FF] shadow-[#32C5FF]/40" : ""
      }`}
    >
      <div className="relative h-48 overflow-hidden rounded-3xl border border-white/30">
        <Link to={`/exercicios/${exercise.id}`}>
          <img
            src={exercise.imagem_url || DEFAULT_IMAGE}
            alt={exercise.nome}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
            loading="lazy"
          />
        </Link>
        <button
          type="button"
          onClick={onHighlight}
          className="absolute right-4 top-4 rounded-full border border-white/40 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-black/70"
        >
          Em foco
        </button>
        {exercise.video_url && (
          <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Video
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/40 px-3 py-1 font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">
            {normalizedGroup || "Grupo livre"}
          </span>
          <span className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${levelBadge.className}`}>
            {levelBadge.label}
          </span>
          <span className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${riskBadge.className}`}>
            {riskBadge.label}
          </span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">{exercise.nome}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
            {exercise.descricao ?? "Sem descricao cadastrada."}
          </p>
        </div>
        <div className="text-sm text-[rgb(var(--text-secondary))]">
          <p className="font-semibold text-[rgb(var(--text-primary))] dark:text-white">Execucao</p>
          <p className="text-xs uppercase tracking-[0.3em]">{executionLabel}</p>
          <ul className="mt-2 space-y-1 text-[rgb(var(--text-secondary))]">
            {executionNotes.length > 0 ? (
              executionNotes.map((line, index) => (
                <li key={`${exercise.id}-note-${index}`} className="text-sm">
                  • {line}
                </li>
              ))
            ) : (
              <li className="text-sm">Sem observacoes detalhadas.</li>
            )}
          </ul>
        </div>
        {exercise.equipamento && (
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]">
            Equipamento: {exercise.equipamento}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-3 pt-3">
          <button
            type="button"
            onClick={onToggleSelect}
            className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              selected
                ? "bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] text-[#050914]"
                : "border border-white/40 text-[rgb(var(--text-primary))] hover:border-white/70 dark:text-white"
            }`}
          >
            {selected ? "Remover da ficha" : "Adicionar a ficha"}
          </button>
          <Link
            to={`/exercicios/${exercise.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:border-white/60 dark:text-white"
          >
            Ver detalhes
          </Link>
          <Link
            to={`/treinos/novo?exercicios=${exercise.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] hover:border-white/60 dark:text-white"
          >
            Usar agora
          </Link>
        </div>
      </div>
    </article>
  );
}

function ExercisesSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="rounded-[28px] border border-white/10 bg-white/70 p-4 shadow-lg dark:border-white/5 dark:bg-slate-900/60"
        >
          <div className="h-48 rounded-3xl bg-white/30 dark:bg-slate-800/60" />
          <div className="mt-4 space-y-3">
            <div className="h-4 rounded-full bg-white/30 dark:bg-slate-800/60" />
            <div className="h-4 rounded-full bg-white/30 dark:bg-slate-800/60" />
            <div className="h-4 rounded-full bg-white/20 dark:bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
