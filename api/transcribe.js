/* eslint-env node */
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

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

  if (!openai.apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  try {
    const body = parseBody(req);
    const { audio, mimeType, userId } = body;

    if (!audio) {
      return res.status(400).json({ error: "Payload de áudio não recebido." });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para transcrição." });
    }

    const gate = await ensureUsageAllowed({
      supabase,
      userId,
      key: "chat_msgs",
      limit: AI_LIMITS_PRO.chat_msgs,
    });
    if (!gate.ok) {
      return res.status(gate.status).json({ error: gate.message });
    }

    const buffer = Buffer.from(audio, "base64");
    const extension = mimeType?.includes("mp3")
      ? "mp3"
      : mimeType?.includes("wav")
      ? "wav"
      : "webm";

    const file = await OpenAI.toFile(buffer, `granaapp-audio.${extension}`);

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
      response_format: "json",
      temperature: 0.2,
    });

    await incrementUsage({
      supabase,
      userId,
      key: "chat_msgs",
      monthKey: gate.monthKey,
    });

    return res.status(200).json({
      text: transcription.text?.trim() ?? "",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Não foi possível transcrever o áudio.",
      details: error.message,
    });
  }
}
