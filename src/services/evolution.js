import { supabase } from "../lib/supabase.js";

function parseFirstNumber(text) {
  if (!text) return null;
  const match = String(text).match(/\d+/);
  if (!match) return null;
  const value = Number.parseInt(match[0], 10);
  return Number.isFinite(value) ? value : null;
}

export async function fetchEvolutionStats({ usuarioId, days = 30 } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar a evolução.");
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString().slice(0, 10);

  const { data: treinos, error: treinosError } = await supabase
    .from("treinos_concluidos")
    .select("id, data, duracao_minutos, calorias_queimadas")
    .eq("usuario_id", usuarioId)
    .gte("data", since)
    .order("data", { ascending: false });
  if (treinosError) throw treinosError;

  const treinoIds = (treinos ?? []).map((t) => t.id).filter(Boolean);
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
        exercicio:exercicio_id (nome, grupo, equipamento)
      `,
      )
      .in("treino_id", treinoIds)
      .order("criado_em", { ascending: false });
    if (execError) throw execError;
    execucoes = execData ?? [];
  }

  const { data: prs, error: prsError } = await supabase
    .from("personal_records")
    .select("id, exercicio_id, carga, repeticoes, data, exercicio:exercicio_id (nome, grupo)")
    .eq("usuario_id", usuarioId)
    .order("data", { ascending: false })
    .limit(10);
  if (prsError) throw prsError;

  // Medidas corporais (evolucao)
  const { data: medidas, error: medidasError } = await supabase
    .from("evolucao")
    .select(
      `
      id,
      data,
      peso,
      braco,
      peito,
      cintura,
      quadril,
      perna,
      gordura_corporal,
      altura,
      imc,
      massa_magra,
      gordura_visceral,
      braco_contraido,
      coxa_esquerda,
      coxa_direita,
      panturrilha_esquerda,
      panturrilha_direita,
      cabeca_projetada,
      ombros_avancados,
      hipercifose,
      anteversao_pelve,
      joelho_valgo,
      flexao_qtd,
      abdominal_qtd,
      prancha_tempo_seg,
      ficha_id
    `,
    )
    .eq("usuario_id", usuarioId)
    .order("data", { ascending: false })
    .limit(6);
  if (medidasError) throw medidasError;
  const medidaAtual = medidas?.[0] ?? null;
  const massaMagraCalculada =
    medidaAtual && Number.isFinite(Number(medidaAtual.peso)) && Number.isFinite(Number(medidaAtual.gordura_corporal))
      ? Number(medidaAtual.peso) * (1 - Number(medidaAtual.gordura_corporal) / 100)
      : null;

  const totalTreinos = treinos.length;
  const totalExecucoes = execucoes.length;
  const totalSeries = execucoes.reduce((sum, exec) => sum + (exec.series_executadas ?? 0), 0);
  const totalVolume = execucoes.reduce((sum, exec) => {
    const carga = Number(exec.carga_executada) || 0;
    const series = exec.series_executadas ?? 0;
    return sum + carga * series;
  }, 0);

  const totalReps = execucoes.reduce((sum, exec) => {
    const reps = parseFirstNumber(exec.repeticoes_executadas) ?? 0;
    return sum + reps * (exec.series_executadas ?? 0);
  }, 0);

  const topExerciciosMap = new Map();
  execucoes.forEach((exec) => {
    const carga = Number(exec.carga_executada) || 0;
    const series = exec.series_executadas ?? 0;
    const volume = carga * series;
    const key = exec.exercicio_id;
    const existing = topExerciciosMap.get(key) ?? {
      volume: 0,
      series: 0,
      reps: 0,
      exercicio: exec.exercicio,
    };
    existing.volume += volume;
    existing.series += series;
    const reps = parseFirstNumber(exec.repeticoes_executadas) ?? 0;
    existing.reps += reps * series;
    topExerciciosMap.set(key, existing);
  });

  const topExercicios = Array.from(topExerciciosMap.entries())
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return {
    totals: {
      totalTreinos,
      totalExecucoes,
      totalSeries,
      totalVolume,
      totalReps,
    },
    treinos,
    execucoes,
    topExercicios,
    prs: prs ?? [],
    medidas: medidas ?? [],
    medidaAtual,
    massaMagra: medidaAtual?.massa_magra ?? massaMagraCalculada,
  };
}

export async function upsertMeasurement({
  id = null,
  usuarioId,
  data = new Date(),
  peso = null,
  gordura_corporal = null,
  braco = null,
  peito = null,
  cintura = null,
  quadril = null,
  perna = null,
  altura = null,
  imc = null,
  massa_magra = null,
  gordura_visceral = null,
  braco_contraido = null,
  coxa_esquerda = null,
  coxa_direita = null,
  panturrilha_esquerda = null,
  panturrilha_direita = null,
  cabeca_projetada = null,
  ombros_avancados = null,
  hipercifose = null,
  anteversao_pelve = null,
  joelho_valgo = null,
  flexao_qtd = null,
  abdominal_qtd = null,
  prancha_tempo_seg = null,
  ficha_id = null,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuario.");
  const payload = {
    usuario_id: usuarioId,
    data: data instanceof Date ? data.toISOString().slice(0, 10) : data,
    peso,
    gordura_corporal,
    braco,
    peito,
    cintura,
    quadril,
    perna,
    altura,
    imc,
    massa_magra,
    gordura_visceral,
    braco_contraido,
    coxa_esquerda,
    coxa_direita,
    panturrilha_esquerda,
    panturrilha_direita,
    cabeca_projetada,
    ombros_avancados,
    hipercifose,
    anteversao_pelve,
    joelho_valgo,
    flexao_qtd,
    abdominal_qtd,
    prancha_tempo_seg,
    ficha_id,
  };
  if (id) {
    const { data: updated, error } = await supabase.from("evolucao").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return updated;
  }
  const { data: inserted, error: insertError } = await supabase.from("evolucao").insert(payload).select().single();
  if (insertError) throw insertError;
  return inserted;
}

export async function deleteMeasurement({ id, usuarioId } = {}) {
  if (!id || !usuarioId) throw new Error("Informe id e usuario.");
  const { error } = await supabase.from("evolucao").delete().eq("id", id).eq("usuario_id", usuarioId);
  if (error) throw error;
  return true;
}
