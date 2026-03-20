import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteInsight, generateInsight, listInsights } from "../services/insights.js";
import { resolveMediaUrl } from "../utils/media.js";

const PERIOD_OPTIONS = [
  { label: "Ultimos 7 dias", value: 7 },
  { label: "Ultimos 30 dias", value: 30 },
  { label: "Ultimos 90 dias", value: 90 },
];

let html2canvasPromise = null;
let jsPdfPromise = null;

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const safe = new Date(`${value}T00:00:00`);
  if (Number.isNaN(safe.getTime())) return value;
  return safe.toLocaleDateString("pt-BR");
}

function buildPeriodLabel(periodoInicio, periodoFim) {
  if (!periodoInicio || !periodoFim) return "Periodo nao informado";
  return `${formatDate(periodoInicio)} a ${formatDate(periodoFim)}`;
}

function extractMetric(insight, path, fallback = null) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), insight) ?? fallback;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatDelta(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit}`;
}

function hasAnyMeasure(measures = {}) {
  const keys = ["peso", "braco", "peito", "cintura", "quadril", "perna", "gordura_corporal", "massa_magra"];
  return keys.some((key) => Number.isFinite(Number(measures?.[key])));
}

function formatMeasureValue(value, unit = "") {
  if (!Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(1)}${unit}`;
}

function buildSeriesPath(series, width, height, min, range) {
  const points = series
    .map((value, index) => {
      if (!Number.isFinite(value)) return null;
      const x = 10 + (index / Math.max(1, series.length - 1)) * (width - 20);
      const y = height - ((value - min) / range) * height;
      return `${x} ${y}`;
    })
    .filter(Boolean);
  if (points.length < 2) return null;
  return `M ${points[0]} ${points.slice(1).map((point) => `L ${point}`).join(" ")}`;
}

function MeasureMiniChart({ series = [], pesoInicio, pesoFim, gorduraInicio, gorduraFim, massaInicio, massaFim }) {
  const seriePeso = series.map((item) => Number(item.peso)).filter((value) => Number.isFinite(value));
  const serieGordura = series.map((item) => Number(item.gordura_corporal)).filter((value) => Number.isFinite(value));
  const serieMassa = series.map((item) => Number(item.massa_magra)).filter((value) => Number.isFinite(value));
  const fallback = [
    Number(pesoInicio),
    Number(pesoFim),
    Number(gorduraInicio),
    Number(gorduraFim),
    Number(massaInicio),
    Number(massaFim),
  ].filter((value) => Number.isFinite(value));

  const values = [...seriePeso, ...serieGordura, ...serieMassa, ...fallback].filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-white/40 bg-white/60 p-4 text-xs text-[rgb(var(--text-secondary))] dark:border-white/10 dark:bg-slate-900/70">
        Sem dados suficientes para o grafico.
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const height = 60;
  const width = 160;

  const pesoPath = series.length
    ? buildSeriesPath(series.map((item) => Number(item.peso)), width, height, min, range)
    : buildSeriesPath([Number(pesoInicio), Number(pesoFim)], width, height, min, range);
  const gorduraPath = series.length
    ? buildSeriesPath(series.map((item) => Number(item.gordura_corporal)), width, height, min, range)
    : buildSeriesPath([Number(gorduraInicio), Number(gorduraFim)], width, height, min, range);
  const massaPath = series.length
    ? buildSeriesPath(series.map((item) => Number(item.massa_magra)), width, height, min, range)
    : buildSeriesPath([Number(massaInicio), Number(massaFim)], width, height, min, range);

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 text-xs shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Evolucao peso vs gordura</p>
      <svg width={width} height={height} className="mt-3">
        <path d={`M 10 ${height} L ${width - 10} ${height}`} stroke="#E2E8F0" strokeWidth="2" fill="none" />
        {pesoPath ? <path d={pesoPath} stroke="#32C5FF" strokeWidth="3" fill="none" /> : null}
        {gorduraPath ? <path d={gorduraPath} stroke="#F5B759" strokeWidth="3" fill="none" /> : null}
        {massaPath ? <path d={massaPath} stroke="#34D399" strokeWidth="3" fill="none" /> : null}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[rgb(var(--text-secondary))]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#32C5FF]" />
          Peso
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F5B759]" />
          Gordura
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#34D399]" />
          Massa magra
        </span>
      </div>
    </div>
  );
}

