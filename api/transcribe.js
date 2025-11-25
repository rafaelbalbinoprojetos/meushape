/* eslint-env node */
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { audio, mimeType } = body;

    if (!audio) {
      return res.status(400).json({ error: "Payload de áudio não recebido." });
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
