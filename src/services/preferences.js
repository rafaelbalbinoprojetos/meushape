import { supabase } from "../lib/supabase.js";

export async function upsertExercisePreference({
  usuarioId,
  exercicioId,
  fichaExercicioId = null,
  cargaSugerida = null,
  repeticoes = null,
  series = null,
  observacoes = null,
} = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para salvar a preferencia de carga.");
  }
  if (!exercicioId) {
    throw new Error("Informe o exercicio para salvar a preferencia de carga.");
  }

  const payload = {
    usuario_id: usuarioId,
    exercicio_id: exercicioId,
    ficha_exercicio_id: fichaExercicioId ?? null,
    carga_sugerida: cargaSugerida != null && cargaSugerida !== "" ? cargaSugerida : null,
    repeticoes: repeticoes ?? null,
    series: series ?? null,
    observacoes: observacoes ?? null,
  };

  const { data, error } = await supabase.from("exercicio_preferencias").upsert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function listExercisePreferences({ usuarioId, fichaExercicioIds = [] } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para listar preferencias.");
  }
  let query = supabase.from("exercicio_preferencias").select("*").eq("usuario_id", usuarioId);
  const ids = (fichaExercicioIds ?? []).filter(Boolean);
  if (ids.length > 0) {
    query = query.in("ficha_exercicio_id", ids);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
