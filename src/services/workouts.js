import { supabase } from "../lib/supabase.js";

const WORKOUTS_TABLE = "treinos";
const EXERCISES_TABLE = "exercicios";
const MEAL_PLANS_TABLE = "planos_alimentares";
const WORKOUT_SELECT_FIELDS = `
  id,
  nome,
  foco,
  descricao,
  nível,
  objetivo,
  dias_semana,
  tempo_estimado,
  status,
  destaque,
  thumbnail_url,
  vídeo_capa_url,
  séries:séries_config (
    id,
    ordem,
    musculo,
    exercicio_id,
    séries,
    repeticoes,
    carga_sugerida,
    descanso_segundos,
    observações,
    vídeo_url,
    imagem_url
  ),
  criador:criador_id (
    id,
    nome,
    avatar_url
  )
`;

function baseWorkoutQuery() {
  return supabase.from(WORKOUTS_TABLE).select(WORKOUT_SELECT_FIELDS, { count: "exact" });
}

export async function listExercises() {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .select("id, nome, grupo_muscular, equipamento, vídeo_url, imagem_url, variações, observações")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listMealPlans() {
  const { data, error } = await supabase
    .from(MEAL_PLANS_TABLE)
    .select("id, titulo, calorias, proteínas, carboidratos, gorduras, refeições")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listWorkouts({
  search = "",
  limit = 24,
  offset = 0,
  status = "ativo",
  featuredOnly = false,
  orderBy = "atualizado_em",
  ascending = false,
} = {}) {
  let query = baseWorkoutQuery().order(orderBy, { ascending });

  if (Number.isFinite(limit) && limit > 0) {
    const start = Math.max(offset, 0);
    query = query.range(start, start + limit - 1);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (featuredOnly) {
    query = query.eq("destaque", true);
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const wildcard = `%${trimmedSearch}%`;
    query = query.or(`nome.ilike.${wildcard},descricao.ilike.${wildcard},foco.ilike.${wildcard}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: data ?? [],
    count: typeof count === "number" ? count : (data ?? []).length,
  };
}

export async function listRecentWorkouts(limit = 6) {
  const { data, error } = await baseWorkoutQuery()
    .eq("status", "ativo")
    .order("atualizado_em", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getWorkoutById(workoutId) {
  if (!workoutId) throw new Error("Informe o identificador do treino.");
  const { data, error } = await baseWorkoutQuery().eq("id", workoutId).single();
  if (error) throw error;
  return data;
}

export async function createWorkout(payload) {
  const { data, error } = await supabase.from(WORKOUTS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function createExercise(payload) {
  const { data, error } = await supabase.from(EXERCISES_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

