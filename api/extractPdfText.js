/* eslint-disable */
const pdf = require("pdf-parse");

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
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST." });
    }

    const body = parseBody(req);
    const { base64 } = body;

    if (!base64) {
      return res.status(400).json({
        error: "Campo 'base64' obrigatório.",
      });
    }

    const cleanBase64 = base64.includes(",")
      ? base64.split(",").pop()
      : base64;

    const buffer = Buffer.from(cleanBase64, "base64");

    const result = await pdf(buffer);

    return res.status(200).json({
      texto: result.text,
      num_paginas: result.numpages,
      info: result.info || null,
    });

  } catch (err) {
    console.error("[extractPdfText] ERRO:", err);
    return res.status(500).json({
      error: "Falha ao extrair texto do PDF",
      details: err.message,
    });
  }
}
