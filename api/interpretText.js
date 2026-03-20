/* eslint-env node */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
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

const JSON_TEMPLATE = `Você é um sistema especialista em interpretar avaliações físicas, bioimpedância e laudos de academias.
Extraia 100% dos dados (mesmo em imagens, legendas ou tabelas). Se um campo não existir, preencha com null.
Responda apenas JSON puro, sem cercas de código. Use ponto como separador decimal. Datas em YYYY-MM-DD. Se nome for numérico ou igual ao id, retorne nome = null.
Regra de escolha de valores:
- Para cada rótulo, escolha o valor principal de medição (normalmente o número em maior destaque ou logo à direita do rótulo). Ignore faixas/“Padrão:” e ignore números de referência.
- Para composição (Peso, Gordura, Músculo, Água, VIS-Gordura, SUB-Gordura, Peso Livre de Gordura, Proteína, OSSO, Peso Muscular), se houver “Padrão:”, descarte esses números e use apenas o valor do lado do rótulo.
- Se houver mais de um número para o mesmo rótulo, priorize o maior número em destaque e na mesma linha/bloco do rótulo; se ainda ambíguo, escolha o primeiro número após o rótulo.

Estrutura:
{
  "identificacao": {
    "id": string|null,
    "nome": string|null,
    "idade": number|null,
    "sexo": string|null,
    "altura_cm": number|null,
    "data_avaliacao": string|null
  },
  "composicao_corporal": {
    "peso": number|null,
    "gordura_percentual": number|null,
    "musculo_percentual": number|null,
    "agua_percentual": number|null,
    "gordura_visceral": number|null,
    "gordura_subcutanea": number|null,
    "massa_magra": number|null,
    "peso_muscular": number|null,
    "peso_osseo": number|null,
    "proteina_percentual": number|null,
    "peso_livre_gordura": number|null,
    "diferenca_peso": number|null,
    "diferenca_gordura": number|null,
    "diferenca_musculo": number|null
  },
  "composicao_projetos": {
    "peso_normal": string|null,
    "gordura_normal": string|null,
    "musculo_normal": string|null,
    "agua_normal": string|null,
    "peso_livre_gordura_normal": string|null,
    "proteina_normal": string|null,
    "osso_normal": string|null,
    "peso_muscular_normal": string|null
  },
  "analise_segmentar": {
    "braco_direito": { "musculo_kg": number|null, "musculo_percentual": number|null, "gordura_kg": number|null, "gordura_percentual": number|null },
    "braco_esquerdo": { "musculo_kg": number|null, "musculo_percentual": number|null, "gordura_kg": number|null, "gordura_percentual": number|null },
    "tronco": { "musculo_kg": number|null, "musculo_percentual": number|null, "gordura_kg": number|null, "gordura_percentual": number|null },
    "perna_direita": { "musculo_kg": number|null, "musculo_percentual": number|null, "gordura_kg": number|null, "gordura_percentual": number|null },
    "perna_esquerda": { "musculo_kg": number|null, "musculo_percentual": number|null, "gordura_kg": number|null, "gordura_percentual": number|null }
  },
  "obesidade": {
    "imc": number|null,
    "gordura_kg": number|null,
    "cintura_quadril": number|null,
    "cintura_quadril_padrao": string|null,
    "classificacao_corporal": string|null
  },
  "pontuacoes": {
    "pontuacao_saude": number|null,
    "idade_corporal": number|null
  },
  "consumo_calorico": {
    "ingestao_diaria_kcal": number|null,
    "aerobicos_kcal": number|null,
    "resistencia_kcal": number|null,
    "anaerobico_kcal": number|null
  },
  "bioimpedancia_segmento": {
    "braco_direito": { "20khz": number|null, "100khz": number|null },
    "braco_esquerdo": { "20khz": number|null, "100khz": number|null },
    "tronco": { "20khz": number|null, "100khz": number|null },
    "perna_direita": { "20khz": number|null, "100khz": number|null },
    "perna_esquerda": { "20khz": number|null, "100khz": number|null }
  },
  "postura_frontal": {
    "espaco_occipital": number|null,
    "circ_braco": number|null,
    "circ_cintura": number|null,
    "dimensao_coxa": number|null,
    "largura_ombros": number|null,
    "envergadura": number|null,
    "circ_quadril": number|null
  },
  "postura_lateral": {
    "comprimento_cabeca": number|null,
    "tronco_superior": number|null,
    "tronco_inferior": number|null,
    "perna_inferior": number|null,
    "proporcao_cabeca_corpo": number|null,
    "relacao_perna_corpo": number|null,
    "comprimento_coxa": number|null,
    "tamanho_pe": number|null
  },
  "nao_identificado": [
    { "campo": string, "motivo": string }
  ]
}
`;

