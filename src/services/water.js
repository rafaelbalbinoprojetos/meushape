import { supabase } from "../lib/supabase.js";

/**
 * Registra consumo de água em mililitros.
 */
export async function registerWaterIntake({ usuarioId, quantidadeMl, consumidoEm = new Date() } = {}) {
  if (!usuarioId) throw new Error("Informe o usuario.");
  const quantidade = Number.parseInt(quantidadeMl, 10);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error("Informe a quantidade em ml.");
  }

  const payload = {
    usuario_id: usuarioId,
    quantidade_ml: quantidade,
    consumido_em: consumidoEm instanceof Date ? consumidoEm.toISOString() : consumidoEm ?? new Date().toISOString(),
  };

  const { data, error } = await supabase.from("agua_consumida").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

/**
 * Retorna o total de água consumida no dia (em ml).
 */
export async function getWaterIntakeToday({ usuarioId, date = new Date() } = {}) {
  if (!usuarioId) throw new Error("Informe o usuario.");
  const base = new Date(date);
  // Usa a data local do usuário para evitar deslocamento por fuso
  const dayStr = base.toLocaleDateString("en-CA"); // yyyy-mm-dd no fuso local
  const start = `${dayStr}T00:00:00`;
  const end = `${dayStr}T23:59:59.999`;

  const { data, error } = await supabase
    .from("agua_consumida")
    .select("quantidade_ml, consumido_em")
    .eq("usuario_id", usuarioId)
    .gte("consumido_em", start)
    .lte("consumido_em", end);
  if (error) throw error;

  const total = (data ?? []).reduce((sum, item) => sum + (Number(item.quantidade_ml) || 0), 0);
  return { total, items: data ?? [] };
}
