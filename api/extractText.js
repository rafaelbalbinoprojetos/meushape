/* eslint-env node */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

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

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  try {
    const body = parseBody(req);
    const fileId = body?.fileId;
    const userId = body?.userId;
    const prompt =
      body?.prompt ||
      "Faça OCR completo do arquivo (mesmo scan/imagem). Extraia o texto integral na ordem de leitura, mantendo números, unidades e labels. Não resuma ou interprete.";
    const model = process.env.OPENAI_EXTRACT_MODEL || "gpt-4.1";

    if (!fileId) {
      return res.status(400).json({ error: "Envie fileId do upload." });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para extrair texto." });
    }

    const gate = await ensureUsageAllowed({
      supabase,
      userId,
      key: "relatorios",
      limit: AI_LIMITS_PRO.relatorios,
    });
    if (!gate.ok) {
      return res.status(gate.status).json({ error: gate.message });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_file", file_id: fileId },
          ],
        },
      ],
      max_output_tokens: 4000,
      temperature: 0.0,
    });

    const text =
      response.output_text ||
      response.output?.[0]?.content?.map((c) => c?.text).join("\n") ||
      "";

    if (!text) {
      console.warn("[extractText] texto vazio para fileId:", fileId);
    } else {
      console.log("[extractText] preview:", text.slice(0, 500));
    }

    await incrementUsage({
      supabase,
      userId,
      key: "relatorios",
      monthKey: gate.monthKey,
    });

    return res.status(200).json({ text, model, raw: response });
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    console.error("[extractText] erro:", error?.response?.data || error);
    return res.status(status).json({
      error: error?.response?.data?.error?.message || error?.message || "Falha ao extrair texto.",
      details: error?.response?.data || null,
      status,
    });
  }
}