async function ensureHtml2Canvas() {
  if (typeof window === "undefined") {
    throw new Error("Exportacao indisponivel neste dispositivo.");
  }
  if (window.html2canvas) return window.html2canvas;
  if (!html2canvasPromise) {
    html2canvasPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => resolve(window.html2canvas);
      script.onerror = () => reject(new Error("Falha ao carregar gerador de imagem para exportacao."));
      document.body.appendChild(script);
    });
  }
  return html2canvasPromise;
}

async function ensureJsPdf() {
  if (typeof window === "undefined") {
    throw new Error("Exportacao indisponivel neste dispositivo.");
  }
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (!jsPdfPromise) {
    jsPdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      script.async = true;
      script.onload = () => resolve(window.jspdf?.jsPDF);
      script.onerror = () => reject(new Error("Falha ao carregar o exportador de PDF."));
      document.body.appendChild(script);
    });
  }
  const JsPDF = await jsPdfPromise;
  if (!JsPDF) {
    throw new Error("Falha ao preparar o exportador de PDF.");
  }
  return JsPDF;
}

function InsightMetrics({ insight }) {
  const treinos = insight?.metadata?.treinos?.total ?? null;
  const volume = insight?.metadata?.execucoes?.volume_total ?? null;
  const calorias = insight?.metadata?.alimentacao?.calorias_total ?? null;
  const medidas = insight?.metadata?.medidas?.deltas ?? {};
  const pesoInicio = insight?.metadata?.medidas?.inicio?.peso;
  const pesoFim = insight?.metadata?.medidas?.fim?.peso;
  const hasPeso = Number.isFinite(Number(pesoInicio)) && Number.isFinite(Number(pesoFim));
  const deltaPeso =
    hasPeso && Number.isFinite(Number(medidas?.peso))
      ? `${medidas.peso > 0 ? "+" : ""}${medidas.peso} kg`
      : null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      {Number.isFinite(treinos) ? (
        <span className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 px-3 py-1 text-[rgb(var(--text-secondary))]">
          🏋️ {treinos} treinos
        </span>
      ) : null}
      {Number.isFinite(volume) ? (
        <span className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 px-3 py-1 text-[rgb(var(--text-secondary))]">
          📈 Volume {volume}
        </span>
      ) : null}
      {Number.isFinite(calorias) ? (
        <span className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 px-3 py-1 text-[rgb(var(--text-secondary))]">
          🍽️ {calorias} kcal
        </span>
      ) : null}
      {deltaPeso ? (
        <span className="rounded-full border border-[#32C5FF]/40 bg-[#E6F4FF]/80 px-3 py-1 text-[#0F1F3C]">
          ⚖️ Peso {deltaPeso}
        </span>
      ) : !hasPeso ? (
        <span className="text-xs text-[rgb(var(--text-secondary))]">Peso nao registrado no periodo.</span>
      ) : null}
    </div>
  );
}