// Regexes de fallback para extrair valores principais do texto bruto (quando o modelo falha)
const FALLBACK_PATTERNS = {
  peso: /peso\s+(\d+[.,]?\d*)\s*kg/i,
  gordura_percentual: /gordura\s+(\d+[.,]?\d*)\s*%/i,
  musculo_percentual: /m[uú]sculo\s+(\d+[.,]?\d*)\s*%/i,
  agua_percentual: /água\s+(\d+[.,]?\d*)\s*%/i,
  gordura_visceral: /vis-?gordura\s+(\d+[.,]?\d*)/i,
  gordura_subcutanea: /sub-?gordura\s+(\d+[.,]?\d*)\s*%/i,
  peso_livre_gordura: /peso\s+livre\s+de\s+gordura\s+(\d+[.,]?\d*)\s*kg/i,
  proteina_percentual: /prote[ií]na\s+(\d+[.,]?\d*)\s*%/i,
  peso_osseo: /osso\s+(\d+[.,]?\d*)\s*kg/i,
  peso_muscular: /peso\s+muscular\s+(\d+[.,]?\d*)\s*kg/i,
};

function toNumber(str) {
  if (str === null || str === undefined) return null;
  const num = Number(String(str).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function applyFallbacks(rawText, parsedJson) {
  if (!rawText) return parsedJson;
  const target = parsedJson || {
    identificacao: {},
    composicao_corporal: {},
    composicao_projetos: {},
    analise_segmentar: {},
    obesidade: {},
    pontuacoes: {},
    consumo_calorico: {},
    bioimpedancia_segmento: {},
    postura_frontal: {},
    postura_lateral: {},
    nao_identificado: [],
  };

  const comp = target.composicao_corporal || {};
  Object.entries(FALLBACK_PATTERNS).forEach(([key, regex]) => {
    if (comp[key] !== null && comp[key] !== undefined) return;
    const match = rawText.match(regex);
    if (match?.[1]) {
      const num = toNumber(match[1]);
      if (num !== null) {
        comp[key] = num;
      }
    }
  });
  target.composicao_corporal = comp;
  return target;
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
    const { text, fileName = "documento.pdf", userId } = body;
    const model = process.env.OPENAI_INTERPRET_MODEL || "gpt-4o-mini";

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Envie o campo text com o conteúdo extraído." });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para interpretar o arquivo." });
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
          role: "system",
          content: [{ type: "input_text", text: JSON_TEMPLATE }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: `Arquivo: ${fileName}\n\nConteudo:\n${text}` }],
        },
      ],
      max_output_tokens: 2000,
      temperature: 0.2,
    });

    const output = response.output_text || "";
    let cleaned = output.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }
    let json = null;
    try {
      json = JSON.parse(cleaned);
    } catch {
      json = null;
    }

    const finalJson = applyFallbacks(text, json);

    await incrementUsage({
      supabase,
      userId,
      key: "relatorios",
      monthKey: gate.monthKey,
    });

    return res.status(200).json({
      raw: output,
      json: finalJson,
      model,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    console.error("[interpretText] erro:", error?.response?.data || error);
    return res.status(status).json({
      error: error?.response?.data?.error?.message || error?.message || "Falha ao interpretar texto.",
      details: error?.response?.data || null,
      status,
    });
  }
}
