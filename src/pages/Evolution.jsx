import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchEvolutionStats, upsertMeasurement, deleteMeasurement } from "../services/evolution.js";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useTheme } from "../context/ThemeContext.jsx";

function StatCard({ label, value, detail, spark }) {
  const { themeId } = useTheme();
  return (
    <div
      className="rounded-3xl border p-5 shadow-lg"
      style={{
        borderColor: "var(--border-soft)",
        backgroundImage:
          "linear-gradient(150deg, rgba(var(--color-accent-primary),0.08), rgba(var(--color-secondary-primary),0.08)), linear-gradient(165deg, rgba(var(--surface-card),0.96), rgba(var(--surface-card),0.9))",
        color: "rgb(var(--text-primary))",
        boxShadow: "0 20px 48px -32px rgba(0,0,0,0.28)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-secondary))]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--text-primary))]">{value}</p>
      {detail ? <p className="text-sm text-[rgb(var(--text-secondary))]">{detail}</p> : null}
      {spark ? (
        <div className="mt-2">
          <ReactECharts key={themeId} option={spark} style={{ height: 48 }} opts={{ renderer: "svg" }} />
        </div>
      ) : null}
    </div>
  );
}

function VolumeTable({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
        Nenhum exercício registrado ainda.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[28px] border border-white/20 bg-white/70 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full text-sm">
        <thead className="bg-white/80 text-left text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))] dark:bg-slate-900/40">
          <tr>
            <th className="px-4 py-3">Exercicio</th>
            <th className="px-4 py-3">Volume (kg)</th>
            <th className="px-4 py-3">Series</th>
            <th className="px-4 py-3">Reps aprox.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t border-white/30 text-[rgb(var(--text-primary))] dark:border-slate-800">
              <td className="px-4 py-3">
                <p className="font-semibold">{row.exercicio?.nome ?? "Exercicio"}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{row.exercicio?.grupo ?? "Grupo livre"}</p>
              </td>
              <td className="px-4 py-3">{Math.round(row.volume)} kg</td>
              <td className="px-4 py-3">{row.series}</td>
              <td className="px-4 py-3">{row.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PRList({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
        Nenhum PR registrado ainda.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((pr) => (
        <li key={pr.id} className="flex items-center justify-between rounded-3xl border border-white/30 bg-white/80 px-4 py-3 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <p className="font-semibold text-[rgb(var(--text-primary))]">{pr.exercicio?.nome ?? "Exercicio"}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">{pr.exercicio?.grupo ?? "Grupo livre"}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{pr.carga ?? "—"} kg</p>
            <p className="text-xs text-[rgb(var(--text-subtle))]">{pr.repeticoes ? `${pr.repeticoes} reps` : ""}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function EvolutionPage() {
  const { user } = useAuth();
  const { isDark, themeId } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [measureError, setMeasureError] = useState(null);
  const [measureForm, setMeasureForm] = useState({
    id: null,
    data: new Date().toISOString().slice(0, 10),
    peso: "",
    gordura_corporal: "",
    braco: "",
    peito: "",
    cintura: "",
    quadril: "",
    perna: "",
    altura: "",
    imc: "",
    massa_magra: "",
    gordura_visceral: "",
    braco_contraido: "",
    coxa_esquerda: "",
    coxa_direita: "",
    panturrilha_esquerda: "",
    panturrilha_direita: "",
    cabeca_projetada: false,
    ombros_avancados: false,
    hipercifose: "",
    anteversao_pelve: false,
    joelho_valgo: false,
    flexao_qtd: "",
    abdominal_qtd: "",
    prancha_tempo_seg: "",
    ficha_id: "",
  });

  const themeColors = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        textPrimary: "rgb(15, 31, 60)",
        textSecondary: "rgb(60, 78, 102)",
        textSubtle: "rgb(113, 132, 161)",
        borderSoft: "rgba(15, 31, 60, 0.1)",
        tooltipBg: isDark ? "rgba(12,18,28,0.9)" : "rgba(255,255,255,0.95)",
        tooltipText: isDark ? "#f4f7fb" : "rgb(15, 31, 60)",
      };
    }
    const root = document.documentElement;
    const read = (name, fallback) => {
      const value = getComputedStyle(root).getPropertyValue(name).trim();
      return value || fallback;
    };
    const asRgb = (value, fallback) => `rgb(${value || fallback})`;
    return {
      textPrimary: asRgb(read("--text-primary"), "15 31 60"),
      textSecondary: asRgb(read("--text-secondary"), "60 78 102"),
      textSubtle: asRgb(read("--text-subtle"), "113 132 161"),
      borderSoft: read("--border-soft", "rgba(15, 31, 60, 0.1)"),
      tooltipBg: isDark ? "rgba(12,18,28,0.9)" : "rgba(255,255,255,0.95)",
      tooltipText: isDark ? "#f4f7fb" : "rgb(15, 31, 60)",
    };
  }, [isDark, themeId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvolutionStats({ usuarioId: user.id, days: 30 });
        if (active) setStats(data);
      } catch (err) {
        console.error("[EvolutionPage] erro ao carregar stats:", err);
        if (active) setError(err?.message ?? "Não foi possível carregar sua evolução.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const totals = stats?.totals ?? {};
  const topExercicios = stats?.topExercicios ?? [];
  const prs = stats?.prs ?? [];
  const treinos = stats?.treinos ?? [];
  const medidas = stats?.medidas ?? [];
  const medidaAtual = stats?.medidaAtual ?? null;
  const massaMagra = stats?.massaMagra ?? null;
  const medidasChrono = useMemo(() => (medidas.length > 0 ? [...medidas].reverse() : []), [medidas]);
  const primeiraMedida = medidasChrono[0] ?? null;
  const ultimaMedida = medidasChrono.at(-1) ?? null;
  const sparkOptions = useMemo(() => {
    const buildSpark = (key, color) => {
      if (medidasChrono.length === 0) return null;
      const data = medidasChrono.map((m) => (m[key] != null ? Number(m[key]) : null));
      if (data.every((v) => v == null)) return null;
      return {
        grid: { left: 0, right: 0, top: 4, bottom: 0 },
        xAxis: { type: "category", data: medidasChrono.map((m) => m.data), show: false },
        yAxis: { type: "value", show: false },
        tooltip: { show: false },
        series: [
          {
            type: "line",
            data,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color },
            areaStyle: { color: color + "33" },
          },
        ],
      };
    };
    return {
      peso: buildSpark("peso", "#4FACFE"),
      cintura: buildSpark("cintura", "#67FF9A"),
      bf: buildSpark("gordura_corporal", "#F5B759"),
    };
  }, [medidasChrono, themeColors]);

  const summaryDeltas = useMemo(() => {
    if (!ultimaMedida || !primeiraMedida) return null;
    const delta = (field) => {
      const current = ultimaMedida[field];
      const prev = primeiraMedida[field];
      if (current == null || prev == null) return null;
      const diff = Number(current) - Number(prev);
      const sign = diff > 0 ? "+" : "";
      return `${sign}${diff.toFixed(1)} ${field === "gordura_corporal" ? "%" : "kg"}`;
    };
    return {
      peso: delta("peso"),
      cintura: primeiraMedida.cintura != null && ultimaMedida.cintura != null ? `${(Number(ultimaMedida.cintura) - Number(primeiraMedida.cintura)).toFixed(1)} cm` : null,
      bf: delta("gordura_corporal"),
    };
  }, [primeiraMedida, ultimaMedida, themeColors]);
  const radarOptions = useMemo(() => {
    if (!medidas || medidas.length === 0) return null;
    const metrics = [
      { key: "peso", label: "Peso (kg)" },
      { key: "gordura_corporal", label: "BF (%)" },
      { key: "braco", label: "Braço (cm)" },
      { key: "peito", label: "Peito (cm)" },
      { key: "cintura", label: "Cintura (cm)" },
      { key: "quadril", label: "Quadril (cm)" },
      { key: "perna", label: "Perna (cm)" },
    ];
    const maxPerMetric = metrics.map((metric) => {
      const maxVal = Math.max(
        ...medidas
          .map((m) => (m[metric.key] != null ? Number(m[metric.key]) : null))
          .filter((v) => Number.isFinite(v)),
      );
      return Number.isFinite(maxVal) && maxVal > 0 ? maxVal * 1.1 : 10;
    });
    const indicators = metrics.map((metric, index) => ({
      name: metric.label,
      max: maxPerMetric[index],
    }));
    const seriesRaw = medidas
      .slice(0, 5)
      .reverse()
      .map((m) => ({
        name: m.data ?? "Registro",
        value: metrics.map((metric) => (m[metric.key] != null ? Number(m[metric.key]) : 0)),
      }));
    const latestIndex = seriesRaw.length - 1;
    const seriesData = seriesRaw.map((entry, index) => {
      const isLatest = index === latestIndex;
      return {
        ...entry,
        itemStyle: {
          color: isLatest ? "#4facfe" : "rgba(255,255,255,0.6)",
          borderColor: "#fff",
          borderWidth: isLatest ? 2 : 1,
          opacity: isLatest ? 1 : 0.8,
          shadowBlur: isLatest ? 10 : 0,
          shadowColor: isLatest ? "rgba(0, 242, 254, 0.5)" : "transparent",
        },
        lineStyle: {
          width: isLatest ? 3 : 1.5,
          color: isLatest
            ? new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: "#4FACFE" },
                { offset: 1, color: "#00F2FE" },
              ])
            : "rgba(255,255,255,0.35)",
          shadowBlur: isLatest ? 12 : 0,
          shadowColor: isLatest ? "rgba(0, 242, 254, 0.3)" : "transparent",
        },
        areaStyle: {
          opacity: isLatest ? 0.25 : 0.08,
          color: isLatest
            ? new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: "rgba(79, 172, 254, 0.45)" },
                { offset: 1, color: "rgba(0, 242, 254, 0.20)" },
              ])
            : "rgba(255,255,255,0.08)",
        },
      };
    });
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.borderSoft,
        borderWidth: 1,
        textStyle: { color: themeColors.tooltipText, fontSize: 12 },
        padding: 10,
      },
      legend: {
        data: seriesData.map((s) => s.name),
        top: 10,
        textStyle: { color: themeColors.textPrimary, fontSize: 13 },
      },
      radar: {
        name: {
          textStyle: {
            color: themeColors.textSecondary,
            fontSize: 13,
            fontWeight: "500",
            padding: [4, 6],
          },
        },
        indicator: indicators,
        splitNumber: 6,
        center: ["50%", "55%"],
        radius: "65%",
        splitLine: {
          lineStyle: {
            width: 1.2,
            color: [
              themeColors.borderSoft,
              themeColors.borderSoft,
              themeColors.borderSoft,
              themeColors.borderSoft,
              themeColors.borderSoft,
              themeColors.borderSoft,
            ],
          },
        },
        splitArea: {
          areaStyle: {
            color: [
              "rgba(0,0,0,0.01)",
              "rgba(0,0,0,0.02)",
              "rgba(0,140,255,0.03)",
              "rgba(0,140,255,0.04)",
              "rgba(0,140,255,0.05)",
              "rgba(0,140,255,0.07)",
            ],
          },
        },
        axisLine: {
          lineStyle: {
            color: themeColors.borderSoft,
            width: 1,
          },
        },
      },
      series: [
        {
          name: "Avaliação",
          type: "radar",
          symbol: "circle",
          symbolSize: 6,
          data: seriesData,
        },
      ],
    };
  }, [medidas, themeColors]);

  const lineOptionsByMetric = useMemo(() => {
    if (medidasChrono.length === 0) return [];
    const categories = medidasChrono.map((m) => m.data);
    const metrics = [
      { key: "peso", name: "Peso (kg)" },
      { key: "gordura_corporal", name: "BF (%)" },
      { key: "cintura", name: "Cintura (cm)" },
      { key: "quadril", name: "Quadril (cm)" },
      { key: "braco", name: "Braço (cm)" },
      { key: "perna", name: "Perna (cm)" },
    ];
    return metrics.map((metric) => ({
      name: metric.name,
      option: {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: themeColors.tooltipBg,
          borderColor: themeColors.borderSoft,
          borderWidth: 1,
          padding: 10,
          textStyle: { color: themeColors.tooltipText, fontSize: 12 },
          axisPointer: {
            type: "line",
            lineStyle: {
              color: themeColors.textSubtle,
              width: 1,
            },
          },
        },
        xAxis: {
          type: "category",
          data: categories,
          boundaryGap: false,
          axisLine: {
            lineStyle: { color: themeColors.borderSoft },
          },
          axisLabel: {
            color: themeColors.textSecondary,
            fontSize: 11,
          },
        },
        yAxis: {
          type: "value",
          axisLine: { show: false },
          splitLine: {
            show: true,
            lineStyle: { color: themeColors.borderSoft },
          },
          axisLabel: {
            color: themeColors.textSecondary,
            fontSize: 11,
          },
        },
        grid: {
          left: "4%",
          right: "4%",
          top: "10%",
          bottom: "8%",
        },
        series: [
          {
            name: metric.name,
            type: "line",
            smooth: true,
            showSymbol: true,
            symbolSize: 8,
            symbol: "circle",
            lineStyle: {
              width: 3,
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: "#4FACFE" },
                { offset: 1, color: "#00F2FE" },
              ]),
              shadowBlur: 12,
              shadowColor: "rgba(0, 242, 254, 0.3)",
            },
            itemStyle: {
              color: "#00F2FE",
              borderColor: "#fff",
              borderWidth: 2,
            },
            areaStyle: {
              opacity: 0.25,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(79, 172, 254, 0.45)" },
                { offset: 1, color: "rgba(79, 172, 254, 0.05)" },
              ]),
            },
            data: medidasChrono.map((m) => (m[metric.key] != null ? Number(m[metric.key]) : null)),
          },
        ],
      },
    }));
  }, [medidasChrono, themeColors]);

  const compareOptions = useMemo(() => {
    if (!primeiraMedida || !ultimaMedida) return null;
    const metrics = [
      { key: "peso", name: "Peso" },
      { key: "gordura_corporal", name: "BF%" },
      { key: "cintura", name: "Cintura" },
      { key: "quadril", name: "Quadril" },
      { key: "braco", name: "Braço" },
      { key: "perna", name: "Perna" },
    ];
    const categories = metrics.map((m) => m.name);
    const antes = metrics.map((m) => (primeiraMedida[m.key] != null ? Number(primeiraMedida[m.key]) : null));
    const depois = metrics.map((m) => (ultimaMedida[m.key] != null ? Number(ultimaMedida[m.key]) : null));

    // default: barras horizontais (x = valor, y = categoria)
    return {
      backgroundColor: "transparent",
      toolbox: {
        show: true,
        orient: "horizontal",
        right: 20,
        top: 10,
        iconStyle: { borderColor: "rgba(255,255,255,0.7)" },
        emphasis: { iconStyle: { borderColor: "#00f2fe" } },
        feature: {
          magicType: {
            type: ["line", "bar"],
            title: { line: "Barras horizontais", bar: "Barras verticais" },
            option: {
              line: {
                xAxis: { type: "value" },
                yAxis: { type: "category", data: categories, axisLabel: { margin: 12, interval: 0 } },
                series: [{ type: "bar" }, { type: "bar" }],
              },
              bar: {
                xAxis: { type: "category", data: categories, axisLabel: { margin: 12, interval: 0 } },
                yAxis: { type: "value" },
                series: [{ type: "bar" }, { type: "bar" }],
              },
            },
          },
          saveAsImage: {},
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.borderSoft,
        borderWidth: 1,
        padding: 10,
        textStyle: { color: themeColors.tooltipText, fontSize: 12 },
        axisPointer: {
          type: "shadow",
          shadowStyle: { color: themeColors.borderSoft },
        },
      },
      legend: {
        data: ["Antes", "Depois"],
        top: 10,
        textStyle: { color: themeColors.textPrimary },
        itemWidth: 14,
        itemHeight: 8,
      },
      xAxis: {
        type: "value",
        axisLabel: { color: themeColors.textSecondary, fontSize: 12 },
        splitLine: { lineStyle: { color: themeColors.borderSoft } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          color: themeColors.textPrimary,
          fontSize: 12,
          margin: 12,
          interval: 0,
        },
        axisLine: { lineStyle: { color: themeColors.borderSoft } },
      },
      grid: { left: "10%", right: "8%", top: "18%", bottom: "12%" },
      series: [
        {
          name: "Antes",
          type: "bar",
          barWidth: "30%",
          itemStyle: {
            borderRadius: [6, 6, 6, 6],
            shadowBlur: 15,
            shadowColor: "rgba(0, 140, 255, 0.35)",
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(0, 140, 255, 1)" },
              { offset: 1, color: "rgba(0, 140, 255, 0.3)" },
            ]),
          },
          emphasis: {
            itemStyle: { shadowBlur: 25, shadowColor: "rgba(0, 180, 255, 0.6)" },
          },
          data: antes,
        },
        {
          name: "Depois",
          type: "bar",
          barWidth: "30%",
          itemStyle: {
            borderRadius: [6, 6, 6, 6],
            shadowBlur: 15,
            shadowColor: "rgba(0, 255, 160, 0.35)",
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(0, 255, 160, 1)" },
              { offset: 1, color: "rgba(0, 255, 160, 0.3)" },
            ]),
          },
          emphasis: {
            itemStyle: { shadowBlur: 25, shadowColor: "rgba(0, 255, 180, 0.6)" },
          },
          data: depois,
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [primeiraMedida, ultimaMedida, themeColors]);

  const bfDonutOption = useMemo(() => {
    if (!ultimaMedida?.gordura_corporal && ultimaMedida?.gordura_corporal !== 0) return null;
    const bfValue = Number(ultimaMedida.gordura_corporal);
    const bfMax = 100;
    return {
      backgroundColor: "transparent",
      title: {
        text: `${bfValue}%`,
        subtext: "Gordura corporal",
        left: "center",
        top: "43%",
        textStyle: {
          fontSize: 26,
          fontWeight: "bold",
          color: themeColors.textPrimary,
        },
        subtextStyle: {
          fontSize: 13,
          color: themeColors.textSecondary,
        },
      },
      series: [
        {
          name: "BF%",
          type: "pie",
          radius: ["65%", "85%"],
          avoidLabelOverlap: false,
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          data: [
            {
              value: bfValue,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                  { offset: 0, color: "#4FACFE" },
                  { offset: 1, color: "#00F2FE" },
                ]),
                shadowBlur: 12,
                shadowColor: "rgba(0, 242, 254, 0.4)",
              },
            },
            {
              value: Math.max(0, bfMax - bfValue),
              itemStyle: {
                color: "rgba(255,255,255,0.06)",
              },
            },
          ],
        },
      ],
    };
  }, [ultimaMedida?.gordura_corporal]);

  const metaSummary = useMemo(
    () => [
      { label: "Treinos logados", value: totals.totalTreinos ?? 0, detail: "Últimos 30 dias" },
      { label: "Exercicios logados", value: totals.totalExecucoes ?? 0, detail: "Entradas em execuções" },
      { label: "Volume total", value: `${Math.round(totals.totalVolume ?? 0)} kg`, detail: "Carga x séries" },
      { label: "Repetições", value: totals.totalReps ?? 0, detail: "Estimativa a partir das execuções" },
    ],
    [totals],
  );

  const handleMeasureChange = (field, value) => {
    setMeasureForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditMeasure = (entry) => {
    setMeasureForm({
      id: entry.id,
      data: entry.data ?? new Date().toISOString().slice(0, 10),
      peso: entry.peso ?? "",
      gordura_corporal: entry.gordura_corporal ?? "",
      braco: entry.braco ?? "",
      peito: entry.peito ?? "",
      cintura: entry.cintura ?? "",
      quadril: entry.quadril ?? "",
      perna: entry.perna ?? "",
      altura: entry.altura ?? "",
      imc: entry.imc ?? "",
      massa_magra: entry.massa_magra ?? "",
      gordura_visceral: entry.gordura_visceral ?? "",
      braco_contraido: entry.braco_contraido ?? "",
      coxa_esquerda: entry.coxa_esquerda ?? "",
      coxa_direita: entry.coxa_direita ?? "",
      panturrilha_esquerda: entry.panturrilha_esquerda ?? "",
      panturrilha_direita: entry.panturrilha_direita ?? "",
      cabeca_projetada: Boolean(entry.cabeca_projetada),
      ombros_avancados: Boolean(entry.ombros_avancados),
      hipercifose: entry.hipercifose ?? "",
      anteversao_pelve: Boolean(entry.anteversao_pelve),
      joelho_valgo: Boolean(entry.joelho_valgo),
      flexao_qtd: entry.flexao_qtd ?? "",
      abdominal_qtd: entry.abdominal_qtd ?? "",
      prancha_tempo_seg: entry.prancha_tempo_seg ?? "",
      ficha_id: entry.ficha_id ?? "",
    });
  };

  const resetForm = () => {
    setMeasureForm({
      id: null,
      data: new Date().toISOString().slice(0, 10),
      peso: "",
      gordura_corporal: "",
      braco: "",
      peito: "",
      cintura: "",
      quadril: "",
      perna: "",
      altura: "",
      imc: "",
      massa_magra: "",
      gordura_visceral: "",
      braco_contraido: "",
      coxa_esquerda: "",
      coxa_direita: "",
      panturrilha_esquerda: "",
      panturrilha_direita: "",
      cabeca_projetada: false,
      ombros_avancados: false,
      hipercifose: "",
      anteversao_pelve: false,
      joelho_valgo: false,
      flexao_qtd: "",
      abdominal_qtd: "",
      prancha_tempo_seg: "",
      ficha_id: "",
    });
  };

  const handleSaveMeasure = async (event) => {
    event?.preventDefault();
    if (!user?.id) return;
    setSavingMeasure(true);
    setMeasureError(null);
    const numOrNull = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const normalized = String(value).replace(",", ".").replace(/[^0-9.\-]/g, "");
      if (normalized === "") return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };
    try {
      await upsertMeasurement({
        id: measureForm.id,
        usuarioId: user.id,
        data: measureForm.data,
        peso: numOrNull(measureForm.peso),
        gordura_corporal: numOrNull(measureForm.gordura_corporal),
        braco: numOrNull(measureForm.braco),
        peito: numOrNull(measureForm.peito),
        cintura: numOrNull(measureForm.cintura),
        quadril: numOrNull(measureForm.quadril),
        perna: numOrNull(measureForm.perna),
        altura: numOrNull(measureForm.altura),
        imc: numOrNull(measureForm.imc),
        massa_magra: numOrNull(measureForm.massa_magra),
        gordura_visceral: numOrNull(measureForm.gordura_visceral),
        braco_contraido: numOrNull(measureForm.braco_contraido),
        coxa_esquerda: numOrNull(measureForm.coxa_esquerda),
        coxa_direita: numOrNull(measureForm.coxa_direita),
        panturrilha_esquerda: numOrNull(measureForm.panturrilha_esquerda),
        panturrilha_direita: numOrNull(measureForm.panturrilha_direita),
        cabeca_projetada: measureForm.cabeca_projetada || null,
        ombros_avancados: measureForm.ombros_avancados || null,
        hipercifose: measureForm.hipercifose || null,
        anteversao_pelve: measureForm.anteversao_pelve || null,
        joelho_valgo: measureForm.joelho_valgo || null,
        flexao_qtd: numOrNull(measureForm.flexao_qtd),
        abdominal_qtd: numOrNull(measureForm.abdominal_qtd),
        prancha_tempo_seg: numOrNull(measureForm.prancha_tempo_seg),
        ficha_id: measureForm.ficha_id || null,
      });
      resetForm();
      const refreshed = await fetchEvolutionStats({ usuarioId: user.id, days: 30 });
      setStats(refreshed);
    } catch (saveErr) {
      console.error("[EvolutionPage] erro ao salvar medidas:", saveErr);
      setMeasureError(saveErr?.message ?? "Não foi possível salvar as medidas.");
    } finally {
      setSavingMeasure(false);
    }
  };

  const handleDeleteMeasure = async (id) => {
    if (!id || !user?.id) return;
    setMeasureError(null);
    try {
      await deleteMeasurement({ id, usuarioId: user.id });
      const refreshed = await fetchEvolutionStats({ usuarioId: user.id, days: 30 });
      setStats(refreshed);
      if (measureForm.id === id) {
        resetForm();
      }
    } catch (delErr) {
      console.error("[EvolutionPage] erro ao excluir medida:", delErr);
      setMeasureError(delErr?.message ?? "Não foi possível excluir.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Relatório de performance</p>
        <h1 className="mt-3 text-3xl font-semibold">Volume, séries e PRs reunidos em um painel.</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Dados calculados a partir de execuções registradas e treinos concluídos nos últimos 30 dias.
        </p>
        {error && (
          <p className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}
        {!user && (
          <p className="mt-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80">
            Entre para visualizar seu histórico de execuções.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/10" />
          ))
        ) : (
          metaSummary.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
          ))
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Peso vs início"
          value={summaryDeltas?.peso ?? "—"}
          detail={ultimaMedida?.peso != null ? `${ultimaMedida.peso} kg atual` : "Sem dados"}
          spark={sparkOptions.peso}
        />
        <StatCard
          label="Cintura vs início"
          value={summaryDeltas?.cintura ?? "—"}
          detail={ultimaMedida?.cintura != null ? `${ultimaMedida.cintura} cm atual` : "Sem dados"}
          spark={sparkOptions.cintura}
        />
        <StatCard
          label="BF% vs início"
          value={summaryDeltas?.bf ?? "—"}
          detail={ultimaMedida?.gordura_corporal != null ? `${ultimaMedida.gordura_corporal}% atual` : "Sem dados"}
          spark={sparkOptions.bf}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/10" />
          ))
        ) : medidaAtual ? (
          <>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Peso</p>
              <p className="text-2xl font-semibold text-[rgb(var(--text-primary))]">{medidaAtual.peso ?? "—"} kg</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">{medidaAtual.data}</p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Gordura corporal</p>
              <p className="text-2xl font-semibold text-[rgb(var(--text-primary))]">
                {medidaAtual.gordura_corporal ?? "—"} %
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Estimativa do último registro</p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Massa magra estimada</p>
              <p className="text-2xl font-semibold text-[rgb(var(--text-primary))]">
                {massaMagra ? `${massaMagra.toFixed(1)} kg` : "—"}
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Peso x (1 - BF%)</p>
            </div>
          </>
        ) : (
          <div className="md:col-span-3 rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
            Nenhuma medida registrada ainda.
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Top exercícios</p>
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Mais volume nos últimos 30 dias</h2>
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-48 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
            ) : (
              <VolumeTable items={topExercicios} />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">PRs recentes</p>
            <div className="mt-4">
              {loading ? (
                <div className="h-32 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
              ) : (
                <PRList items={prs} />
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Treinos concluídos</p>
            <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
              {loading ? (
                <li className="h-10 animate-pulse rounded-2xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
              ) : treinos.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-white/30 px-4 py-3 text-center dark:border-slate-800">
                  Nenhum treino registrado nos últimos 30 dias.
                </li>
              ) : (
                treinos.slice(0, 5).map((treino) => (
                  <li key={treino.id} className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div>
                      <p className="font-semibold text-[rgb(var(--text-primary))]">{treino.data}</p>
                      <p className="text-xs text-[rgb(var(--text-subtle))]">
                        {treino.duracao_minutos ? `${treino.duracao_minutos} min` : "Duração livre"}
                        {treino.calorias_queimadas ? ` · ${treino.calorias_queimadas} kcal` : ""}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))]">Treino</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <section id="medidas-form" className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Linha temporal</p>
        <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Medidas recentes</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
            ))
          ) : lineOptionsByMetric.length > 0 ? (
            lineOptionsByMetric.map((entry) => (
              <div
                key={entry.name}
                className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/70"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">{entry.name}</p>
                <ReactECharts option={entry.option} style={{ height: 240 }} />
              </div>
            ))
          ) : (
            <div className="lg:col-span-2 rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
              Cadastre medidas para visualizar a linha temporal.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Composição</p>
        <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Gordura corporal</h2>
        <div className="mt-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
          ) : bfDonutOption ? (
            <ReactECharts option={bfDonutOption} style={{ height: 280 }} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
              Cadastre BF% para visualizar.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Antes vs depois</p>
        <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Comparativo</h2>
        <div className="mt-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark-border-slate-800 dark:bg-slate-900/50" />
          ) : compareOptions ? (
            <ReactECharts option={compareOptions} style={{ height: 320 }} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
              Cadastre pelo menos duas medições para comparar.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Radar corporal</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Comparativo de medidas recentes</h2>
          </div>
        </header>
        <div className="mt-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
          ) : radarOptions ? (
            <ReactECharts key={themeId} option={radarOptions} style={{ height: 360 }} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
              Cadastre medidas para visualizar o radar.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Medidas corporais</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Últimos registros</h2>
          </div>
        </header>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={handleSaveMeasure}>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Data</span>
            <input
              type="date"
              value={measureForm.data}
              onChange={(e) => handleMeasureChange("data", e.target.value)}
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Peso (kg)</span>
            <input
              value={measureForm.peso}
              onChange={(e) => handleMeasureChange("peso", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Gordura (%)</span>
            <input
              value={measureForm.gordura_corporal}
              onChange={(e) => handleMeasureChange("gordura_corporal", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Braço (cm)</span>
            <input
              value={measureForm.braco}
              onChange={(e) => handleMeasureChange("braco", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Peito (cm)</span>
            <input
              value={measureForm.peito}
              onChange={(e) => handleMeasureChange("peito", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Cintura (cm)</span>
            <input
              value={measureForm.cintura}
              onChange={(e) => handleMeasureChange("cintura", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Quadril (cm)</span>
            <input
              value={measureForm.quadril}
              onChange={(e) => handleMeasureChange("quadril", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Perna (cm)</span>
            <input
              value={measureForm.perna}
              onChange={(e) => handleMeasureChange("perna", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Altura (cm)</span>
            <input
              value={measureForm.altura}
              onChange={(e) => handleMeasureChange("altura", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>IMC</span>
            <input
              value={measureForm.imc}
              onChange={(e) => handleMeasureChange("imc", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Massa magra (kg)</span>
            <input
              value={measureForm.massa_magra}
              onChange={(e) => handleMeasureChange("massa_magra", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Gordura visceral</span>
            <input
              value={measureForm.gordura_visceral}
              onChange={(e) => handleMeasureChange("gordura_visceral", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Braço contraído (cm)</span>
            <input
              value={measureForm.braco_contraido}
              onChange={(e) => handleMeasureChange("braco_contraido", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Coxa esquerda (cm)</span>
            <input
              value={measureForm.coxa_esquerda}
              onChange={(e) => handleMeasureChange("coxa_esquerda", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Coxa direita (cm)</span>
            <input
              value={measureForm.coxa_direita}
              onChange={(e) => handleMeasureChange("coxa_direita", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Panturrilha esquerda (cm)</span>
            <input
              value={measureForm.panturrilha_esquerda}
              onChange={(e) => handleMeasureChange("panturrilha_esquerda", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Panturrilha direita (cm)</span>
            <input
              value={measureForm.panturrilha_direita}
              onChange={(e) => handleMeasureChange("panturrilha_direita", e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))] md:col-span-3">
            <span>Hipercifose / observação postural</span>
            <textarea
              rows="2"
              value={measureForm.hipercifose}
              onChange={(e) => handleMeasureChange("hipercifose", e.target.value)}
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <div className="flex flex-wrap gap-4 md:col-span-3 text-sm text-[rgb(var(--text-secondary))]">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(measureForm.cabeca_projetada)}
                onChange={(e) => handleMeasureChange("cabeca_projetada", e.target.checked)}
                disabled={!user?.id}
              />
              <span>Cabeça projetada</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(measureForm.ombros_avancados)}
                onChange={(e) => handleMeasureChange("ombros_avancados", e.target.checked)}
                disabled={!user?.id}
              />
              <span>Ombros avançados</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(measureForm.anteversao_pelve)}
                onChange={(e) => handleMeasureChange("anteversao_pelve", e.target.checked)}
                disabled={!user?.id}
              />
              <span>Anteversão de pelve</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(measureForm.joelho_valgo)}
                onChange={(e) => handleMeasureChange("joelho_valgo", e.target.checked)}
                disabled={!user?.id}
              />
              <span>Joelho valgo</span>
            </label>
          </div>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Flexão (reps)</span>
            <input
              value={measureForm.flexao_qtd}
              onChange={(e) => handleMeasureChange("flexao_qtd", e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Abdominal (reps)</span>
            <input
              value={measureForm.abdominal_qtd}
              onChange={(e) => handleMeasureChange("abdominal_qtd", e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Prancha (seg)</span>
            <input
              value={measureForm.prancha_tempo_seg}
              onChange={(e) => handleMeasureChange("prancha_tempo_seg", e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
            />
          </label>
          <label className="space-y-1 text-sm text-[rgb(var(--text-secondary))]">
            <span>Ficha vinculada (opcional)</span>
            <input
              value={measureForm.ficha_id}
              onChange={(e) => handleMeasureChange("ficha_id", e.target.value)}
              className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={!user?.id}
              placeholder="ID da ficha"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-3">
            <button
              type="submit"
              disabled={savingMeasure || !user?.id}
              className="rounded-2xl bg-[#0f1f3c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-slate-900/30 disabled:opacity-60"
            >
              {savingMeasure ? "Salvando..." : measureForm.id ? "Atualizar medidas" : "Salvar medidas"}
            </button>
            {measureForm.id ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--text-primary))] transition hover:border-white/60 dark:text-white"
              >
                Cancelar edição
              </button>
            ) : null}
            {measureError ? <span className="text-xs text-rose-500">{measureError}</span> : null}
            {!user?.id ? (
              <span className="text-xs text-[rgb(var(--text-secondary))]">Entre para salvar medidas.</span>
            ) : null}
          </div>
        </form>
        {loading ? (
          <div className="mt-4 h-32 animate-pulse rounded-3xl border border-white/20 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
        ) : !medidaAtual ? (
          <div className="mt-4 rounded-3xl border border-dashed border-white/30 p-6 text-center text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800">
            Nenhuma medida registrada ainda.
          </div>
        ) : null}

        {medidas.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/20 bg-white/60 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
            <table className="min-w-full text-sm">
              <thead className="bg-white/80 text-left text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-secondary))] dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">BF%</th>
                  <th className="px-4 py-3">Braço</th>
                  <th className="px-4 py-3">Peito</th>
                  <th className="px-4 py-3">Cintura</th>
                  <th className="px-4 py-3">Quadril</th>
                  <th className="px-4 py-3">Perna</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {medidas.map((m) => (
                  <tr key={m.id} className="border-t border-white/30 text-[rgb(var(--text-primary))] dark:border-slate-800">
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))]">{m.data}</td>
                    <td className="px-4 py-3">{m.peso ?? "—"} kg</td>
                    <td className="px-4 py-3">{m.gordura_corporal ?? "—"}%</td>
                    <td className="px-4 py-3">{m.braco ?? "—"} cm</td>
                    <td className="px-4 py-3">{m.peito ?? "—"} cm</td>
                    <td className="px-4 py-3">{m.cintura ?? "—"} cm</td>
                    <td className="px-4 py-3">{m.quadril ?? "—"} cm</td>
                    <td className="px-4 py-3">{m.perna ?? "—"} cm</td>
                    <td className="px-4 py-3 text-right text-xs text-[rgb(var(--text-secondary))]">
                      {user?.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditMeasure(m)}
                            className="rounded-full border border-white/30 px-3 py-1 font-semibold uppercase tracking-[0.2em] transition hover:border-white/60"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeasure(m.id)}
                            className="rounded-full border border-rose-300 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-rose-500 transition hover:border-rose-400"
                          >
                            Excluir
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
