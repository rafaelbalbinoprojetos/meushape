import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFichas } from "../hooks/useFichas.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveMediaUrl } from "../utils/media.js";

const GOAL_FILTERS = [
  { id: "all", label: "Todos os objetivos" },
  { id: "Hipertrofia", label: "Hipertrofia" },
  { id: "Emagrecimento", label: "Emagrecimento" },
  { id: "Saúde geral", label: "Saúde geral" },
];

const LEVEL_FILTERS = ["Todos", "Iniciante", "Intermediário", "Avançado"];
const ADVANCED_FILTERS = {
  tempo: ["15 min", "30 min", "45 min", "60 min"],
  estilo: ["Full body", "Upper/Lower", "Push/Pull/Legs", "Mobilidade"],
  equipamento: ["Sem equipamento", "Halteres", "Barra", "Máquina"],
  intensidade: ["Leve", "Médio", "Pesado"],
  frequencia: ["3x semana", "4x semana", "5x semana", "6x semana"],
};
const FALLBACK_THUMBNAIL =
  "https://wqqygppadqecwwznocny.supabase.co/storage/v1/object/public/fichas/thumbnail%20fichas.png";

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

function AdvancedSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/80">
      <span className="text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))] dark:text-white/60">{label}</span>
      <select
        className="w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Qualquer</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/70 p-3 dark:border-slate-800 dark:bg-white/5">
      <p className="text-[rgb(var(--text-subtle))]">{label}</p>
      <p className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">{value}</p>
    </div>
  );
}

function buildFichaMeta(ficha) {
  const objetivo = ficha.objetivo || ficha.goal || "Objetivo livre";
  const nivel = ficha.nivel || ficha.level || "Nível livre";
  const foco = ficha.foco || ficha.focus || ficha.descricao || "";
  const thumbnail = resolveMediaUrl(ficha.capa_url || ficha.thumbnail_url) || FALLBACK_THUMBNAIL;
  const duracao = ficha.duracao_media_min || ficha.tempo_estimado_min || ficha.duracao || "—";
  const totalSeries = ficha.total_series || ficha.series_totais || "—";
  const totalExercicios = ficha.total_exercicios || ficha.exercicios_totais || "—";
  const volume = ficha.volume_estimado || ficha.volume_total || "—";
  const descanso = ficha.descanso_medio_seg || ficha.descanso_medio || "—";

  const badges = [];
  if (ficha.favorito) badges.push("⭐ Favorito");
  if (ficha.nova || ficha.is_new) badges.push("🆕 Nova");
  if (ficha.popular || (ficha.likes ?? 0) > 10) badges.push("🔥 Popular");

  const sequenciaBruta = ficha.divisao_labels || ficha.subdivisoes || ficha.divisao || ficha.sequencia || ficha.blocos || ficha.split;
  const sequenciaArr = Array.isArray(sequenciaBruta)
    ? sequenciaBruta
    : typeof sequenciaBruta === "string"
      ? sequenciaBruta.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
      : null;
  const line1 = sequenciaArr?.length ? sequenciaArr.join(" • ") : "A • B • C";
  const gruposArr = Array.isArray(ficha.grupos_predominantes)
    ? ficha.grupos_predominantes
    : typeof ficha.grupos_predominantes === "string"
      ? ficha.grupos_predominantes.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
      : null;
  const line2 = gruposArr?.length ? gruposArr.join(" • ") : "Peito/Tríceps • Costas/Bíceps • Pernas/Ombros";

  return { objetivo, nivel, foco, thumbnail, duracao, totalSeries, totalExercicios, volume, descanso, badges, line1, line2 };
}

