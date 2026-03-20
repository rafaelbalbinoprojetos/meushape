import { supabase } from "../lib/supabase.js";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export async function listInsights({ usuarioId, limit = 30 } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar insights.");
  }

  const { data, error } = await supabase
    .from("ai_logs")
    .select(
      `
      id,
      usuario_id,
      mensagem_usuario,
      resposta_ia,
      metadata,
      criado_em,
      tipo,
      periodo_inicio,
      periodo_fim,
      versao_modelo,
      score_confianca,
      fonte_dados
    `,
    )
    .eq("usuario_id", usuarioId)
    .eq("tipo", "insight_evolucao")
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function generateInsight({ usuarioId, periodoInicio, periodoFim } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para gerar insights.");
  }

  const response = await fetch(`${API_BASE}/api/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuarioId,
      periodoInicio,
      periodoFim,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = String(payload?.error || "");
    const normalized = raw.toLowerCase();
    if (normalized.includes("limite") || response.status === 429) {
      throw new Error("Você atingiu o limite mensal de insights. Aguarde o próximo ciclo.");
    }
    if (normalized.includes("shape pro") || response.status === 403) {
      throw new Error("Este recurso é exclusivo do Shape Pro.");
    }
    throw new Error(payload?.error ?? "Nao foi possivel gerar o insight.");
  }
  return payload?.insight ?? null;
}

export async function deleteInsight({ insightId, usuarioId } = {}) {
  if (!insightId) {
    throw new Error("Informe o insight para excluir.");
  }
  if (!usuarioId) {
    throw new Error("Informe o usuario para excluir o insight.");
  }

  const { error } = await supabase.from("ai_logs").delete().eq("id", insightId).eq("usuario_id", usuarioId);
  if (error) throw error;
  return true;
}
