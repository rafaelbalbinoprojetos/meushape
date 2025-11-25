import { supabase } from "../lib/supabase.js";

export async function createCompletedTreino({
  usuarioId,
  fichaId,
  data = new Date(),
  duracaoMinutos = null,
  caloriasQueimadas = null,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuario que concluiu o treino.");
  const payload = {
    usuario_id: usuarioId,
    ficha_id: fichaId ?? null,
    data: data instanceof Date ? data.toISOString().slice(0, 10) : data,
    duracao_minutos: duracaoMinutos,
    calorias_queimadas: caloriasQueimadas,
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
