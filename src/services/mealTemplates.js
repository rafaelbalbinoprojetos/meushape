import { supabase } from "../lib/supabase.js";

export async function listMealTemplates({ usuarioId } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar modelos.");
  }
  const { data, error } = await supabase
    .from("refeicoes_modelo")
    .select("id, usuario_id, titulo, categoria, calorias, proteinas, carboidratos, gorduras, horario_padrao, criado_em")
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMealTemplate({
  usuarioId,
  titulo,
  categoria,
  calorias,
  proteinas,
  carboidratos,
  gorduras,
  horario,
} = {}) {
  if (!usuarioId) throw new Error("Informe o usuario.");
  if (!titulo) throw new Error("Informe o titulo do modelo.");
  const payload = {
    usuario_id: usuarioId,
    titulo,
    categoria: categoria || "cafe",
    calorias: calorias ?? 0,
    proteinas: proteinas ?? 0,
    carboidratos: carboidratos ?? 0,
    gorduras: gorduras ?? 0,
    horario_padrao: horario || null,
  };
  const { data, error } = await supabase.from("refeicoes_modelo").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMealTemplate({ templateId, usuarioId } = {}) {
  if (!templateId) throw new Error("Informe o modelo.");
  if (!usuarioId) throw new Error("Informe o usuario.");
  const { error } = await supabase.from("refeicoes_modelo").delete().eq("id", templateId).eq("usuario_id", usuarioId);
  if (error) throw error;
  return true;
}
