/* eslint-env node */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
  runtime: "nodejs"
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
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });

    const body = parseBody(req);
    const {
      userId,
      base64,
      mimeType,
      fileName = "arquivo",
      prompt = "Analise este arquivo e descreva os pontos mais importantes.",
      purpose = "default",
      model = process.env.OPENAI_VISION_MODEL || "gpt-4o"
    } = body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Envie base64 e mimeType da imagem." });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para análise por IA." });
    }

    const photoGate = await ensureUsageAllowed({
      supabase,
      userId,
      key: "fotos_analisadas",
      limit: AI_LIMITS_PRO.fotos_analisadas,
    });
    if (!photoGate.ok) {
      return res.status(photoGate.status).json({ error: photoGate.message });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const PURPOSE_PROMPTS = {
      meal: `Analise a imagem enviada.

1. Identifique todos os alimentos presentes.
2. Estime a quantidade em gramas de cada alimento.
3. Calcule o valor nutricional total da refeição.

Retorne SOMENTE um JSON no seguinte formato:
{
  "titulo": "Nome curto da refeição",
  "descricao": "Descrição detalhada dos alimentos identificados",
  "valores_totais": {
    "calorias": 0,
    "proteinas": 0,
    "carboidratos": 0,
    "gorduras": 0
  }
}

Regras:
- Use valores realistas
- Arredonde os valores para inteiros
- Não inclua texto fora do JSON`,
      default: `Você é um coach de fitness. Descreva a imagem em português (postura, exercícios, equipamentos ou pontos relevantes).
Retorne apenas JSON no formato:
{
  "summary": "Resumo em português",
  "tags": ["academia", "equipamento"],
  "detalhes": [{ "tipo": "observacao", "texto": "Ex: pessoa executando agachamento com barra" }]
}`
      ,
      bio: `Extraia os dados de um relatorio de bioimpedancia na imagem.
Retorne APENAS JSON puro, sem cercas de codigo. Use ponto como separador decimal. Datas em YYYY-MM-DD.
Estrutura obrigatoria:
{
  "identificacao": {
    "id": null,
    "nome": null,
    "idade": null,
    "sexo": null,
    "altura_cm": null,
    "data_avaliacao": null
  },
  "composicao_corporal": {
    "peso": null,
    "gordura_percentual": null,
    "musculo_percentual": null,
    "agua_percentual": null,
    "gordura_visceral": null,
    "gordura_subcutanea": null,
    "massa_magra": null,
    "peso_muscular": null,
    "peso_osseo": null,
    "proteina_percentual": null,
    "peso_livre_gordura": null,
    "diferenca_peso": null,
    "diferenca_gordura": null,
    "diferenca_musculo": null
  },
  "analise_segmentar": {
    "braco_direito": { "musculo_kg": null, "gordura_kg": null },
    "braco_esquerdo": { "musculo_kg": null, "gordura_kg": null },
    "tronco": { "musculo_kg": null, "gordura_kg": null },
    "perna_direita": { "musculo_kg": null, "gordura_kg": null },
    "perna_esquerda": { "musculo_kg": null, "gordura_kg": null }
  },
  "obesidade": {
    "imc": null,
    "cintura_quadril": null,
    "classificacao_corporal": null
  },
  "pontuacoes": {
    "pontuacao_saude": null,
    "idade_corporal": null
  },
  "consumo_calorico": {
    "ingestao_diaria_kcal": null,
    "aerobicos_kcal": null,
    "resistencia_kcal": null,
    "anaerobico_kcal": null
  },
  "bioimpedancia_segmento": {
    "braco_direito": { "20khz": null, "100khz": null },
    "braco_esquerdo": { "20khz": null, "100khz": null },
    "tronco": { "20khz": null, "100khz": null },
    "perna_direita": { "20khz": null, "100khz": null },
    "perna_esquerda": { "20khz": null, "100khz": null }
  },
  "postura_frontal": {
    "circ_braco": null,
    "circ_cintura": null,
    "circ_quadril": null
  },
  "nao_identificado": []
}`
    };

    const selectedPrompt = PURPOSE_PROMPTS[purpose] || PURPOSE_PROMPTS.default;
    console.log("[vision] request", { purpose, model, fileName, hasBase64: Boolean(base64), mimeType });
    const dataUrl = base64.startsWith("data:") ? base64 : `data:${mimeType};base64,${base64}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: selectedPrompt
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: `${prompt}\nArquivo: ${fileName}` }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const rawContent = completion.choices?.[0]?.message?.content || "";
    console.log("[vision] rawContent preview", rawContent?.slice?.(0, 400));
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

    let parsedJson = null;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch {
      parsedJson = null;
    }

    if (!parsedJson) {
      return res.status(502).json({ error: "Resposta não veio em JSON.", raw: rawContent });
    }

    await incrementUsage({
      supabase,
      userId,
      key: "fotos_analisadas",
      monthKey: photoGate.monthKey,
    });

    return res.status(200).json({
      raw: rawContent,
      json: parsedJson,
      model
    });

  } catch (err) {
    console.error("[vision] erro:", err);
    return res.status(500).json({
      error: "Falha ao analisar arquivo.",
      details: err?.response?.data || err?.message
    });
  }
}
