/* eslint-env node */
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
  },
  runtime: "nodejs",
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

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapMedidas(jsonMedidas = {}) {
  const keys = [
    "peso",
    "gordura_corporal",
    "torax",
    "cintura",
    "abdomen",
    "quadril",
    "braco_direito",
    "braco_esquerdo",
    "antebraco_direito",
    "antebraco_esquerdo",
    "coxa_direita",
    "coxa_esquerda",
    "panturrilha_direita",
    "panturrilha_esquerda",
    "ombros",
    "pescoco",
  ];
  return keys.reduce((acc, key) => {
    const val = toNumber(jsonMedidas[key]);
    if (val !== null) acc[key] = val;
    return acc;
  }, {});
}

function mapEvolucao(dados = {}) {
  const m = dados.medidas || {};
  const toNum = toNumber;

  const alturaCm = toNum(dados?.identificacao?.altura_cm);
  const altura = alturaCm ? alturaCm / 100 : null;
  const peso = toNum(m.peso);
  const imc = peso && altura ? Number((peso / (altura * altura)).toFixed(2)) : null;

  return {
    peso,
    gordura_corporal: toNum(m.gordura_corporal),
    cintura: toNum(m.cintura),
    quadril: toNum(m.quadril),
    braco: toNum(m.braco_direito) ?? toNum(m.braco_esquerdo) ?? null,
    braco_direito: toNum(m.braco_direito),
    braco_esquerdo: toNum(m.braco_esquerdo),
    perna: toNum(m.coxa_direita) ?? toNum(m.coxa_esquerda) ?? null,
    perna_direita: toNum(m.coxa_direita),
    perna_esquerda: toNum(m.coxa_esquerda),
    altura: altura ? Number(altura.toFixed(2)) : null,
    imc,
    peito: toNum(m.torax),
    braco_contraido: null,
    massa_magra: null,
    gordura_visceral: null,
    coxa_direita: toNum(m.coxa_direita),
    coxa_esquerda: toNum(m.coxa_esquerda),
    panturrilha_direita: toNum(m.panturrilha_direita),
    panturrilha_esquerda: toNum(m.panturrilha_esquerda),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  try {
    const body = parseBody(req);
    const { usuarioId, dados } = body;

    console.log("[saveAssessment] payload recibo", {
      usuarioId,
      hasDados: Boolean(dados),
      fileOnly: true,
    });

    if (!usuarioId) return res.status(400).json({ error: "usuarioId é obrigatório." });
    if (!dados) return res.status(400).json({ error: "dados (JSON da avaliação) é obrigatório." });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res
        .status(500)
        .json({ error: "Variáveis do Supabase não configuradas (SUPABASE_URL/SERVICE_KEY ou VITE_SUPABASE_URL/KEY)." });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const dataAvaliacao = dados?.identificacao?.data_avaliacao || null;
    const evolucaoPayload = mapEvolucao(dados);

    // evolucao
    const evolucaoInsert = {
      usuario_id: usuarioId,
      data: dataAvaliacao || null,
      ...evolucaoPayload,
    };

    const { data: evo, error: evoError } = await supabase
      .from("evolucao")
      .insert(evolucaoInsert)
      .select("id")
      .single();

    if (evoError) {
      console.error("[saveAssessment] erro evolucao:", evoError);
      throw evoError;
    }

    return res.status(200).json({
      evolucaoId: evo?.id ?? null,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    console.error("[saveAssessment] erro:", error?.response?.data || error);
    return res.status(status).json({
      error: error?.message || "Falha ao salvar avaliação.",
      details: error?.response?.data || null,
      status,
    });
  }
}
