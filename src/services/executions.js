import { supabase } from "../lib/supabase.js";

export async function createCompletedTreino({
  usuarioId,
  fichaId,
  treinoNome = null,
  data = new Date(),
  duracaoMinutos = null,
  caloriasQueimadas = null,
  volumeTotalKg = null,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuario que concluiu o treino.");
  const payload = {
    usuario_id: usuarioId,
    ficha_id: fichaId ?? null,
    treino_nome: treinoNome ?? null,
    data: data instanceof Date ? data.toISOString().slice(0, 10) : data,
    duracao_minutos: duracaoMinutos,
    calorias_queimadas: caloriasQueimadas,
    volume_total_kg: volumeTotalKg,
  };
  const { data: inserted, error } = await supabase
    .from("treinos_concluidos")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return inserted;
}

export async function logExerciseExecution({
  treinoId,
  exercicioId,
  seriesExecutadas = null,
  repeticoesExecutadas = null,
  cargaExecutada = null,
} = {}) {
  if (!treinoId) throw new Error("Informe o treino concluido (treino_id).");
  if (!exercicioId) throw new Error("Informe o exercicio (exercicio_id).");
  const payload = {
    treino_id: treinoId,
    exercicio_id: exercicioId,
    series_executadas: seriesExecutadas,
    repeticoes_executadas: repeticoesExecutadas,
    carga_executada: cargaExecutada,
  };
  const { data, error } = await supabase.from("execucoes").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

/**
 * Retorna um resumo dos treinos concluídos nos últimos 7 dias (ou em um intervalo customizado).
 * Estrutura de retorno: [{ day: "Seg", date: "2025-12-02", value: 2, minutos: 80 }, ...]
 */
export async function getWeeklyTreinosSummary({ usuarioId, startDate = null, endDate = null } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar o histórico semanal.");
  }

  const today = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(today);
  if (!startDate) {
    start.setDate(today.getDate() - 6); // últimos 7 dias incluindo hoje
  }

  const toISODate = (d) => d.toISOString().slice(0, 10);
  const startStr = toISODate(start);
  const endStr = toISODate(today);

  // Busca os registros e agrupa no client para evitar problemas de alias/agrupamento em PostgREST.
  const { data, error } = await supabase
    .from("treinos_concluidos")
    .select("id, data, duracao_minutos")
    .eq("usuario_id", usuarioId)
    .gte("data", startStr)
    .lte("data", endStr)
    .order("data", { ascending: true });

  if (error) throw error;

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const buckets = new Map();
  data?.forEach((row) => {
    if (!row?.data) return;
    const dateKey = toISODate(new Date(row.data));
    const existing = buckets.get(dateKey) || { value: 0, minutos: 0 };
    buckets.set(dateKey, {
      value: existing.value + 1,
      minutos: existing.minutos + (Number(row.duracao_minutos) || 0),
    });
  });

  const result = [];
  for (let i = 0; i < 7; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = toISODate(current);
    const bucket = buckets.get(key) || { value: 0, minutos: 0 };
    // getDay() considera fuso do dispositivo; como usamos datas puras (YYYY-MM-DD),
    // reforçamos o parse para evitar deslocamentos.
    const dayIndex = new Date(`${key}T00:00:00Z`).getUTCDay();
    result.push({
      day: dayLabels[dayIndex] || `D${i + 1}`,
      date: key,
      value: bucket.value,
      minutos: bucket.minutos,
    });
  }

  return result;
}

export async function listCompletedTreinosInRange({ usuarioId, startDate, endDate } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar os treinos concluidos.");
  }
  const start = startDate instanceof Date ? startDate.toISOString().slice(0, 10) : startDate;
  const end = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : endDate;
  const { data, error } = await supabase
    .from("treinos_concluidos")
    .select("id, data, duracao_minutos, calorias_queimadas")
    .eq("usuario_id", usuarioId)
    .gte("data", start)
    .lte("data", end)
    .order("data", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateCompletedTreinoDate({ usuarioId, treinoId, data } = {}) {
  if (!usuarioId) throw new Error("Informe o usuario para atualizar o treino.");
  if (!treinoId) throw new Error("Informe o treino para atualizar a data.");
  if (!data) throw new Error("Informe a data do treino.");
  const { data: updated, error } = await supabase
    .from("treinos_concluidos")
    .update({ data })
    .eq("id", treinoId)
    .eq("usuario_id", usuarioId)
    .select("id, data, duracao_minutos, calorias_queimadas")
    .single();
  if (error) throw error;
  return updated;
}

export async function updateCompletedTreinoMetrics({
  usuarioId,
  treinoId,
  treinoNome = null,
  volumeTotalKg = null,
  totalSeries = null,
  totalExercicios = null,
  rpe = null,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuario para atualizar o treino.");
  if (!treinoId) throw new Error("Informe o treino para atualizar.");
  const payload = {};
  if (volumeTotalKg !== null && volumeTotalKg !== undefined) {
    payload.volume_total_kg = volumeTotalKg;
  }
  if (totalSeries !== null && totalSeries !== undefined) {
    payload.total_series = totalSeries;
  }
  if (totalExercicios !== null && totalExercicios !== undefined) {
    payload.total_exercicios = totalExercicios;
  }
  if (rpe !== null && rpe !== undefined) {
    payload.rpe = rpe;
  }
  if (treinoNome) {
    payload.treino_nome = treinoNome;
  }
  if (Object.keys(payload).length === 0) {
    return null;
  }
  const { data: updated, error } = await supabase
    .from("treinos_concluidos")
    .update(payload)
    .eq("id", treinoId)
    .eq("usuario_id", usuarioId)
    .select("id, volume_total_kg")
    .single();
  if (error) throw error;
  return updated;
}

export async function deleteCompletedTreino({ usuarioId, treinoId } = {}) {
  if (!usuarioId) throw new Error("Informe o usuario para excluir o treino.");
  if (!treinoId) throw new Error("Informe o treino para excluir.");
  const { error } = await supabase
    .from("treinos_concluidos")
    .delete()
    .eq("id", treinoId)
    .eq("usuario_id", usuarioId);
  if (error) throw error;
  return true;
}