export default function InsightsPage() {
  const { user } = useAuth();
  const [periodDays, setPeriodDays] = useState(30);
  const [customPeriodEnabled, setCustomPeriodEnabled] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [insightsState, setInsightsState] = useState({ loading: false, error: null, items: [] });
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const exportRef = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const userAvatar =
    resolveMediaUrl(user?.user_metadata?.avatar_url) ||
    resolveMediaUrl(user?.user_metadata?.photo_url) ||
    null;
  const userName = user?.user_metadata?.full_name || user?.email || "Atleta Meu Shape";

  const lastInsight = insightsState.items?.[0] ?? null;
  const lastGeneratedLabel = lastInsight?.criado_em
    ? new Date(lastInsight.criado_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Nenhum insight ainda";

  const periodPreview = useMemo(() => {
    if (customPeriodEnabled && customStart && customEnd) {
      return buildPeriodLabel(customStart, customEnd);
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - periodDays);
    return buildPeriodLabel(toISODate(start), toISODate(end));
  }, [customEnd, customPeriodEnabled, customStart, periodDays]);

  const insightsById = useMemo(() => {
    const map = new Map();
    (insightsState.items || []).forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [insightsState.items]);

  const comparison = useMemo(() => {
    const insightA = insightsById.get(compareA);
    const insightB = insightsById.get(compareB);
    if (!insightA || !insightB) return null;

    const metrics = [
      {
        label: "Treinos",
        a: toNumber(extractMetric(insightA, "metadata.treinos.total")),
        b: toNumber(extractMetric(insightB, "metadata.treinos.total")),
        unit: "",
      },
      {
        label: "Volume",
        a: toNumber(extractMetric(insightA, "metadata.execucoes.volume_total")),
        b: toNumber(extractMetric(insightB, "metadata.execucoes.volume_total")),
        unit: "",
      },
      {
        label: "Calorias (alimentacao)",
        a: toNumber(extractMetric(insightA, "metadata.alimentacao.calorias_total")),
        b: toNumber(extractMetric(insightB, "metadata.alimentacao.calorias_total")),
        unit: " kcal",
      },
      {
        label: "Delta peso",
        a: toNumber(extractMetric(insightA, "metadata.medidas.deltas.peso")),
        b: toNumber(extractMetric(insightB, "metadata.medidas.deltas.peso")),
        unit: " kg",
      },
    ];

    const rows = metrics.map((metric) => ({
      ...metric,
      delta: metric.a != null && metric.b != null ? Number((metric.b - metric.a).toFixed(2)) : null,
    }));

    return {
      insightA,
      insightB,
      rows,
    };
  }, [compareA, compareB, insightsById]);

  useEffect(() => {
    let isMounted = true;
    if (!user) return undefined;
    setInsightsState((prev) => ({ ...prev, loading: true, error: null }));
    listInsights({ usuarioId: user.id })
      .then((items) => {
        if (!isMounted) return;
        setInsightsState({ loading: false, error: null, items });
      })
      .catch((error) => {
        if (!isMounted) return;
        setInsightsState({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar insights.",
          items: [],
        });
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const originalOverflow = document.body.style.overflow;
    if (deleteTarget) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [deleteTarget]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const end = customPeriodEnabled && customEnd ? new Date(`${customEnd}T00:00:00`) : new Date();
      const start = customPeriodEnabled && customStart ? new Date(`${customStart}T00:00:00`) : new Date();
      if (!customPeriodEnabled) {
        start.setDate(end.getDate() - periodDays);
      }
      const insight = await generateInsight({
        usuarioId: user.id,
        periodoInicio: toISODate(start),
        periodoFim: toISODate(end),
      });
      if (insight) {
        setInsightsState((prev) => ({
          loading: false,
          error: null,
          items: [insight, ...(prev.items || [])],
        }));
        toast.success("Insight gerado e salvo.");
      } else {
        toast.error("Insight gerado, mas nao retornou dados.");
      }
    } catch (error) {
      toast.error(error?.message ?? "Nao foi possivel gerar o insight.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current) {
      toast.error("Nao foi possivel preparar a exportacao.");
      return;
    }
    setExporting(true);
    try {
      const html2canvas = await ensureHtml2Canvas();
      const JsPDF = await ensureJsPdf();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const pdf = new JsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save("insights-meu-shape.pdf");
      toast.success("PDF exportado com sucesso.");
    } catch (error) {
      toast.error(error?.message ?? "Nao foi possivel exportar o PDF agora.");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[#E6F4FF] via-white to-[#F0FFF8] p-6 shadow-xl dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Insights IA</p>
            <h1 className="mt-3 text-3xl font-semibold text-[rgb(var(--text-primary))]">
              Resumo inteligente da sua evolucao
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[rgb(var(--text-secondary))]">
              Gere um panorama com cargas, medidas, alimentacao e consistencia. Cada insight fica salvo para comparar
              fases e entender a evolucao do seu shape.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-white/40 bg-white/80 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Periodo selecionado</p>
            <p className="text-base font-semibold text-[rgb(var(--text-primary))]">{periodPreview}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Ultimo insight: {lastGeneratedLabel}</p>
          </div>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            disabled={customPeriodEnabled}
            className="rounded-full border border-white/40 bg-white/80 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] shadow-sm outline-none transition focus:border-[#32C5FF] dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCustomPeriodEnabled((prev) => !prev)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              customPeriodEnabled
                ? "border-[rgb(var(--color-accent-primary))]/60 bg-[rgba(var(--color-accent-primary),0.12)] text-[rgb(var(--text-primary))]"
                : "border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 text-[rgb(var(--text-secondary))]"
            }`}
          >
            Periodo personalizado
          </button>
          {customPeriodEnabled ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-full border border-white/40 bg-white/80 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
              />
              <span className="text-xs text-[rgb(var(--text-secondary))]">ate</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-full border border-white/40 bg-white/80 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center justify-center rounded-full bg-[#32C5FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#32C5FF]/30 transition hover:bg-[#0F1F3C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Gerando insight..." : "Gerar novo insight"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || insightsState.items.length === 0}
            className="inline-flex items-center justify-center rounded-full border border-[#0F1F3C]/20 bg-white/80 px-5 py-2 text-sm font-semibold text-[#0F1F3C] shadow-sm transition hover:border-[#32C5FF]/60 hover:text-[#32C5FF] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
          >
            {exporting ? "Exportando PDF..." : "Exportar PDF"}
          </button>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-16 h-48 w-48 rounded-full bg-[#32C5FF]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-[#67FF9A]/20 blur-3xl" />
      </section>

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Historico</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Insights salvos</h2>
          </div>
          {insightsState.loading ? (
            <span className="text-xs text-[rgb(var(--text-secondary))]">Carregando...</span>
          ) : null}
        </header>

        {insightsState.error ? (
          <div className="rounded-3xl border border-[#FF8F8F]/40 bg-[#FFECEC]/70 p-4 text-sm text-[#C92A2A] dark:bg-[#2C1111]/60">
            {insightsState.error}
          </div>
        ) : null}

        {!insightsState.loading && insightsState.items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/40 bg-white/70 p-6 text-sm text-[rgb(var(--text-secondary))] dark:border-white/10 dark:bg-slate-900/70">
            Nenhum insight salvo ainda. Clique em "Gerar novo insight" para criar o primeiro panorama.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {insightsState.items.map((insight) => (
            <article
              key={insight.id}
              className="rounded-[28px] border border-white/20 bg-white/80 p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Insight IA</p>
                  <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                    {buildPeriodLabel(insight.periodo_inicio, insight.periodo_fim)}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))] dark:border-white/10 dark:bg-slate-900/70">
                    {formatDate(insight.criado_em?.slice(0, 10))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(insight)}
                    className="rounded-full border border-rose-300/60 bg-rose-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-600 transition hover:border-rose-400 hover:bg-rose-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <div className="mt-4 whitespace-pre-line text-sm text-[rgb(var(--text-secondary))]">
                {insight.resposta_ia || "Insight indisponivel."}
              </div>
              <InsightMetrics insight={insight} />
              {hasAnyMeasure(insight?.metadata?.medidas?.fim) ? (
                <div className="mt-5 rounded-3xl border border-white/40 bg-white/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Medidas corporais</p>
                    <div className="flex flex-wrap gap-2">
                      {insight?.metadata?.medidas_fora_periodo ? (
                        <span className="rounded-full border border-[#F5B759]/40 bg-[#FFF7E8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B45309]">
                          Fora do periodo
                        </span>
                      ) : null}
                      {insight?.metadata?.medidas_base_fora_periodo ? (
                        <span className="rounded-full border border-[#32C5FF]/30 bg-[#E6F4FF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0F1F3C]">
                          Base anterior
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {insight?.metadata?.medidas?.inicio_data ? (
                    <p className="mt-2 text-xs text-[rgb(var(--text-secondary))]">
                      Base: {formatDate(insight?.metadata?.medidas?.inicio_data)} · Atual:{" "}
                      {formatDate(insight?.metadata?.medidas?.fim_data)}
                    </p>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Peso</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.peso, " kg")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.peso), " kg")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Gordura corporal</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.gordura_corporal, "%")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.gordura_corporal), "%")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Cintura</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.cintura, " cm")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.cintura), " cm")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Quadril</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.quadril, " cm")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.quadril), " cm")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Braco</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.braco, " cm")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.braco), " cm")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Peito</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.peito, " cm")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.peito), " cm")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Perna</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.perna, " cm")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.perna), " cm")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Massa magra</p>
                      <p className="text-base font-semibold text-[rgb(var(--text-primary))]">
                        {formatMeasureValue(insight?.metadata?.medidas?.fim?.massa_magra, " kg")}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        Delta: {formatDelta(Number(insight?.metadata?.medidas?.deltas?.massa_magra), " kg")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <MeasureMiniChart
                      series={insight?.metadata?.medidas?.serie}
                      pesoInicio={insight?.metadata?.medidas?.inicio?.peso}
                      pesoFim={insight?.metadata?.medidas?.fim?.peso}
                      gorduraInicio={insight?.metadata?.medidas?.inicio?.gordura_corporal}
                      gorduraFim={insight?.metadata?.medidas?.fim?.gordura_corporal}
                      massaInicio={insight?.metadata?.medidas?.inicio?.massa_magra}
                      massaFim={insight?.metadata?.medidas?.fim?.massa_magra}
                    />
                  </div>
                  {Number(insight?.metadata?.medidas?.deltas?.gordura_corporal) < 0 ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                      Parabens! Gordura corporal diminuiu {Math.abs(Number(insight?.metadata?.medidas?.deltas?.gordura_corporal)).toFixed(1)}% no periodo.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/20 bg-white/80 p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Comparativo</p>
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Duas fases lado a lado</h2>
          </div>
          <p className="text-xs text-[rgb(var(--text-secondary))]">
            Selecione dois insights para comparar cargas, treinos e medidas.
          </p>
        </header>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr,1fr]">
          <select
            value={compareA}
            onChange={(event) => setCompareA(event.target.value)}
            className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
          >
            <option value="">Insight A</option>
            {insightsState.items.map((item) => (
              <option key={item.id} value={item.id}>
                {buildPeriodLabel(item.periodo_inicio, item.periodo_fim)}
              </option>
            ))}
          </select>
          <select
            value={compareB}
            onChange={(event) => setCompareB(event.target.value)}
            className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
          >
            <option value="">Insight B</option>
            {insightsState.items.map((item) => (
              <option key={item.id} value={item.id}>
                {buildPeriodLabel(item.periodo_inicio, item.periodo_fim)}
              </option>
            ))}
          </select>
        </div>

        {comparison ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="rounded-3xl border border-white/40 bg-white/70 p-5 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Resumo</p>
              <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">
                {buildPeriodLabel(comparison.insightA.periodo_inicio, comparison.insightA.periodo_fim)} vs{" "}
                {buildPeriodLabel(comparison.insightB.periodo_inicio, comparison.insightB.periodo_fim)}
              </p>
              <div className="mt-4 space-y-3 text-[rgb(var(--text-secondary))]">
                {comparison.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--text-subtle))]">{row.label}</span>
                    <span className="text-sm">
                      {row.a ?? "—"} → {row.b ?? "—"}{" "}
                      <span className="text-xs font-semibold text-[#32C5FF]">
                        {row.delta != null ? formatDelta(row.delta, row.unit) : "—"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/40 bg-white/70 p-5 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Insight mais recente</p>
              <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">
                {comparison.insightB.resposta_ia ? "Analise IA" : "Sem analise"}
              </p>
              <p className="mt-3 whitespace-pre-line text-[rgb(var(--text-secondary))]">
                {comparison.insightB.resposta_ia || "Sem insight para esta fase."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-white/40 bg-white/70 p-5 text-sm text-[rgb(var(--text-secondary))] dark:border-white/10 dark:bg-slate-900/70">
            Selecione dois insights para habilitar o comparativo.
          </div>
        )}
      </section>

      <div className="fixed left-[-9999px] top-[-9999px] w-[900px]" aria-hidden ref={exportRef}>
        <div className="rounded-[32px] border border-[#32C5FF]/30 bg-white p-8 text-[#0F1F3C] shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[#5A7184]">Insights Meu Shape</p>
              <h2 className="mt-3 text-3xl font-semibold">Resumo IA & comparativo</h2>
              <p className="mt-1 text-sm text-[#5A7184]">{lastGeneratedLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#32C5FF]/40"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F4FF] text-base font-semibold text-[#0F1F3C] ring-2 ring-[#32C5FF]/30">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-[#5A7184]">Atleta</p>
                <p className="text-sm font-semibold text-[#0F1F3C]">{userName}</p>
              </div>
            </div>
          </div>

          {lastInsight ? (
            <div className="mt-6 rounded-3xl border border-[#E6EAF2] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#5A7184]">Insight mais recente</p>
              <p className="mt-2 text-lg font-semibold">{buildPeriodLabel(lastInsight.periodo_inicio, lastInsight.periodo_fim)}</p>
              <p className="mt-3 whitespace-pre-line text-sm text-[#3C5064]">{lastInsight.resposta_ia}</p>
              <InsightMetrics insight={lastInsight} />
              <div className="mt-4">
                <MeasureMiniChart
                  series={lastInsight?.metadata?.medidas?.serie}
                  pesoInicio={lastInsight?.metadata?.medidas?.inicio?.peso}
                  pesoFim={lastInsight?.metadata?.medidas?.fim?.peso}
                  gorduraInicio={lastInsight?.metadata?.medidas?.inicio?.gordura_corporal}
                  gorduraFim={lastInsight?.metadata?.medidas?.fim?.gordura_corporal}
                  massaInicio={lastInsight?.metadata?.medidas?.inicio?.massa_magra}
                  massaFim={lastInsight?.metadata?.medidas?.fim?.massa_magra}
                />
              </div>
              {Number(lastInsight?.metadata?.medidas?.deltas?.gordura_corporal) < 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                  Gordura corporal caiu {Math.abs(Number(lastInsight?.metadata?.medidas?.deltas?.gordura_corporal)).toFixed(1)}% no periodo.
                </div>
              ) : null}
            </div>
          ) : null}

          {comparison ? (
            <div className="mt-6 rounded-3xl border border-[#E6EAF2] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#5A7184]">Comparativo</p>
              <p className="mt-2 text-sm font-semibold text-[#0F1F3C]">
                {buildPeriodLabel(comparison.insightA.periodo_inicio, comparison.insightA.periodo_fim)} vs{" "}
                {buildPeriodLabel(comparison.insightB.periodo_inicio, comparison.insightB.periodo_fim)}
              </p>
              <div className="mt-3 space-y-2 text-sm text-[#3C5064]">
                {comparison.rows.map((row) => (
                  <div key={`export-${row.label}`} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span>
                      {row.a ?? "—"} → {row.b ?? "—"} ({row.delta != null ? formatDelta(row.delta, row.unit) : "—"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {deleteTarget && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
                <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Excluir insight</p>
                <h3 className="mt-3 text-xl font-semibold text-[rgb(var(--text-primary))]">Deseja remover este insight?</h3>
                <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
                  Essa acao remove o insight permanentemente. Voce pode gerar um novo quando quiser.
                </p>
                <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-xs text-[rgb(var(--text-secondary))] dark:border-white/10 dark:bg-slate-900/70">
                  {buildPeriodLabel(deleteTarget.periodo_inicio, deleteTarget.periodo_fim)}
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user?.id) return;
                      try {
                        await deleteInsight({ insightId: deleteTarget.id, usuarioId: user.id });
                        setInsightsState((prev) => ({
                          ...prev,
                          items: prev.items.filter((item) => item.id !== deleteTarget.id),
                        }));
                        setDeleteTarget(null);
                        toast.success("Insight excluido.");
                      } catch (error) {
                        toast.error(error?.message ?? "Nao foi possivel excluir o insight.");
                      }
                    }}
                    className="rounded-full border border-rose-300/60 bg-rose-50/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 hover:bg-rose-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
