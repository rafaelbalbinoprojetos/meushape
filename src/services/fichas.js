import { supabase } from "../lib/supabase.js";

const FALLBACK_TABLE = "fichas";
const FICHAS_TABLE = import.meta.env.VITE_SUPABASE_FICHAS_TABLE?.trim() || FALLBACK_TABLE;
const FICHA_EXERCICIOS_TABLE = "ficha_exercicios";
const FICHA_TREINOS_TABLE = "ficha_treinos";
const SUBDIVISION_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MASTER_USER_EMAIL = "balbino10@hotmail.com";
const FICHA_EXERCICIOS_SELECTION = `
  id,
  exercicio_id,
  treino_id,
  series,
  repeticoes,
  carga,
  descanso_segundos,
  ordem,
  observacoes,
  exercicio:exercicio_id (
    id,
    nome,
    grupo,
    descricao,
    equipamento,
    video_url,
    imagem_url
  )
`;

const DEFAULT_FIELDS = `
  id,
  usuario_id,
  nome,
  descricao,
  objetivo,
  nivel,
  visibilidade,
  thumbnail_url,
  capa_url,
  criado_em,
  atualizado_em
`;

export async function listFichas({
  search = "",
  limit = 50,
  offset = 0,
  visibilidade,
  templatesOnly = false,
  communityOnly = false,
  usuarioId,
  excludeUsuarioId,
} = {}) {
  let query = supabase.from(FICHAS_TABLE).select(DEFAULT_FIELDS, { count: "exact" }).order("criado_em", { ascending: false });

  if (Number.isFinite(limit) && limit > 0) {
    const start = Math.max(0, offset);
    query = query.range(start, start + limit - 1);
  }

  if (visibilidade) {
    query = query.eq("visibilidade", visibilidade);
  }

  if (templatesOnly) {
    query = query.is("usuario_id", null);
  } else if (communityOnly) {
    query = query.not("usuario_id", "is", null);
    if (excludeUsuarioId) {
      query = query.neq("usuario_id", excludeUsuarioId);
    }
  } else if (usuarioId === null) {
    query = query.is("usuario_id", null);
  } else if (usuarioId) {
    query = query.eq("usuario_id", usuarioId);
  }

  const trimmed = search.trim();
  if (trimmed) {
    const wildcard = `%${trimmed}%`;
    query = query.or(`nome.ilike.${wildcard},descricao.ilike.${wildcard},objetivo.ilike.${wildcard}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    items: data ?? [],
    count: typeof count === "number" ? count : data?.length ?? 0,
  };
}

export async function getFichaById(id) {
  if (!id) {
    throw new Error("Informe o identificador da ficha.");
  }

  const { data, error } = await supabase.from(FICHAS_TABLE).select(DEFAULT_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listFichaExercises(fichaId) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha.");
  }

  console.log("[listFichaExercises] table=ficha_treinos column=ficha_id value=%s", fichaId);

  const { data: treinos, error: treinosError } = await supabase
    .from(FICHA_TREINOS_TABLE)
    .select("id")
    .eq("ficha_id", fichaId);

  if (treinosError) throw treinosError;

  const treinoIds = (treinos ?? []).map((treino) => treino.id).filter(Boolean);
  console.log("[listFichaExercises] treino_ids encontrados:", treinoIds);
  if (treinoIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(FICHA_EXERCICIOS_TABLE)
    .select(FICHA_EXERCICIOS_SELECTION)
    .in("treino_id", treinoIds)
    .order("ordem", { ascending: true });

  if (error) throw error;
  console.log(
    "[listFichaExercises] table=ficha_exercicios column=treino_id value=%o -> %d registros",
    treinoIds,
    Array.isArray(data) ? data.length : 0,
  );
  return data ?? [];
}

function sanitizeText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeUrl(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    return sanitizeUrl(value.toString());
  }
  return null;
}

function getSubdivisionByIndex(index = 0) {
  if (!Number.isFinite(index) || index < 0) {
    return SUBDIVISION_ALPHABET[0];
  }
  return SUBDIVISION_ALPHABET[index % SUBDIVISION_ALPHABET.length];
}

function sanitizeSubdivision(value, fallbackIndex = 0) {
  if (typeof value === "string") {
    const letter = value.trim().toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      return letter;
    }
  }
  return getSubdivisionByIndex(fallbackIndex);
}

function buildFichaPayload(fields = {}, { includeUsuarioId = false } = {}) {
const payload = {
  nome: sanitizeText(fields.nome ?? fields.name),
  descricao: sanitizeText(fields.descricao ?? fields.description),
  objetivo: sanitizeText(fields.objetivo ?? fields.goal),
  nivel: sanitizeText(fields.nivel ?? fields.level),
  visibilidade: sanitizeText(fields.visibilidade ?? fields.visibility),
  thumbnail_url: sanitizeUrl(fields.thumbnail_url ?? fields.thumbnailUrl ?? fields.thumbnail),
  capa_url: sanitizeUrl(fields.capa_url ?? fields.capaUrl ?? fields.coverUrl ?? fields.cover),
};

  if (includeUsuarioId) {
    payload.usuario_id = fields.usuario_id ?? fields.usuarioId ?? null;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );
}

function normalizeTreinoRecord(treino, index = 0) {
  const subdivision = sanitizeSubdivision(treino?.subdivisao, index);
  const nome = sanitizeText(treino?.nome) ?? `Treino ${subdivision}`;
  const descricao = sanitizeText(treino?.descricao);
  const ordem = Number.isFinite(treino?.ordem) ? treino.ordem : index + 1;
  const label = treino?.subdivisao_label ?? (subdivision ? `Treino ${subdivision}` : nome);
  const subdivisaoOrdem = Number.isFinite(treino?.subdivisao_ordem)
    ? treino.subdivisao_ordem
    : subdivision
      ? Math.max(1, subdivision.charCodeAt(0) - 64)
      : ordem;

  return {
    id: treino?.id ?? null,
    ficha_id: treino?.ficha_id ?? null,
    nome,
    descricao,
    ordem,
    subdivisao: subdivision,
    subdivisao_label: label,
    subdivisao_ordem: subdivisaoOrdem,
    criado_em: treino?.criado_em ?? null,
    ficha_exercicios: Array.isArray(treino?.ficha_exercicios) ? treino.ficha_exercicios : [],
  };
}

export async function createFicha({
  usuario_id: usuarioId,
  nome,
  descricao,
  objetivo,
  nivel,
  visibilidade = "privada",
  thumbnail_url: thumbnailUrl,
  capa_url: capaUrl,
} = {}) {
  const payload = buildFichaPayload(
    {
      usuario_id: usuarioId,
      nome,
      descricao,
      objetivo,
      nivel,
      visibilidade,
      thumbnail_url: thumbnailUrl,
      capa_url: capaUrl,
    },
    { includeUsuarioId: true },
  );

  if (!payload.nome) {
    throw new Error("Informe um nome para a ficha.");
  }

  if (!payload.usuario_id) {
    throw new Error("Informe o usuario responsavel pela ficha.");
  }

  payload.visibilidade = payload.visibilidade ?? "privada";

  const { data, error } = await supabase.from(FICHAS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateFichaWithExercises({ fichaId, ficha, treinos = [] } = {}) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha para atualizar.");
  }

  const updatePayload = buildFichaPayload(ficha ?? {});
  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase.from(FICHAS_TABLE).update(updatePayload).eq("id", fichaId);
    if (updateError) throw updateError;
  }

  const { data: existingTreinos, error: existingTreinosError } = await supabase
    .from(FICHA_TREINOS_TABLE)
    .select("id")
    .eq("ficha_id", fichaId);
  if (existingTreinosError) throw existingTreinosError;

  const existingTreinoIds = (existingTreinos ?? []).map((treino) => treino.id).filter(Boolean);
  if (existingTreinoIds.length > 0) {
    const { data: existingExercises, error: existingExercisesError } = await supabase
      .from(FICHA_EXERCICIOS_TABLE)
      .select("id")
      .in("treino_id", existingTreinoIds);
    if (existingExercisesError) throw existingExercisesError;
    const existingExerciseIds = (existingExercises ?? []).map((exercise) => exercise.id).filter(Boolean);
    if (existingExerciseIds.length > 0) {
      const { error: deletePreferencesError } = await supabase
        .from("exercicio_preferencias")
        .delete()
        .in("ficha_exercicio_id", existingExerciseIds);
      if (deletePreferencesError) throw deletePreferencesError;
    }
    const { error: deleteExercisesError } = await supabase
      .from(FICHA_EXERCICIOS_TABLE)
      .delete()
      .in("treino_id", existingTreinoIds);
    if (deleteExercisesError) throw deleteExercisesError;
  }

  const { error: deleteTreinosError } = await supabase.from(FICHA_TREINOS_TABLE).delete().eq("ficha_id", fichaId);
  if (deleteTreinosError) throw deleteTreinosError;

  if (!Array.isArray(treinos) || treinos.length === 0) {
    return { fichaId, treinos: [] };
  }

  const treinoRecords = await insertFichaTreinos(fichaId, treinos);
  const treinoMap = new Map(treinoRecords.map((treino) => [treino.subdivisao, treino]));
  const exercisesPayload = treinos.flatMap((treino) => {
    const subdivision = sanitizeSubdivision(treino?.subdivisao);
    const treinoRef = treinoMap.get(subdivision);
    if (!treinoRef) {
      return [];
    }
    const nestedExercises = Array.isArray(treino?.exercicios) ? treino.exercicios : [];
    return nestedExercises
      .filter((exercise) => exercise?.exercicio_id)
      .map((exercise, index) => ({
        ...exercise,
        ordem: Number.isFinite(exercise?.ordem) ? exercise.ordem : index + 1,
        treino_id: treinoRef.id,
      }));
  });

  if (exercisesPayload.length > 0) {
    await insertFichaExercises(fichaId, exercisesPayload);
  }

  return { fichaId, treinos: treinoRecords };
}

export async function updateFichaFields({ fichaId, fields = {} } = {}) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha para atualizar.");
  }
  const payload = buildFichaPayload(fields);
  if (Object.keys(payload).length === 0) {
    return null;
  }
  console.log("[updateFichaFields] fichaId=%s payload=%o", fichaId, payload);
  const { data, error } = await supabase
    .from(FICHAS_TABLE)
    .update(payload)
    .eq("id", fichaId)
    .select("id, thumbnail_url, capa_url")
    .maybeSingle();

  if (error) {
    console.error("[updateFichaFields] erro supabase:", error);
    throw error;
  }

  if (!data) {
    const noRowsError = new Error("Nao foi possivel atualizar esta ficha (sem permissao ou inexistente).");
    noRowsError.code = "no_rows_updated";
    console.warn("[updateFichaFields] nenhuma linha atualizada para fichaId=%s", fichaId);
    throw noRowsError;
  }

  console.log("[updateFichaFields] sucesso ao atualizar midias: %o", data);

  return data ?? true;
}

export async function deleteFicha({ fichaId, usuarioId = null, usuarioEmail = "" } = {}) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha para excluir.");
  }

  const isMasterUser = typeof usuarioEmail === "string" && usuarioEmail.toLowerCase() === MASTER_USER_EMAIL;
  const hasUser = typeof usuarioId === "string" && usuarioId.trim().length > 0;

  if (!isMasterUser && !hasUser) {
    throw new Error("Usuario nao autorizado a excluir esta ficha.");
  }

  // Primeiro, valida se a ficha existe e pertence ao usuario (quando nao for master).
  let checkQuery = supabase.from(FICHAS_TABLE).select("id, usuario_id").eq("id", fichaId);
  if (!isMasterUser) {
    checkQuery = checkQuery.eq("usuario_id", usuarioId);
  }

  const { data: existingFicha, error: fetchError } = await checkQuery.maybeSingle();
  if (fetchError) throw fetchError;
  if (!existingFicha) {
    const err = new Error("Nao foi possivel excluir esta ficha ou ela ja foi removida.");
    err.code = "not_found";
    throw err;
  }

  // Exclui exercicios vinculados para nao violar as constraints de FK.
  const { data: treinos, error: treinosError } = await supabase
    .from(FICHA_TREINOS_TABLE)
    .select("id")
    .eq("ficha_id", fichaId);
  if (treinosError) throw treinosError;

  const treinoIds = (treinos ?? []).map((treino) => treino.id).filter(Boolean);
  if (treinoIds.length > 0) {
    const { error: deleteExercisesError } = await supabase
      .from(FICHA_EXERCICIOS_TABLE)
      .delete()
      .in("treino_id", treinoIds);
    if (deleteExercisesError) throw deleteExercisesError;
  }

  const { error: deleteTreinosError } = await supabase.from(FICHA_TREINOS_TABLE).delete().eq("ficha_id", fichaId);
  if (deleteTreinosError) throw deleteTreinosError;

  let query = supabase.from(FICHAS_TABLE).delete().eq("id", fichaId);

  // Usuarios comuns so conseguem excluir as fichas que pertencem a eles.
  if (!isMasterUser) {
    query = query.eq("usuario_id", usuarioId);
  }

  const { data, error } = await query.select("id");
  if (error) throw error;

  if (!Array.isArray(data) || data.length === 0) {
    const err = new Error("Nao foi possivel excluir esta ficha ou ela ja foi removida.");
    err.code = "not_found";
    throw err;
  }

  return true;
}

async function insertFichaTreinos(fichaId, treinos = []) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha para salvar os treinos.");
  }

  if (!Array.isArray(treinos) || treinos.length === 0) {
    return [];
  }

  const rows = treinos.map((treino, index) => {
    const subdivision = sanitizeSubdivision(treino?.subdivisao, index);
    const nomeBase = sanitizeText(treino?.nome);
    const ordemValue = Number.parseInt(treino?.ordem, 10);
    return {
      ficha_id: fichaId,
      nome: nomeBase ?? `Treino ${subdivision}`,
      descricao: sanitizeText(treino?.descricao),
      ordem: Number.isFinite(ordemValue) ? ordemValue : index + 1,
      subdivisao: subdivision,
    };
  });

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(FICHA_TREINOS_TABLE)
    .insert(rows)
    .select("id, ficha_id, subdivisao, nome, ordem");

  if (error) throw error;
  return data ?? [];
}

export async function insertFichaExercises(fichaId, exercises = []) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return [];
  }

  const rows = exercises
    .filter((exercise) => exercise?.exercicio_id)
    .map((exercise, index) => ({
      treino_id: exercise.treino_id ?? null,
      exercicio_id: exercise.exercicio_id,
      series: exercise.series ?? null,
      repeticoes: exercise.repeticoes ?? null,
      carga: exercise.carga ?? null,
      descanso_segundos: exercise.descanso_segundos ?? null,
      ordem: exercise.ordem ?? index + 1,
      observacoes: exercise.observacoes ?? null,
    }));

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from(FICHA_EXERCICIOS_TABLE).insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function createFichaWithExercises({ ficha, exercises = [], treinos = [] } = {}) {
  if (!ficha) {
    throw new Error("Informe os dados da ficha.");
  }

  const createdFicha = await createFicha(ficha);
  const hasTreinos = Array.isArray(treinos) && treinos.length > 0;
  const fallbackExercises = Array.isArray(exercises) ? exercises : [];

  if (!hasTreinos && fallbackExercises.length === 0) {
    return { ficha: createdFicha, exercises: [] };
  }

  try {
    let treinoRecords = [];
    let exercisesPayload = fallbackExercises;

    if (hasTreinos) {
      treinoRecords = await insertFichaTreinos(createdFicha.id, treinos);
      const treinoMap = new Map(treinoRecords.map((treino) => [treino.subdivisao, treino]));
      exercisesPayload = treinos.flatMap((treino) => {
        const subdivision = sanitizeSubdivision(treino?.subdivisao);
        const treinoRef = treinoMap.get(subdivision);
        if (!treinoRef) {
          return [];
        }
        const nestedExercises = Array.isArray(treino?.exercicios) ? treino.exercicios : [];
        return nestedExercises
          .filter((exercise) => exercise?.exercicio_id)
          .map((exercise, index) => ({
            ...exercise,
            ordem: Number.isFinite(exercise?.ordem) ? exercise.ordem : index + 1,
            treino_id: treinoRef.id,
          }));
      });
    }

    if (!Array.isArray(exercisesPayload) || exercisesPayload.length === 0) {
      return { ficha: createdFicha, exercises: [], treinos: treinoRecords };
    }

    const createdExercises = await insertFichaExercises(createdFicha.id, exercisesPayload);
    return { ficha: createdFicha, exercises: createdExercises, treinos: treinoRecords };
  } catch (error) {
    await supabase.from(FICHA_TREINOS_TABLE).delete().eq("ficha_id", createdFicha.id);
    await supabase.from(FICHAS_TABLE).delete().eq("id", createdFicha.id);
    throw error;
  }
}

export async function listFichaTreinos(fichaId) {
  if (!fichaId) {
    throw new Error("Informe o identificador da ficha para listar os treinos.");
  }

  console.log("[listFichaTreinos] table=ficha_treinos column=ficha_id value=%s", fichaId);

  const { data, error } = await supabase
    .from(FICHA_TREINOS_TABLE)
    .select(
      `
      id,
      ficha_id,
      nome,
      descricao,
      ordem,
      subdivisao,
      subdivisao_label,
      subdivisao_ordem,
      criado_em
    `,
    )
    .eq("ficha_id", fichaId)
    .order("subdivisao_ordem", { ascending: true })
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });

  if (error) {
    console.error("[listFichaTreinos] erro ao carregar treinos:", error);
    return [];
  }

  console.log(
    "[listFichaTreinos] resultado tabela=ficha_treinos coluna=ficha_id value=%s -> %d registros",
    fichaId,
    Array.isArray(data) ? data.length : 0,
  );

  const normalizedTreinos = (data ?? []).map((treino, index) => normalizeTreinoRecord(treino, index));

  const treinoIds = normalizedTreinos.map((treino) => treino.id).filter(Boolean);
  if (treinoIds.length === 0) {
    return normalizedTreinos;
  }

  const { data: exercisesData, error: exercisesError } = await supabase
    .from(FICHA_EXERCICIOS_TABLE)
    .select(FICHA_EXERCICIOS_SELECTION)
    .in("treino_id", treinoIds)
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });

  if (exercisesError) {
    console.error("[listFichaTreinos] erro ao carregar exercicios:", exercisesError);
    return normalizedTreinos;
  }

  console.log(
    "[listFichaTreinos] table=ficha_exercicios column=treino_id value=%o -> %d registros",
    treinoIds,
    Array.isArray(exercisesData) ? exercisesData.length : 0,
  );

  const grouped = new Map();
  (exercisesData ?? []).forEach((exercise) => {
    const treinoId = exercise?.treino_id;
    if (!treinoId) {
      return;
    }
    const bucket = grouped.get(treinoId) ?? [];
    bucket.push(exercise);
    grouped.set(treinoId, bucket);
  });

  return normalizedTreinos.map((treino) => {
    const exercicios = grouped.get(treino.id) ?? [];
    console.log(
      "[listFichaTreinos] treino=%s (%s) recebeu %d exercicios",
      treino.id,
      treino.subdivisao,
      exercicios.length,
    );
    return { ...treino, ficha_exercicios: exercicios };
  });
}

