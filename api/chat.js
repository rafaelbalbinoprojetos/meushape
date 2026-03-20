/* eslint-env node */
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

const EXERCISE_BLOCK_START = "<<<EXERCICIOS_JSON>>>";
const EXERCISE_BLOCK_END = "<<<FIM_EXERCICIOS_JSON>>>";
const FICHA_BLOCK_START = "<<<FICHA_JSON>>>";
const FICHA_BLOCK_END = "<<<FIM_FICHA_JSON>>>";
const ALLOWED_GROUPS = [
  "peito",
  "costas",
  "ombros",
  "pernas",
  "gluteos",
  "biceps",
  "triceps",
  "abdomen",
  "cardio",
  "fullbody",
];
const ALLOWED_EXECUTION = ["livre", "maquina", "smith", "polia", "peso_corporal", "outro"];
const ALLOWED_LEVELS = ["basico", "intermediario", "avancado", "pro"];
const ALLOWED_RISK = ["baixo", "moderado", "alto"];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FITNESS_KEYWORDS = [
  "treino",
  "ficha",
  "exercício",
  "exercicio",
  "exercícios",
  "exercicios",
  "musculação",
  "musculacao",
  "alongamento",
  "cardio",
  "circuito",
  "supino",
  "agachamento",
  "remada",
  "bíceps",
  "biceps",
  "tríceps",
  "triceps",
];

function isFitnessRelated(text = "") {
  const normalized = text.toLowerCase();
  return FITNESS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

// Prioriza variáveis específicas de backend; se ausentes, tenta VITE_* para compatibilidade com deploys existentes.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY; // fallback (menos privilegiado, pode falhar com RLS)
const usingAnonFallback =
  !process.env.SUPABASE_SERVICE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.VITE_SUPABASE_SERVICE_KEY &&
  !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY &&
  supabaseServiceKey === process.env.VITE_SUPABASE_ANON_KEY;
const supabaseAvailable = Boolean(supabaseUrl && supabaseServiceKey);

const supabase =
  supabaseAvailable
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

function parseBody(request) {
  if (!request?.body) return {};
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body ?? {};
}

function normalizeEnum(value, allowed) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : null;
}

function parseFirstNumber(text) {
  if (!text) return null;
  const match = String(text).match(/\d+/);
  if (!match) return null;
  const value = Number.parseInt(match[0], 10);
  return Number.isFinite(value) ? value : null;
}

function sumBy(list, getter) {
  return (list || []).reduce((sum, item) => sum + (Number(getter(item)) || 0), 0);
}

function toISODate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(periodoInicio, periodoFim) {
  const end = toISODate(periodoFim) || new Date().toISOString().slice(0, 10);
  const endDate = new Date(`${end}T00:00:00`);
  let start = toISODate(periodoInicio);
  if (!start) {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    start = startDate.toISOString().slice(0, 10);
  }
  return { start, end };
}

