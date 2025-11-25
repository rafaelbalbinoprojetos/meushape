import { supabase } from "../lib/supabase.js";

const EXERCISES_TABLE = "exercicios";

const DEFAULT_FIELDS = `
  id,
  nome,
  grupo,
  descricao,
  equipamento,
  tipo_execucao,
  nivel,
  risco,
  execucao,
  video_url,
  imagem_url,
  criado_em,
  atualizado_em
`;

export async function listExercises({
  search = "",
  group,
  equipment,
  hasVideo,
  nivel,
  risco,
  tipoExecucao,
  limit = 100,
  offset = 0,
} = {}) {
  let query = supabase.from(EXERCISES_TABLE).select(DEFAULT_FIELDS, { count: "exact" }).order("atualizado_em", { ascending: false });

  if (Number.isFinite(limit) && limit > 0) {
    const start = Math.max(offset, 0);
    query = query.range(start, start + limit - 1);
  }

  if (group) {
    query = query.eq("grupo", group);
  }

  if (equipment) {
    query = query.ilike("equipamento", `%${equipment}%`);
  }

  if (nivel) {
    query = query.eq("nivel", nivel);
  }

  if (risco) {
    query = query.eq("risco", risco);
  }

  if (tipoExecucao) {
    query = query.eq("tipo_execucao", tipoExecucao);
  }

  if (typeof hasVideo === "boolean") {
    query = hasVideo ? query.not("video_url", "is", null) : query.is("video_url", null);
  }

  const trimmed = search.trim();
  if (trimmed) {
    const wildcard = `%${trimmed}%`;
    query = query.or(`nome.ilike.${wildcard},descricao.ilike.${wildcard},equipamento.ilike.${wildcard}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    items: data ?? [],
    count: typeof count === "number" ? count : data?.length ?? 0,
  };
}

export async function getExerciseById(id) {
  if (!id) {
    throw new Error("Informe o identificador do exercicio.");
  }

  const { data, error } = await supabase.from(EXERCISES_TABLE).select(DEFAULT_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateExercise(id, fields = {}) {
  if (!id) {
    throw new Error("Informe o identificador do exercicio para atualizar.");
  }
  const payload = {
    nome: fields.nome,
    descricao: fields.descricao,
    grupo: fields.grupo,
    equipamento: fields.equipamento,
    video_url: fields.video_url,
    imagem_url: fields.imagem_url,
    execucao: fields.execucao,
    tipo_execucao: fields.tipo_execucao,
    nivel: fields.nivel,
    risco: fields.risco,
  };
  const sanitized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(sanitized).length === 0) {
    return null;
  }
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .update(sanitized)
    .eq("id", id)
    .select(DEFAULT_FIELDS)
    .maybeSingle();
  if (error) throw error;
  return data;
}
