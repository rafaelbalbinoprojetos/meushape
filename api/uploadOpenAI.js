/* eslint-env node */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed } from "./_utils/aiUsage.js";
import Busboy from "busboy";

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

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
    let fileBuffer = null;
    let fileInfo = { filename: "arquivo", mimeType: "application/octet-stream" };

    busboy.on("file", (_fieldname, file, info) => {
      fileInfo = { filename: info.filename || "arquivo", mimeType: info.mimeType || "application/octet-stream" };
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", (error) => reject(error));
    busboy.on("finish", () => {
      if (!fileBuffer) {
        return reject(new Error("Nenhum arquivo recebido."));
      }
      resolve({ fileBuffer, fileInfo });
    });

    req.pipe(busboy);
  });
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
    const url = new URL(req.url, "http://localhost");
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para upload." });
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

    const { fileBuffer, fileInfo } = await parseMultipart(req);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Converte Buffer em File para evitar incompatibilidades do SDK com Buffer puro
    const fileForUpload = await OpenAI.toFile(fileBuffer, fileInfo.filename, {
      contentType: fileInfo.mimeType,
    });

    const uploaded = await openai.files.create({
      purpose: "user_data",
      file: fileForUpload,
    });

    return res.status(200).json({
      fileId: uploaded.id,
      fileName: uploaded.filename,
      bytes: uploaded.bytes,
    });
  } catch (error) {
    console.error("[uploadOpenAI] erro:", error?.response?.data || error);
    return res.status(500).json({
      error: "Falha ao enviar arquivo para a OpenAI.",
      details: error?.response?.data || error?.message,
      status: error?.status || error?.response?.status || 500,
    });
  }
}
