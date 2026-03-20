import { supabase } from "../lib/supabase.js";

const toDateString = (value = new Date()) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-CA");
};

const toInt = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : fallback;
};

export async function insertConsumedMeal({
  usuarioId,
  nome,
  data = new Date(),
  horario = null,
  totalCalorias = 0,
  totalProteina = 0,
  totalCarboidratos = 0,
  totalGorduras = 0,
  tipo = null,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuarioId para salvar refeição.");
  if (!nome) throw new Error("Informe o nome da refeição.");

  console.log("[meals] insertConsumedMeal payload (before insert)", {
    usuarioId,
    nome,
    data,
    horario,
    totalCalorias,
    totalProteina,
    totalCarboidratos,
    totalGorduras,
    tipo,
  });

  const payload = {
    usuario_id: usuarioId,
    data: toDateString(data),
    horario: horario || new Date().toTimeString().slice(0, 8),
    tipo,
    nome,
    total_calorias: toInt(totalCalorias, 0),
    total_proteina: toInt(totalProteina, 0),
    total_carboidratos: toInt(totalCarboidratos, 0),
    total_gorduras: toInt(totalGorduras, 0),
  };

  const { data: inserted, error } = await supabase.from("refeicoes_consumidas").insert(payload).select().single();
  console.log("[meals] insertConsumedMeal result", { inserted, error });
  if (error) throw error;
  return inserted;
}

export async function insertPlannedMeal({
  titulo,
  calorias = 0,
  proteinas = null,
  carboidratos = null,
  gorduras = null,
  horario = null,
  descricao = null,
} = {}) {
  if (!titulo) throw new Error("Informe o titulo da refeição.");
  const payload = {
    titulo,
    calorias: toInt(calorias, 0),
    proteinas: toInt(proteinas, null),
    carboidratos: toInt(carboidratos, null),
    gorduras: toInt(gorduras, null),
    horario,
    descricao,
  };

  console.log("[meals] insertPlannedMeal payload (before insert)", payload);
  const { data: inserted, error } = await supabase.from("refeicoes").insert(payload).select().maybeSingle();
  console.log("[meals] insertPlannedMeal result", { inserted, error });
  if (error) throw error;
  return inserted ?? payload;
}

export async function salvarRefeicao({
  planoId = null,
  titulo,
  descricao,
  valores = {},
} = {}) {
  if (!titulo) throw new Error("Informe o titulo da refeição.");
  const agora = new Date();
  const horario = agora.toTimeString().slice(0, 8);
  const payload = {
    plano_id: planoId ?? null,
    titulo,
    horario,
    calorias: toInt(valores.calorias, 0),
    proteinas: toInt(valores.proteinas, 0),
    carboidratos: toInt(valores.carboidratos, 0),
    gorduras: toInt(valores.gorduras, 0),
    descricao: descricao ?? null,
  };
  console.log("[meals] salvarRefeicao payload", payload);
  const { data, error } = await supabase.from("refeicoes").insert([payload]).select().single();
  console.log("[meals] salvarRefeicao result", { data, error });
  if (error) throw error;
  return data;
}

export async function getConsumedMealsSummary({ usuarioId, date = new Date() } = {}) {
  if (!usuarioId) throw new Error("Informe o usuarioId para buscar refeições.");
  const day = toDateString(date);
  const { data, error } = await supabase
    .from("refeicoes_consumidas")
    .select("total_calorias, total_proteina, total_carboidratos, total_gorduras")
    .eq("usuario_id", usuarioId)
    .eq("data", day);
  if (error) throw error;

  const totals = (data ?? []).reduce(
    (acc, item) => ({
      totalCalorias: acc.totalCalorias + (Number(item.total_calorias) || 0),
      totalProteina: acc.totalProteina + (Number(item.total_proteina) || 0),
      totalCarboidratos: acc.totalCarboidratos + (Number(item.total_carboidratos) || 0),
      totalGorduras: acc.totalGorduras + (Number(item.total_gorduras) || 0),
    }),
    { totalCalorias: 0, totalProteina: 0, totalCarboidratos: 0, totalGorduras: 0 },
  );

  return { date: day, count: data?.length ?? 0, ...totals };
}

export async function getLatestConsumedMeal({ usuarioId } = {}) {
  if (!usuarioId) throw new Error("Informe o usuarioId para buscar a ultima refeição.");
  const { data, error } = await supabase
    .from("refeicoes_consumidas")
    .select("id, nome, data, horario, total_calorias, total_proteina, total_carboidratos, total_gorduras")
    .eq("usuario_id", usuarioId)
    .order("data", { ascending: false })
    .order("horario", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}
