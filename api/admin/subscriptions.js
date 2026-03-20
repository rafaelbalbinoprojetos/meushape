/* eslint-env node */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const adminEmails = (process.env.ADMIN_SUBSCRIPTION_EMAILS || process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
if (adminEmails.length === 0) {
  adminEmails.push("balbino10@hotmail.com");
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function getMonthKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const monthDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  return monthDate.toISOString().slice(0, 10);
}

function toSafeUsageRow(userId, monthKey, usage = {}) {
  return {
    user_id: userId,
    month: monthKey,
    fichas_geradas: Number(usage.fichas_geradas) || 0,
    fotos_analisadas: Number(usage.fotos_analisadas) || 0,
    chat_msgs: Number(usage.chat_msgs) || 0,
    insights: Number(usage.insights) || 0,
    relatorios: Number(usage.relatorios) || 0,
  };
}

async function authenticate(req) {
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase não configurado para gestão de assinaturas." };
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { ok: false, status: 401, error: "Token ausente." };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401, error: "Sessão inválida." };
  }

  const email = String(authData.user.email || "").toLowerCase();
  const canManage = adminEmails.includes(email);

  if (!canManage) {
    return { ok: false, status: 403, error: "Você não tem permissão para esta área." };
  }

  return { ok: true, user: authData.user };
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

async function listUsersWithUsage({ month, q }) {
  const admin = createAdminClient();
  const monthKey = getMonthKey(month);
  if (!monthKey) {
    throw new Error("Mês inválido.");
  }

  const users = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 25) break;
  }

  const normalizedQ = String(q || "").trim().toLowerCase();
  const filteredUsers = normalizedQ
    ? users.filter((u) => {
        const email = String(u.email || "").toLowerCase();
        const id = String(u.id || "").toLowerCase();
        return email.includes(normalizedQ) || id.includes(normalizedQ);
      })
    : users;

  const userIds = filteredUsers.map((u) => u.id).filter(Boolean);
  let usageRows = [];
  if (userIds.length) {
    const { data, error } = await admin
      .from("ai_usage_meushape")
      .select("*")
      .eq("month", monthKey)
      .in("user_id", userIds);
    if (error) throw error;
    usageRows = data || [];
  }
  const usageByUser = new Map(usageRows.map((row) => [row.user_id, row]));

  return filteredUsers.map((u) => {
    const meta = u.user_metadata || {};
    const appMeta = u.app_metadata || {};
    const tier = meta.subscription_tier ?? meta.plan ?? appMeta.subscription_tier ?? appMeta.plan ?? "free";
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      tier,
      metadata: {
        subscription_tier: meta.subscription_tier ?? null,
        plan: meta.plan ?? null,
      },
      usage: usageByUser.get(u.id) || toSafeUsageRow(u.id, monthKey),
    };
  });
}

async function setUserTier({ userId, tier }) {
  const targetTier = String(tier || "").trim().toLowerCase();
  if (!userId) throw new Error("userId é obrigatório.");
  if (!["free", "premium", "pro"].includes(targetTier)) {
    throw new Error("tier inválido. Use free|premium|pro.");
  }
  const admin = createAdminClient();
  const normalizedTier = targetTier === "pro" ? "premium" : targetTier;
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      subscription_tier: normalizedTier,
      plan: normalizedTier,
    },
  });
  if (error) throw error;
  return data.user;
}

async function upsertUsage({ userId, month, usage }) {
  const monthKey = getMonthKey(month);
  if (!userId) throw new Error("userId é obrigatório.");
  if (!monthKey) throw new Error("month inválido.");
  const row = toSafeUsageRow(userId, monthKey, usage || {});
  const admin = createAdminClient();
  const { data, error } = await admin.from("ai_usage_meushape").upsert(row).select("*").single();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    if (req.method === "GET") {
      const { month, q } = req.query || {};
      const users = await listUsersWithUsage({ month, q });
      return res.status(200).json({ users, month: getMonthKey(month) });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const action = String(body.action || "").trim();

      if (action === "set_tier") {
        const user = await setUserTier({ userId: body.userId, tier: body.tier });
        return res.status(200).json({ ok: true, user });
      }

      if (action === "set_usage") {
        const usage = await upsertUsage({
          userId: body.userId,
          month: body.month,
          usage: body.usage,
        });
        return res.status(200).json({ ok: true, usage });
      }

      if (action === "reset_usage") {
        const usage = await upsertUsage({
          userId: body.userId,
          month: body.month,
          usage: {
            fichas_geradas: 0,
            fotos_analisadas: 0,
            chat_msgs: 0,
            insights: 0,
            relatorios: 0,
          },
        });
        return res.status(200).json({ ok: true, usage });
      }

      return res.status(400).json({ error: "action inválida." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) {
    console.error("[admin/subscriptions] erro:", error);
    return res.status(500).json({ error: error?.message || "Falha ao processar gestão de assinaturas." });
  }
}