function FichaCard({ ficha }) {
  const { objetivo, nivel, foco, thumbnail, duracao, totalSeries, totalExercicios, volume, descanso, badges, line1, line2 } =
    buildFichaMeta(ficha);

  return (
    <article className="flex flex-col gap-5 rounded-[32px] border border-white/40 bg-white/70 p-5 shadow-lg shadow-slate-900/5 transition hover:border-[#32C5FF]/40 hover:bg-white/80 hover:scale-[1.008] dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900/60">
      <div className="grid gap-4 md:grid-cols-[180px,1fr]">
        <img src={thumbnail} alt={ficha.nome || "Ficha"} loading="lazy" className="h-44 w-full rounded-3xl object-cover md:h-full" />
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">
            <span>{objetivo}</span>
            <span className="h-1 w-1 rounded-full bg-[rgb(var(--text-subtle))]" />
            <span>{nivel}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">{ficha.nome || "Ficha sem nome"}</h3>
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-[#32C5FF]/12 px-2.5 py-1 text-[11px] font-semibold text-[#0f1f3c] dark:bg-white/10 dark:text-white">
                {badge}
              </span>
            ))}
          </div>
          <p className="text-sm text-[rgb(var(--text-secondary))]">{foco || "Descrição indisponível"}</p>
          <p className="mt-2 text-xs font-semibold text-[rgb(var(--text-primary))] dark:text-white">{line1}</p>
          <p className="text-[11px] text-[rgb(var(--text-secondary))]">{line2}</p>
          <div className="mt-4 grid gap-3 text-xs text-[rgb(var(--text-secondary))] sm:grid-cols-3">
            <MetricCard label="Duração média" value={duracao !== "—" ? `${duracao} min` : "—"} />
            <MetricCard label="Total de séries" value={totalSeries} />
            <MetricCard label="Total de exercícios" value={totalExercicios} />
            <MetricCard label="Volume estimado" value={volume !== "—" ? `${volume}` : "—"} />
            <MetricCard label="Descanso médio" value={descanso !== "—" ? `${descanso}s` : "—"} />
            <MetricCard label="Objetivo" value={objetivo} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/fichas/${ficha.id ?? ""}`}
          className="inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold shadow-md transition hover:scale-[1.01]"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgb(var(--color-accent-primary)), rgb(var(--color-secondary-primary)))",
            color: "#041220",
            boxShadow: "0 18px 36px -20px rgba(0,0,0,0.4)",
          }}
        >
          Abrir ficha
        </Link>
        <Link
          to={`/fichas/${ficha.id ?? ""}?modo=guia`}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-[#67FF9A] to-[#32C5FF] px-4 py-2 text-sm font-semibold text-[#041220] shadow-md shadow-[#32C5FF]/25 transition hover:scale-[1.01]"
        >
          Iniciar execução
        </Link>
      </div>
    </article>
  );
}

export default function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [goalFilter, setGoalFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("Todos");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState({ tempo: "", estilo: "", equipamento: "", intensidade: "", frequencia: "" });
  const [mySort, setMySort] = useState("recentes");
  const { user } = useAuth();
  const fichaQuery = useFichas({ search, limit: 200, excludeUsuarioId: user?.id });
  const communityQuery = useFichas({
    search,
    limit: 200,
    communityOnly: true,
    excludeUsuarioId: user?.id,
  });
  const personalQuery = useFichas({
    search,
    limit: 200,
    usuarioId: user?.id,
    enabled: Boolean(user?.id),
  });

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

  const normalize = (value) => {
    if (typeof value !== "string") return "";
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const filteredFichas = useMemo(() => {
    return fichaQuery.items.filter((ficha) => {
      const objetivo = ficha.objetivo || ficha.goal || "";
      const nivel = ficha.nivel || ficha.level || "";
      const tempo = ficha.duracao_media_min || ficha.tempo_estimado_min || ficha.duracao || "";
      const estilo = ficha.estilo || ficha.foco || ficha.focus || "";
      const equipamento = Array.isArray(ficha.equipamentos) ? ficha.equipamentos.join(" ").toString() : ficha.equipamentos || "";
      const intensidade = ficha.intensidade || "";
      const frequencia = ficha.frequencia_semana || ficha.frequence || "";

      const matchesGoal = goalFilter === "all" || normalize(objetivo) === normalize(goalFilter);
      const matchesLevel = levelFilter === "Todos" || normalize(nivel) === normalize(levelFilter);
      const matchesTempo =
        !advanced.tempo ||
        !tempo ||
        (advanced.tempo === "15 min" && Number(tempo) <= 20) ||
        (advanced.tempo === "30 min" && Number(tempo) <= 35 && Number(tempo) >= 21) ||
        (advanced.tempo === "45 min" && Number(tempo) <= 50 && Number(tempo) >= 36) ||
        (advanced.tempo === "60 min" && Number(tempo) >= 51);
      const matchesEstilo = !advanced.estilo || normalize(estilo).includes(normalize(advanced.estilo));
      const matchesEquip = !advanced.equipamento || normalize(equipamento).includes(normalize(advanced.equipamento));
      const matchesInt = !advanced.intensidade || normalize(intensidade).includes(normalize(advanced.intensidade));
      const matchesFreq = !advanced.frequencia || normalize(String(frequencia)).includes(normalize(advanced.frequencia));
      return matchesGoal && matchesLevel && matchesTempo && matchesEstilo && matchesEquip && matchesInt && matchesFreq;
    });
  }, [advanced, fichaQuery.items, goalFilter, levelFilter]);

  const totalResultados = filteredFichas.length;
  const goalCounts = useMemo(() => {
    const base = { Hipertrofia: 0, Emagrecimento: 0, "Saúde geral": 0 };
    fichaQuery.items.forEach((ficha) => {
      const objetivo = ficha.objetivo || ficha.goal || "";
      const key = Object.keys(base).find((k) => normalize(k) === normalize(objetivo));
      if (key) base[key] += 1;
    });
    return base;
  }, [fichaQuery.items]);

  const personalSorted = useMemo(() => {
    const items = Array.isArray(personalQuery.items) ? [...personalQuery.items] : [];
    const parseDate = (value) => {
      const d = value ? new Date(value) : null;
      return d && !Number.isNaN(d.valueOf()) ? d.valueOf() : 0;
    };
    const num = (f, keys) => keys.reduce((acc, key) => (acc !== 0 ? acc : Number(f?.[key] ?? 0)), 0);
    items.sort((a, b) => {
      switch (mySort) {
        case "uso":
          return num(b, ["uso_count", "usos"]) - num(a, ["uso_count", "usos"]);
        case "populares":
          return num(b, ["likes", "popular_score"]) - num(a, ["likes", "popular_score"]);
        case "customizadas":
          return (b.tipo === "customizada" ? 1 : 0) - (a.tipo === "customizada" ? 1 : 0);
        case "ia":
          return (b.ia_gerada || b.origem === "ia" ? 1 : 0) - (a.ia_gerada || a.origem === "ia" ? 1 : 0);
        case "recentes":
        default:
          return parseDate(b.criado_em || b.created_at) - parseDate(a.criado_em || a.created_at);
      }
    });
    return items;
  }, [mySort, personalQuery.items]);

  const sortButtons = [
    { id: "recentes", label: "Recentes" },
    { id: "uso", label: "Mais usadas" },
    { id: "populares", label: "Populares" },
    { id: "customizadas", label: "Customizadas" },
    { id: "ia", label: "IA geradas" },
  ];

  const advancedPill = (label, value, onClear) =>
    value ? (
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-2 rounded-full bg-[#32C5FF]/10 px-3 py-1 text-xs font-semibold text-[#0f1f3c] dark:bg-white/10 dark:text-white"
      >
        {label}: {value} <span className="text-[10px]">✕</span>
      </button>
    ) : null;

  return (
    <div className="space-y-10">
      <section
        className="rounded-[32px] border p-6 text-[rgb(var(--text-primary))] shadow-2xl lg:p-10"
        style={{
          borderColor: "rgba(var(--color-accent-primary),0.22)",
          backgroundImage:
            "linear-gradient(135deg, rgba(var(--color-accent-primary),0.14), rgba(var(--color-secondary-primary),0.14)), linear-gradient(180deg, rgba(var(--surface-card),0.96), rgba(var(--surface-base),0.94))",
          boxShadow: "0 28px 80px -42px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">Centro de treinos</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[rgb(var(--text-primary))] lg:text-4xl">
              Escolha um bloco, siga o cronômetro inteligente e deixe o MEU SHAPE ajustar sua progressao.
            </h1>
            <p className="mt-4 max-w-2xl text-[rgb(var(--text-secondary))]">
              Combine fichas full body, divisoes classicas ou sessões de mobilidade. Cada programa traz séries, vídeos, tempos de descanso
              e recomendações de carga baseadas no seu historico.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/treinos/novo"
                className="inline-flex min-w-[200px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, rgb(var(--color-accent-primary)), rgb(var(--color-secondary-primary)))",
                  boxShadow: "0 18px 38px -22px rgba(0,0,0,0.55)",
                }}
              >
                Montar ficha personalizada
              </Link>
              <Link
                to="/coach"
                className="inline-flex min-w-[200px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:scale-[1.01]"
                style={{
                  borderColor: "rgba(var(--color-accent-primary),0.3)",
                  color: "rgb(var(--text-primary))",
                  backgroundColor: "rgba(var(--surface-muted),0.6)",
                }}
              >
                Pedir treino ao Coach IA
              </Link>
            </div>
          </div>
          <div
            className="rounded-3xl border p-5 text-sm backdrop-blur-xl"
            style={{
              borderColor: "rgba(var(--color-accent-primary),0.3)",
              backgroundColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 20px 50px -32px rgba(0,0,0,0.5)",
            }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-secondary))]">Resumo rapido</p>
            <ul className="mt-4 space-y-2">
              <li className="flex justify-between font-semibold text-[rgb(var(--text-primary))]">
                <span>Fichas encontradas</span>
                <span>{fichaQuery.total ?? "--"}</span>
              </li>
              <li className="flex justify-between text-[rgb(var(--text-secondary))]">
                <span>Objetivos filtrados</span>
                <span>{goalFilter === "all" ? "Todos" : goalFilter}</span>
              </li>
              <li className="flex justify-between text-[rgb(var(--text-secondary))]">
                <span>Nível atual</span>
                <span>{levelFilter}</span>
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
            {GOAL_FILTERS.map((filter) => {
              const count = filter.id === "all" ? fichaQuery.items.length : goalCounts[filter.label] ?? 0;
              return (
                <FilterButton key={filter.id} active={goalFilter === filter.id} onClick={() => setGoalFilter(filter.id)}>
                  {filter.label} {count ? `(${count})` : ""}
                </FilterButton>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {LEVEL_FILTERS.map((level) => (
              <FilterButton key={level} active={levelFilter === level} onClick={() => setLevelFilter(level)}>
                {level}
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[#32C5FF] hover:text-[#0f1f3c] dark:border-white/30 dark:text-white"
            >
              {showAdvanced ? "Ocultar filtros avançados" : "Filtros avançados"}
            </button>
            {advancedPill("Tempo", advanced.tempo, () => setAdvanced((p) => ({ ...p, tempo: "" })))}
            {advancedPill("Estilo", advanced.estilo, () => setAdvanced((p) => ({ ...p, estilo: "" })))}
            {advancedPill("Equipamento", advanced.equipamento, () => setAdvanced((p) => ({ ...p, equipamento: "" })))}
            {advancedPill("Intensidade", advanced.intensidade, () => setAdvanced((p) => ({ ...p, intensidade: "" })))}
            {advancedPill("Frequência", advanced.frequencia, () => setAdvanced((p) => ({ ...p, frequencia: "" })))}
          </div>
          {showAdvanced && (
            <div className="grid gap-4 rounded-3xl border border-white/30 bg-white/60 p-4 text-sm text-[rgb(var(--text-secondary))] shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
              <div className="grid gap-3 md:grid-cols-2">
                <AdvancedSelect
                  label="Tempo disponível"
                  value={advanced.tempo}
                  options={ADVANCED_FILTERS.tempo}
                  onChange={(value) => setAdvanced((prev) => ({ ...prev, tempo: value }))}
                />
                <AdvancedSelect
                  label="Estilo de treino"
                  value={advanced.estilo}
                  options={ADVANCED_FILTERS.estilo}
                  onChange={(value) => setAdvanced((prev) => ({ ...prev, estilo: value }))}
                />
                <AdvancedSelect
                  label="Equipamentos"
                  value={advanced.equipamento}
                  options={ADVANCED_FILTERS.equipamento}
                  onChange={(value) => setAdvanced((prev) => ({ ...prev, equipamento: value }))}
                />
                <AdvancedSelect
                  label="Intensidade"
                  value={advanced.intensidade}
                  options={ADVANCED_FILTERS.intensidade}
                  onChange={(value) => setAdvanced((prev) => ({ ...prev, intensidade: value }))}
                />
                <AdvancedSelect
                  label="Frequência semanal"
                  value={advanced.frequencia}
                  options={ADVANCED_FILTERS.frequencia}
                  onChange={(value) => setAdvanced((prev) => ({ ...prev, frequencia: value }))}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Resultados</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
              {fichaQuery.loading ? "Carregando fichas..." : `${totalResultados} fichas prontas para usar`}
            </h2>
          </div>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Cada ficha inclui séries, tempo de descanso, multimidia e observações de seguranca.
          </p>
        </header>

        {fichaQuery.error ? (
          <p className="rounded-[28px] border border-dashed border-[#FF8F8F]/40 bg-white/70 px-5 py-6 text-sm text-[#b00020] dark:border-white/20 dark:bg-slate-900/60">
            {fichaQuery.error}
          </p>
        ) : fichaQuery.loading ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Carregando fichas...
          </p>
        ) : filteredFichas.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Nenhuma ficha encontrada para os filtros selecionados. Ajuste objetivo ou nível.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredFichas.map((ficha) => (
              <FichaCard key={ficha.id ?? ficha.nome} ficha={ficha} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Minhas fichas</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Blocos que você salvou ou criou</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
              Somente você enxerga fichas privadas; públicas também aparecem no catálogo geral.
            </p>
          </div>
          {user && (
            <Link
              to="/treinos/novo"
              className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-[#050914] shadow-lg shadow-[#32C5FF]/40"
            >
              Cadastrar nova ficha
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {sortButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setMySort(btn.id)}
              className={`rounded-full border px-3 py-1 transition ${
                mySort === btn.id
                  ? "border-[#32C5FF] bg-[#32C5FF]/15 text-[#0f1f3c]"
                  : "border-white/30 text-[rgb(var(--text-secondary))] hover:border-[#32C5FF]/50 dark:border-white/20 dark:text-white/70"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {!user ? (
          <div className="rounded-3xl border border-dashed border-[#32C5FF]/40 bg-white/70 p-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Faça login para ver suas fichas pessoais e privadas.
          </div>
        ) : personalQuery.loading ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Carregando suas fichas...
          </p>
        ) : personalQuery.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#32C5FF]/40 bg-white/70 p-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Nenhuma ficha pessoal encontrada. Crie ou duplique uma ficha para aparecer aqui.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {personalSorted.map((ficha) => (
              <FichaCard key={ficha.id ?? ficha.nome} ficha={ficha} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Fichas da comunidade</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Templates públicos de outros atletas</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">Fichas marcadas como públicas por seus criadores.</p>
          </div>
          <button
            type="button"
            onClick={communityQuery.reload}
            className="rounded-2xl border border-[#0f1f3c] px-4 py-2 text-sm font-semibold text-[#0f1f3c] shadow-sm transition hover:border-[#32C5FF] hover:text-[#032840] dark:border-white/30 dark:text-white"
          >
            Recarregar
          </button>
        </div>

        {communityQuery.error ? (
          <p className="rounded-[28px] border border-dashed border-[#FF8F8F]/40 bg-white/70 px-5 py-6 text-sm text-[#b00020] dark:border-white/20 dark:bg-slate-900/60">
            {communityQuery.error}
          </p>
        ) : communityQuery.loading ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Carregando fichas da comunidade...
          </p>
        ) : communityQuery.items.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-[#32C5FF]/40 bg-white/70 px-5 py-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/20 dark:bg-slate-900/60">
            Nenhuma ficha pública encontrada. Peça ao Coach IA ou crie e compartilhe uma ficha.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {communityQuery.items.map((ficha) => (
              <FichaCard key={ficha.id ?? ficha.nome} ficha={ficha} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
