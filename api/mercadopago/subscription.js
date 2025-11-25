/* eslint-env node */
import crypto from "crypto";
import { DEFAULT_PLAN_ID, PLAN_DETAILS } from "../../src/data/plans.js";

const MERCADO_PAGO_PREAPPROVAL_API = "https://api.mercadopago.com/preapproval";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: "Credenciais do Mercado Pago não configuradas." });
  }

  const body = parseBody(req);
  const { plan = DEFAULT_PLAN_ID, userId, email } = body;

  if (!userId || !email) {
    return res.status(400).json({ error: "userId e email são obrigatórios para criar a assinatura." });
  }

  const planKey = typeof plan === "string" ? plan.toLowerCase() : DEFAULT_PLAN_ID;
  const planConfig = PLAN_DETAILS[planKey] ?? PLAN_DETAILS[DEFAULT_PLAN_ID];

  const origin = req.headers.origin || process.env.APP_ORIGIN || "https://grana.app";
  const successUrl = process.env.MERCADOPAGO_SUCCESS_URL || `${origin}/assinatura/sucesso`;
  const notificationUrl = process.env.MERCADOPAGO_WEBHOOK_URL;

  const autoRecurring = {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: planConfig.price,
    currency_id: planConfig.currency ?? "BRL",
  };

  if (planConfig.trialDays && planConfig.trialDays > 0) {
    autoRecurring.free_trial = {
      frequency: planConfig.trialDays,
      frequency_type: "days",
    };
  }

  const preapprovalPayload = {
    reason: planConfig.reason,
    payer_email: email,
    external_reference: `${planConfig.id}-${userId}`,
    auto_recurring: autoRecurring,
    back_url: successUrl,
    status: "pending",
    metadata: {
      plan: planConfig.id,
      userId,
      email,
    },
  };

  if (notificationUrl) {
    preapprovalPayload.notification_url = notificationUrl;
  }

  try {
    const response = await fetch(MERCADO_PAGO_PREAPPROVAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": crypto.randomUUID?.() ?? `${planConfig.id}-${userId}-${Date.now()}`,
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("[mercadopago] Erro ao criar preapproval:", payload);
      const message = payload?.message || payload?.error || "Não foi possível gerar a assinatura automática.";
      return res.status(response.status).json({ error: message });
    }

    return res.status(200).json({
      preapprovalId: payload.id,
      checkoutUrl: payload.init_point || payload.sandbox_init_point || payload.url,
    });
  } catch (error) {
    console.error("[mercadopago] Erro inesperado (preapproval):", error);
    return res.status(500).json({ error: "Erro inesperado ao criar assinatura automática." });
  }
}