function buildExerciseSummary(execucoes = []) {
  const map = new Map();
  execucoes.forEach((exec) => {
    const carga = Number(exec.carga_executada) || 0;
    const series = Number(exec.series_executadas) || 0;
    const reps = parseFirstNumber(exec.repeticoes_executadas) || 0;
    const volume = carga * series;
    const key = exec.exercicio_id || exec.exercicio?.nome || "unknown";
    const existing = map.get(key) || {
      volume: 0,
      series: 0,
      reps: 0,
      exercicio: exec.exercicio ?? null,
    };
    existing.volume += volume;
    existing.series += series;
    existing.reps += reps * series;
    map.set(key, existing);
  });
  return Array.from(map.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map((item) => ({
      nome: item.exercicio?.nome ?? "Exercicio",
      volume: Math.round(item.volume),
      series: item.series,
      reps: item.reps,
      grupo: item.exercicio?.grupo ?? null,
    }));
}

function buildMeasureSnapshot(medidas = []) {
  if (!medidas.length) {
    return { inicio: null, fim: null, deltas: {} };
  }

  const normalized = medidas
    .map((item) => {
      const dateKey = item?.data
        ? String(item.data).slice(0, 10)
        : item?.criado_em
          ? new Date(item.criado_em).toISOString().slice(0, 10)
          : null;
      return { ...item, __dateKey: dateKey };
    })
    .filter((item) => item.__dateKey)
    .sort((a, b) => new Date(a.__dateKey).getTime() - new Date(b.__dateKey).getTime());

  if (!normalized.length) {
    return { inicio: null, fim: null, deltas: {} };
  }

  const earliest = normalized[0];
  const latest = normalized[normalized.length - 1];
  const fields = ["peso", "braco", "peito", "cintura", "quadril", "perna", "gordura_corporal", "massa_magra"];
  const deltas = fields.reduce((acc, field) => {
    const startVal = Number(earliest?.[field]);
    const endVal = Number(latest?.[field]);
    if (Number.isFinite(startVal) && Number.isFinite(endVal)) {
      acc[field] = Number((endVal - startVal).toFixed(2));
    }
    return acc;
  }, {});
  const serie = normalized.slice(-6).map((item) => ({
    data: item.__dateKey,
    peso: item.peso ?? null,
    gordura_corporal: item.gordura_corporal ?? null,
    massa_magra: item.massa_magra ?? null,
  }));

  return {
    inicio: fields.reduce((acc, field) => ({ ...acc, [field]: earliest?.[field] ?? null }), {}),
    fim: fields.reduce((acc, field) => ({ ...acc, [field]: latest?.[field] ?? null }), {}),
    inicio_data: earliest?.__dateKey ?? null,
    fim_data: latest?.__dateKey ?? null,
    deltas,
    serie,
  };
}

function buildMealsSummary(refeicoes = []) {
  const days = new Set(refeicoes.map((meal) => meal.data).filter(Boolean));
  const totalCalorias = sumBy(refeicoes, (meal) => meal.total_calorias);
  const totalProteina = sumBy(refeicoes, (meal) => meal.total_proteina);
  const totalCarbo = sumBy(refeicoes, (meal) => meal.total_carboidratos);
  const totalGordura = sumBy(refeicoes, (meal) => meal.total_gorduras);
  const dias = days.size;
  return {
    dias_registrados: dias,
    calorias_total: Math.round(totalCalorias),
    calorias_media: dias > 0 ? Math.round(totalCalorias / dias) : 0,
    proteina_total: Math.round(totalProteina),
    carbo_total: Math.round(totalCarbo),
    gordura_total: Math.round(totalGordura),
  };
}

async function handleInsights({ usuarioId, periodoInicio, periodoFim } = {}, response) {
  if (!usuarioId) {
    response.status(400).json({ error: "usuarioId e obrigatorio." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({ error: "OPENAI_API_KEY nao configurada." });
    return;
  }

  if (!supabase) {
    response.status(500).json({ error: "Supabase indisponivel." });
    return;
  }

  const insightGate = await ensureUsageAllowed({
    supabase,
    userId: usuarioId,
    key: "insights",
    limit: AI_LIMITS_PRO.insights,
  });
  if (!insightGate.ok) {
    response.status(insightGate.status).json({ error: insightGate.message });
    return;
  }

  const { start, end } = resolveDateRange(periodoInicio, periodoFim);

  try {
    const { data: treinos, error: treinosError } = await supabase
      .from("treinos_concluidos")
      .select("id, data, duracao_minutos, calorias_queimadas, ficha_id")
      .eq("usuario_id", usuarioId)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false });
    if (treinosError) throw treinosError;

    const treinoIds = (treinos ?? []).map((item) => item.id).filter(Boolean);
    let execucoes = [];
    if (treinoIds.length > 0) {
      const { data: execData, error: execError } = await supabase
        .from("execucoes")
        .select(
          `
          id,
          treino_id,
          exercicio_id,
          series_executadas,
          repeticoes_executadas,
          carga_executada,
          criado_em,
          exercicio:exercicio_id (nome, grupo)
        `,
        )
        .in("treino_id", treinoIds)
        .order("criado_em", { ascending: false });
      if (execError) throw execError;
      execucoes = execData ?? [];
    }

    const startTimestamp = `${start}T00:00:00`;
    const endTimestamp = `${end}T23:59:59`;
    let medidasFallback = false;
    let medidasBaseForaPeriodo = false;
    let { data: medidas, error: medidasError } = await supabase
      .from("evolucao")
      .select("data, criado_em, peso, braco, peito, cintura, quadril, perna, gordura_corporal, massa_magra")
      .eq("usuario_id", usuarioId)
      .or(
        `and(data.gte.${start},data.lte.${end}),and(criado_em.gte.${startTimestamp},criado_em.lte.${endTimestamp})`,
      );
    if (medidasError) throw medidasError;
    if (!medidas || medidas.length === 0) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("evolucao")
        .select("data, criado_em, peso, braco, peito, cintura, quadril, perna, gordura_corporal, massa_magra")
        .eq("usuario_id", usuarioId)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false })
        .limit(2);
      if (fallbackError) throw fallbackError;
      if (fallback && fallback.length > 0) {
        medidasFallback = true;
        medidas = fallback;
      }
    }
    if (medidas && medidas.length === 1) {
      const base = medidas[0];
      const cutoffDate = base?.data ? String(base.data).slice(0, 10) : null;
      const cutoffTimestamp = base?.criado_em ? new Date(base.criado_em).toISOString() : null;
      const filters = [];
      if (cutoffDate) filters.push(`data.lt.${cutoffDate}`);
      if (cutoffTimestamp) filters.push(`criado_em.lt.${cutoffTimestamp}`);
      if (filters.length > 0) {
        const { data: previous, error: previousError } = await supabase
          .from("evolucao")
          .select("data, criado_em, peso, braco, peito, cintura, quadril, perna, gordura_corporal, massa_magra")
          .eq("usuario_id", usuarioId)
          .or(filters.join(","))
          .order("data", { ascending: false })
          .order("criado_em", { ascending: false })
          .limit(1);
        if (previousError) throw previousError;
        if (previous && previous.length > 0) {
          medidas = [...previous, ...medidas];
          medidasBaseForaPeriodo = true;
        }
      }
    }

    const { data: refeicoes, error: refeicoesError } = await supabase
      .from("refeicoes_consumidas")
      .select("data, total_calorias, total_proteina, total_carboidratos, total_gorduras")
      .eq("usuario_id", usuarioId)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false });
    if (refeicoesError) throw refeicoesError;

    const { data: prs, error: prsError } = await supabase
      .from("personal_records")
      .select("id, data, carga, repeticoes, exercicio:exercicio_id (nome)")
      .eq("usuario_id", usuarioId)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false })
      .limit(8);
    if (prsError) throw prsError;

    const treinoDays = new Set((treinos ?? []).map((item) => item.data).filter(Boolean));
    const totalTreinos = treinos?.length ?? 0;
    const totalExecucoes = execucoes.length;
    const totalSeries = sumBy(execucoes, (exec) => exec.series_executadas);
    const totalVolume = execucoes.reduce((sum, exec) => {
      const carga = Number(exec.carga_executada) || 0;
      const series = Number(exec.series_executadas) || 0;
      return sum + carga * series;
    }, 0);
    const totalReps = execucoes.reduce((sum, exec) => {
      const reps = parseFirstNumber(exec.repeticoes_executadas) || 0;
      const series = Number(exec.series_executadas) || 0;
      return sum + reps * series;
    }, 0);
    const totalCaloriasQueimadas = sumBy(treinos, (treino) => treino.calorias_queimadas);
    const totalDuracao = sumBy(treinos, (treino) => treino.duracao_minutos);
    const duracaoMedia = totalTreinos > 0 ? Math.round(totalDuracao / totalTreinos) : 0;

    const topExercicios = buildExerciseSummary(execucoes);
    const execucoesRecentes = execucoes.slice(0, 8).map((exec) => ({
      data: exec?.criado_em ? new Date(exec.criado_em).toISOString().slice(0, 10) : null,
      exercicio: exec?.exercicio?.nome ?? "Exercicio",
      carga: exec?.carga_executada ?? null,
      series: exec?.series_executadas ?? null,
      repeticoes: exec?.repeticoes_executadas ?? null,
    }));
    const execucoesByExercicio = new Map();
    execucoes.forEach((exec) => {
      const key = exec.exercicio_id || exec.exercicio?.nome || "unknown";
      const existing = execucoesByExercicio.get(key) || {
        exercicio: exec.exercicio ?? null,
        registros: [],
      };
      existing.registros.push(exec);
      execucoesByExercicio.set(key, existing);
    });
    const topExecucoesDetalhes = Array.from(execucoesByExercicio.values())
      .map((bucket) => {
        const registros = bucket.registros.sort(
          (a, b) => new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime(),
        );
        const totalSeries = sumBy(registros, (item) => item.series_executadas);
        const totalReps = registros.reduce((sum, item) => {
          const reps = parseFirstNumber(item.repeticoes_executadas) || 0;
          return sum + reps * (Number(item.series_executadas) || 0);
        }, 0);
        const totalCarga = registros.reduce((sum, item) => sum + (Number(item.carga_executada) || 0), 0);
        const avgCarga = registros.length > 0 ? Number((totalCarga / registros.length).toFixed(1)) : null;
        const maxCarga = registros.reduce(
          (max, item) => Math.max(max, Number(item.carga_executada) || 0),
          0,
        );
        const primeiro = registros[0];
        const ultimo = registros[registros.length - 1];
        return {
          exercicio: bucket.exercicio?.nome ?? "Exercicio",
          grupo: bucket.exercicio?.grupo ?? null,
          registros: registros.length,
          total_series: totalSeries,
          total_reps: totalReps,
          carga_media: avgCarga,
          carga_max: maxCarga || null,
          inicio: {
            data: primeiro?.criado_em ? new Date(primeiro.criado_em).toISOString().slice(0, 10) : null,
            carga: primeiro?.carga_executada ?? null,
            repeticoes: primeiro?.repeticoes_executadas ?? null,
          },
          fim: {
            data: ultimo?.criado_em ? new Date(ultimo.criado_em).toISOString().slice(0, 10) : null,
            carga: ultimo?.carga_executada ?? null,
            repeticoes: ultimo?.repeticoes_executadas ?? null,
          },
        };
      })
      .sort((a, b) => (b.total_series || 0) - (a.total_series || 0))
      .slice(0, 5);
    const measuresSnapshot = buildMeasureSnapshot(medidas ?? []);
    const mealsSummary = buildMealsSummary(refeicoes ?? []);

    const insightContext = {
      periodo_inicio: start,
      periodo_fim: end,
      treinos: {
        total: totalTreinos,
        dias_ativos: treinoDays.size,
        duracao_media_min: duracaoMedia,
        calorias_total: Math.round(totalCaloriasQueimadas),
      },
      execucoes: {
        total: totalExecucoes,
        series_total: totalSeries,
        reps_total: totalReps,
        volume_total: Math.round(totalVolume),
        top_exercicios: topExercicios,
        top_exercicios_detalhes: topExecucoesDetalhes,
        recentes: execucoesRecentes,
      },
      medidas: measuresSnapshot,
      medidas_fora_periodo: medidasFallback,
      medidas_base_fora_periodo: medidasBaseForaPeriodo,
      alimentacao: mealsSummary,
      prs: (prs ?? []).map((item) => ({
        nome: item?.exercicio?.nome ?? "Exercicio",
        carga: item?.carga ?? null,
        repeticoes: item?.repeticoes ?? null,
        data: item?.data ?? null,
      })),
    };

    const prompt = [
      "Voce e o analista de performance do app MEU SHAPE.",
      "Crie um insight profissional e direto, em portugues, com 4 a 6 blocos curtos.",
      "Use titulos em CAIXA ALTA (ex: RESUMO GERAL) e frases curtas.",
      "Inclua um bloco com os exercicios mais executados (carga, series e reps) e outro com a evolucao de carga (inicio vs fim) se houver dados.",
      "Se houver execucoes recentes, destaque 2 a 3 exemplos reais com carga/series/reps.",
      "Inclua uma frase de MICRO INSIGHT no formato 'MICRO INSIGHT: ...', destacando um padrao real dos dados.",
      "Se algum eixo nao tiver dados, diga isso em uma unica frase.",
      "Evite promessas medicas. Seja pratico, motivador e claro.",
      "Nao invente dados; use apenas o JSON informado.",
    ].join(" ");

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
      temperature: 0.4,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Dados JSON:\n${JSON.stringify(insightContext)}` },
      ],
    });

    const respostaIa =
      completion.choices?.[0]?.message?.content?.trim() || "Nao foi possivel gerar o insight agora.";

    const insertPayload = {
      usuario_id: usuarioId,
      mensagem_usuario: `Insight ${start} a ${end}`,
      resposta_ia: respostaIa,
      metadata: insightContext,
      tipo: "insight_evolucao",
      periodo_inicio: start,
      periodo_fim: end,
      versao_modelo: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
      score_confianca: null,
      fonte_dados: {
        treinos: totalTreinos,
        execucoes: totalExecucoes,
        medidas: medidas?.length ?? 0,
        refeicoes: refeicoes?.length ?? 0,
        prs: prs?.length ?? 0,
      },
    };

    const { data: inserted, error: insertError } = await supabase
      .from("ai_logs")
      .insert(insertPayload)
      .select()
      .single();
    if (insertError) throw insertError;

    await incrementUsage({
      supabase,
      userId: usuarioId,
      key: "insights",
      monthKey: insightGate.monthKey,
    });

    response.status(200).json({ insight: inserted });
  } catch (error) {
    console.error("[insights] erro ao gerar insight:", error);
    const status = error?.status || error?.response?.status || 500;
    response.status(status).json({
      error: error?.message || "Falha ao gerar insight.",
      details: error?.response?.data || null,
      status,
    });
  }
}

function extractExercisesFromReply(text = "") {
  const start = text.indexOf(EXERCISE_BLOCK_START);
  const end = text.indexOf(EXERCISE_BLOCK_END);
  if (start === -1 || end === -1 || end <= start) {
    return { cleanedText: text, exercises: [] };
  }
  const jsonSlice = text.slice(start + EXERCISE_BLOCK_START.length, end).trim();
  let exercises = [];
  try {
    const parsed = JSON.parse(jsonSlice);
    if (Array.isArray(parsed)) {
      exercises = parsed;
    }
  } catch (error) {
    console.error("[chat] bloco de exercicios JSON invalido:", error);
  }
  const cleanedText = `${text.slice(0, start)}${text.slice(end + EXERCISE_BLOCK_END.length)}`.trim();
  return { cleanedText: cleanedText || text, exercises };
}

function extractFichaFromReply(text = "") {
  const start = text.indexOf(FICHA_BLOCK_START);
  const end = text.indexOf(FICHA_BLOCK_END);
  if (start === -1 || end === -1 || end <= start) {
    return { cleanedText: text, ficha: null };
  }
  const jsonSlice = text.slice(start + FICHA_BLOCK_START.length, end).trim();
  let ficha = null;
  try {
    const parsed = JSON.parse(jsonSlice);
    if (parsed && typeof parsed === "object") {
      ficha = parsed;
    }
  } catch (error) {
    console.error("[chat] bloco de ficha JSON invalido:", error);
  }
  const cleanedText = `${text.slice(0, start)}${text.slice(end + FICHA_BLOCK_END.length)}`.trim();
  return { cleanedText: cleanedText || text, ficha };
}

async function upsertExercises(candidates = []) {
  if (!supabase) {
    console.error("[chat] Supabase client indisponivel (verifique SUPABASE_URL e SUPABASE_SERVICE_KEY).");
    return { created: [], skipped: [], errors: [] };
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { created: [], skipped: [], errors: [] };
  }

  const created = [];
  const skipped = [];
  const errors = [];

  for (const raw of candidates) {
    const nome = typeof raw?.nome === "string" ? raw.nome.trim() : "";
    const grupo = normalizeEnum(raw?.grupo, ALLOWED_GROUPS);
    if (!nome || !grupo) {
      skipped.push({ reason: "faltam campos obrigatorios", nome: nome || raw?.nome || "?" });
      continue;
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from("exercicios")
        .select("id, nome")
        .ilike("nome", nome)
        .limit(1)
        .maybeSingle();
      if (existingError) {
        throw existingError;
      }
      if (existing) {
        skipped.push({ reason: "ja existe", nome, id: existing.id });
        continue;
      }

      const payload = {
        nome,
        grupo,
        descricao: typeof raw?.descricao === "string" ? raw.descricao.trim() : null,
        equipamento: typeof raw?.equipamento === "string" ? raw.equipamento.trim() : null,
        video_url: typeof raw?.video_url === "string" ? raw.video_url.trim() : null,
        imagem_url: typeof raw?.imagem_url === "string" ? raw.imagem_url.trim() : null,
        execucao: typeof raw?.execucao === "string" ? raw.execucao.trim() : null,
        tipo_execucao: normalizeEnum(raw?.tipo_execucao, ALLOWED_EXECUTION),
        nivel: normalizeEnum(raw?.nivel, ALLOWED_LEVELS),
        risco: normalizeEnum(raw?.risco, ALLOWED_RISK),
      };

      const { data, error } = await supabase.from("exercicios").insert(payload).select("id, nome, grupo").single();
      if (error) {
        throw error;
      }
      created.push(data);
    } catch (error) {
      console.error("[chat] falhou ao criar exercicio sugerido:", error);
      errors.push({ reason: error?.message ?? "erro inesperado", nome: nome || raw?.nome || "?" });
    }
  }

  return { created, skipped, errors };
}

async function inferExercisesFromText(rawText = "") {
  const trimmed = rawText.trim();
  if (!trimmed) return [];
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extraia todos os exercícios mencionados na mensagem do usuário e devolva apenas um JSON array. " +
            "Campos: nome, grupo, descricao, equipamento, tipo_execucao, nivel, risco, execucao. " +
            "Use somente estes valores permitidos: " +
            "grupo: peito, costas, ombros, pernas, gluteos, biceps, triceps, abdomen, cardio, fullbody | " +
            "tipo_execucao: livre, maquina, smith, polia, peso_corporal, outro | " +
            "nivel: basico, intermediario, avancado, pro | " +
            "risco: baixo, moderado, alto. " +
            "Se algum campo não puder ser inferido, deixe null. Não inclua texto extra além do JSON.",
        },
        { role: "user", content: trimmed },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[chat] falha ao inferir exercicios a partir do texto:", error);
    return [];
  }
}

async function inferFichaFromText(rawText = "") {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extraia uma ficha de treino em formato JSON. " +
            "Estrutura: { nome, descricao, nivel, objetivo, visibilidade, thumbnail_url, capa_url, treinos: [ { nome, descricao, subdivisao, ordem, exercicios: [ { nome, series, repeticoes, carga, descanso_segundos, observacoes, grupo, tipo_execucao, nivel, risco, execucao, equipamento } ] } ] }. " +
            "Use subdivisao como A, B, C... se não vier. Use apenas os enums válidos de exercícios (grupo, tipo_execucao, nivel, risco) conforme especificado anteriormente. " +
            "Preencha visibilidade como 'privada' se não especificado. Não inclua texto extra além do JSON.",
        },
        { role: "user", content: trimmed },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("[chat] falha ao inferir ficha a partir do texto:", error);
    return null;
  }
}

async function ensureExerciseId(exercise = {}) {
  if (!supabase) return null;
  const nome = typeof exercise?.nome === "string" ? exercise.nome.trim() : "";
  if (!nome) return null;

  try {
    const { data: existing, error: existingError } = await supabase
      .from("exercicios")
      .select("id, nome")
      .ilike("nome", nome)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) return existing.id;

    const payload = {
      nome,
      grupo: normalizeEnum(exercise?.grupo, ALLOWED_GROUPS) ?? "fullbody",
      descricao: typeof exercise?.descricao === "string" ? exercise.descricao.trim() : null,
      equipamento: typeof exercise?.equipamento === "string" ? exercise.equipamento.trim() : null,
      video_url: typeof exercise?.video_url === "string" ? exercise.video_url.trim() : null,
      imagem_url: typeof exercise?.imagem_url === "string" ? exercise.imagem_url.trim() : null,
      execucao: typeof exercise?.execucao === "string" ? exercise.execucao.trim() : null,
      tipo_execucao: normalizeEnum(exercise?.tipo_execucao, ALLOWED_EXECUTION) ?? "livre",
      nivel: normalizeEnum(exercise?.nivel, ALLOWED_LEVELS),
      risco: normalizeEnum(exercise?.risco, ALLOWED_RISK),
    };

    const { data: created, error: insertError } = await supabase.from("exercicios").insert(payload).select("id").single();
    if (insertError) throw insertError;
    return created?.id ?? null;
  } catch (error) {
    console.error("[chat] ensureExerciseId error:", error);
    return null;
  }
}

async function createFichaFromData(fichaData = {}, userId) {
  if (!supabase) return { error: "Supabase indisponível" };
  if (!userId) return { error: "Usuário não autenticado" };

  try {
    const fichaPayload = {
      usuario_id: userId,
      nome: (fichaData.nome ?? "").trim() || "Ficha personalizada",
      descricao: typeof fichaData.descricao === "string" ? fichaData.descricao.trim() : null,
      nivel: typeof fichaData.nivel === "string" ? fichaData.nivel.trim() : null,
      objetivo: typeof fichaData.objetivo === "string" ? fichaData.objetivo.trim() : null,
      thumbnail_url: typeof fichaData.thumbnail_url === "string" ? fichaData.thumbnail_url.trim() : null,
      capa_url: typeof fichaData.capa_url === "string" ? fichaData.capa_url.trim() : null,
      visibilidade: fichaData.visibilidade ?? "privada",
    };

    const { data: fichaRow, error: fichaError } = await supabase
      .from("fichas")
      .insert(fichaPayload)
      .select("id")
      .single();
    if (fichaError) throw fichaError;

    const treinosInput = Array.isArray(fichaData.treinos) ? fichaData.treinos : [];
    const subdivisionAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const treinoRows = treinosInput.map((treino, index) => {
      const subdivision =
        (typeof treino?.subdivisao === "string" && treino.subdivisao.trim()) || subdivisionAlphabet[index % subdivisionAlphabet.length] || "A";
      return {
        ficha_id: fichaRow.id,
        nome: (treino?.nome ?? `Treino ${subdivision}`).trim(),
        descricao: typeof treino?.descricao === "string" ? treino.descricao.trim() : null,
        subdivisao: subdivision,
        ordem: Number.isFinite(treino?.ordem) ? treino.ordem : index + 1,
      };
    });

    let treinosData = [];
    if (treinoRows.length > 0) {
      const { data: treinosInserted, error: treinosError } = await supabase
        .from("ficha_treinos")
        .insert(treinoRows)
        .select("id, ordem");
      if (treinosError) throw treinosError;
      treinosData = treinosInserted ?? [];
    }

    // Monta mapa de nome -> exercicio_id
    const exerciseNameMap = new Map();
    for (const treino of treinosInput) {
      if (!Array.isArray(treino?.exercicios)) continue;
      for (const ex of treino.exercicios) {
        const nome = typeof ex?.nome === "string" ? ex.nome.trim() : "";
        if (nome && !exerciseNameMap.has(nome.toLowerCase())) {
          const id = await ensureExerciseId(ex);
          if (id) {
            exerciseNameMap.set(nome.toLowerCase(), id);
          }
        }
      }
    }

    const fichaExercisesRows = [];
    treinosInput.forEach((treino, index) => {
      const treinoRecord = treinosData[index];
      if (!treinoRecord?.id || !Array.isArray(treino?.exercicios)) {
        return;
      }
      treino.exercicios.forEach((exercicio, exIndex) => {
        const nome = typeof exercicio?.nome === "string" ? exercicio.nome.trim() : "";
        const exercicioId = nome ? exerciseNameMap.get(nome.toLowerCase()) : null;
        if (!exercicioId) {
          return;
        }
        const series = Number.parseInt(exercicio?.series, 10);
        const descanso = Number.parseInt(exercicio?.descanso_segundos, 10);
        const cargaParsed =
          typeof exercicio?.carga === "number"
            ? exercicio.carga
            : typeof exercicio?.carga === "string"
              ? Number.parseFloat(exercicio.carga.replace(",", "."))
              : null;
        fichaExercisesRows.push({
          treino_id: treinoRecord.id,
          exercicio_id: exercicioId,
          series: Number.isFinite(series) ? series : 3,
          repeticoes:
            typeof exercicio?.repeticoes === "string"
              ? exercicio.repeticoes.trim()
              : exercicio?.repeticoes != null
                ? String(exercicio.repeticoes).trim()
                : "10-12",
          carga: Number.isFinite(cargaParsed) ? cargaParsed : null,
          descanso_segundos: Number.isFinite(descanso) ? descanso : 60,
          ordem: Number.isFinite(exercicio?.ordem) ? exercicio.ordem : exIndex + 1,
          observacoes: typeof exercicio?.observacoes === "string" ? exercicio.observacoes.trim() : null,
          tecnica: typeof exercicio?.tecnica === "string" ? exercicio.tecnica.trim() : null,
          tempo_segundos: Number.isFinite(exercicio?.tempo_segundos) ? exercicio.tempo_segundos : null,
          cadencia: typeof exercicio?.cadencia === "string" ? exercicio.cadencia.trim() : null,
        });
      });
    });

    let fichaExercisesCreated = [];
    if (fichaExercisesRows.length > 0) {
      const { data: fichaEx, error: fichaExError } = await supabase
        .from("ficha_exercicios")
        .insert(fichaExercisesRows)
        .select("id");
      if (fichaExError) throw fichaExError;
      fichaExercisesCreated = fichaEx ?? [];
    }

    return {
      fichaId: fichaRow.id,
      treinosCount: treinosData.length,
      exerciciosCount: fichaExercisesCreated.length,
    };
  } catch (error) {
    console.error("[chat] createFichaFromData error:", error);
    return { error: error?.message ?? "Erro ao criar ficha" };
  }
}

async function fetchFitnessSnapshot() {
  if (!supabase) {
    return null;
  }

  try {
    const [{ data: workouts }, { data: exercises }, { data: mealPlans }, { data: evolutions }] = await Promise.all([
      supabase
        .from("treinos")
        .select("id, nome, objetivo, nível, destaque")
        .order("atualizado_em", {
          ascending: false,
        })
        .limit(6),
      supabase.from("exercicios").select("id, nome, grupo_muscular").order("atualizado_em", { ascending: false }).limit(6),
      supabase.from("planos_alimentares").select("id, titulo, calorias").order("criado_em", { ascending: false }).limit(4),
      supabase
        .from("evolucoes")
        .select("id, peso, created_at")
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    return {
      workouts: workouts ?? [],
      exercises: exercises ?? [],
      mealPlans: mealPlans ?? [],
      evolutions: evolutions ?? [],
    };
  } catch (error) {
    console.error("[chat] Falha ao consultar snapshot fitness:", error);
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  const body = parseBody(request);
  const url = new URL(request.url, "http://localhost");
  const action = url.searchParams.get("action") || body?.action;
  if (action === "insights") {
    await handleInsights(body, response);
    return;
  }

  const { messages = [], systemPrompt, userId } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: "Envie ao menos uma mensagem." });
    return;
  }
  if (!userId) {
    response.status(400).json({ error: "userId é obrigatório para usar o Coach IA." });
    return;
  }

  try {
    const chatGate = await ensureUsageAllowed({
      supabase,
      userId,
      key: "chat_msgs",
      limit: AI_LIMITS_PRO.chat_msgs,
    });
    if (!chatGate.ok) {
      response.status(chatGate.status).json({ error: chatGate.message });
      return;
    }

    const snapshot = await fetchFitnessSnapshot();
    const snapshotSummary = snapshot
      ? `Contexto do app:\n- Treinos ativos: ${snapshot.workouts
          .slice(0, 5)
          .map((workout) => `"${workout.nome}"`)
          .join(", ") || "sem registros"}\n- Exercícios cadastrados: ${snapshot.exercises.length}\n- Planos alimentares: ${
          snapshot.mealPlans.length
        }\n- Registros de evolução: ${snapshot.evolutions.length}`
      : "Contexto indisponível";

    const chatMessages = [
      {
        role: "system",
        content:
          systemPrompt ??
          "Você é o Coach Virtual do MEU SHAPE. Sugira treinos, ajustes de carga, planos alimentares e análises de evolução.",
      },
      {
        role: "system",
        content: snapshotSummary,
      },
      ...messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? "",
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
      messages: chatMessages,
      temperature: 0.4,
    });

    const rawReply = completion.choices[0]?.message?.content?.trim() ?? "Não consegui formular uma resposta agora.";
    let { cleanedText, exercises } = extractExercisesFromReply(rawReply);
    const fichaResult = extractFichaFromReply(cleanedText);
    cleanedText = fichaResult.cleanedText;
    let ficha = fichaResult.ficha;

    const shouldInferFitness = isFitnessRelated(rawReply);

    if (!exercises.length && shouldInferFitness) {
      console.warn("[chat] Nenhum bloco de exercicios encontrado na resposta do modelo. Tentando inferir do texto.");
      exercises = await inferExercisesFromText(rawReply);
    }
    if (!ficha && shouldInferFitness) {
      ficha = await inferFichaFromText(rawReply);
    }

    const hasStructuredData = (Array.isArray(exercises) && exercises.length > 0) || Boolean(ficha);
    if (!hasStructuredData) {
      await incrementUsage({
        supabase,
        userId,
        key: "chat_msgs",
        monthKey: chatGate.monthKey,
      });
      response.status(200).json({ reply: cleanedText });
      return;
    }

    let finalReply = cleanedText;
    const summaryParts = [];

    const exercisesSummary = [];
    if (Array.isArray(exercises) && exercises.length > 0 && supabaseAvailable) {
      const { created, skipped, errors } = await upsertExercises(exercises);
      const createdNames = created.map((item) => item?.nome).filter(Boolean);
      const skippedNames = skipped.map((item) => item?.nome).filter(Boolean);
      const errorNames = errors.map((item) => (item?.nome ? `${item.nome} (${item.reason})` : item?.reason)).filter(Boolean);
      if (createdNames.length > 0) {
        exercisesSummary.push(`Exercícios adicionados: ${createdNames.join(", ")}`);
      }
      if (skippedNames.length > 0) {
        exercisesSummary.push(`Já existiam: ${skippedNames.slice(0, 5).join(", ")}`);
      }
      if (errorNames.length > 0) {
        exercisesSummary.push(`Falhas ao salvar exercícios: ${errorNames.slice(0, 5).join(", ")}`);
      }
    } else if (supabaseAvailable) {
      exercisesSummary.push("Não consegui extrair os exercícios. Responda novamente para registrar.");
    } else {
      exercisesSummary.push("Exercícios extraídos mas não salvos por falta de SERVICE KEY.");
    }

    let fichaSummary = "";
    if (ficha && supabaseAvailable && userId) {
      const fichaGate = await ensureUsageAllowed({
        supabase,
        userId,
        key: "fichas_geradas",
        limit: AI_LIMITS_PRO.fichas_geradas,
      });
      if (!fichaGate.ok) {
        fichaSummary = "Limite mensal de fichas inteligentes atingido. Gere novas fichas no próximo ciclo.";
      } else {
        const result = await createFichaFromData(ficha, userId);
        if (result?.fichaId) {
          fichaSummary = `Ficha criada com ${result.treinosCount} treino(s) e ${result.exerciciosCount} exercício(s) vinculados.`;
          await incrementUsage({
            supabase,
            userId,
            key: "fichas_geradas",
            monthKey: fichaGate.monthKey,
          });
        } else if (result?.error) {
          fichaSummary = `Não foi possível criar a ficha: ${result.error}`;
        }
      }
    } else if (ficha && !userId) {
      fichaSummary = "Ficha identificada, mas é necessário estar logado para salvar.";
    }

    const customSummary =
      "Para assegurar a melhor experiência, os exercícios que não constavam no sistema foram adicionados conforme sua ficha, deixando o treino completo e perfeitamente ajustado.";
    summaryParts.push(customSummary);
    if (exercisesSummary.length > 0) {
      summaryParts.push(exercisesSummary.join(" | "));
    }
    if (fichaSummary) {
      summaryParts.push(fichaSummary);
    }

    finalReply = `${cleanedText}\n\n[Cadastro automático] ${summaryParts.join(" | ")}`;

    await incrementUsage({
      supabase,
      userId,
      key: "chat_msgs",
      monthKey: chatGate.monthKey,
    });
    response.status(200).json({ reply: finalReply });
  } catch (error) {
    console.error("[chat] Erro ao processar conversa:", error);
    response.status(500).json({ error: "Não foi possível responder no momento." });
  }
}
