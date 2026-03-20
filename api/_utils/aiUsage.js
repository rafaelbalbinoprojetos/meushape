/* eslint-env node */

export const AI_LIMITS_PRO = {
  fichas_geradas: 8,
  fotos_analisadas: 186,
  chat_msgs: 300,
  insights: 20,
  relatorios: 10,
};

export function getMonthKey(date = new Date()) {
  const safe = date instanceof Date ? date : new Date(date);
  const monthDate = new Date(Date.UTC(safe.getUTCFullYear(), safe.getUTCMonth(), 1, 0, 0, 0));
  return monthDate.toISOString().slice(0, 10);
}

export function isProTier(tier) {
  const normalized = String(tier || "").trim().toLowerCase();
  return ["premium", "pro", "shape pro", "shape_pro", "shapepro", "shape-pro"].includes(normalized);
}

export async function fetchUserPlan(supabase, userId) {
  if (!supabase?.auth?.admin?.getUserById || !userId) return null;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("[ai-usage] erro ao buscar usuario:", error);
    return null;
  }
  const user = data?.user ?? null;
  const meta = user?.user_metadata ?? {};
  const appMeta = user?.app_metadata ?? {};
  const tier = meta.subscription_tier ?? meta.plan ?? appMeta.subscription_tier ?? appMeta.plan ?? null;
  return { user, tier };
}

export async function getUsageRow(supabase, userId, monthKey) {
  const { data, error } = await supabase
    .from("ai_usage_meushape")
    .select("*")
    .eq("user_id", userId)
    .eq("month", monthKey)
    .maybeSingle();
  if (error) {
    console.error("[ai-usage] erro ao consultar uso:", error);
    return { data: null, error };
  }
  return { data, error: null };
}

export async function ensureUsageAllowed({ supabase, userId, key, limit }) {
  if (!userId) {
    return { ok: false, status: 400, message: "usuarioId é obrigatório." };
  }
  if (!supabase) {
    return { ok: false, status: 500, message: "Supabase indisponível para validar uso de IA." };
  }

  const planInfo = await fetchUserPlan(supabase, userId);
  if (!planInfo) {
    return { ok: false, status: 500, message: "Não foi possível validar a assinatura." };
  }
  if (!isProTier(planInfo.tier)) {
    return { ok: false, status: 403, message: "Recurso disponível apenas para o Shape Pro." };
  }

  const monthKey = getMonthKey();
  const { data } = await getUsageRow(supabase, userId, monthKey);
  const current = Number(data?.[key]) || 0;
  if (Number.isFinite(limit) && current >= limit) {
    return {
      ok: false,
      status: 429,
      message: "Limite mensal atingido para este recurso.",
      current,
      limit,
      monthKey,
    };
  }

  return { ok: true, current, limit, monthKey };
}

export async function incrementUsage({ supabase, userId, key, amount = 1, monthKey }) {
  if (!supabase || !userId) return;
  const targetMonth = monthKey || getMonthKey();
  const { data } = await getUsageRow(supabase, userId, targetMonth);
  if (!data) {
    await supabase.from("ai_usage_meushape").insert({
      user_id: userId,
      month: targetMonth,
      [key]: amount,
    });
    return;
  }
  const current = Number(data?.[key]) || 0;
  await supabase
    .from("ai_usage_meushape")
    .update({ [key]: current + amount })
    .eq("user_id", userId)
    .eq("month", targetMonth);
}
