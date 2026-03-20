/* eslint-env node */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS_PRO, ensureUsageAllowed, incrementUsage } from "./_utils/aiUsage.js";

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
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

async function fetchImageAsBase64(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Nao foi possivel baixar a imagem gerada.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao suportado." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY nao configurada." });
  }

  try {
    const body = parseBody(req);
    const { fichaNome = "Treino personalizado", fichaDescricao = "", style = "clean", userId } = body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório para gerar thumbnail." });
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
    const styleCatalog = {
      clean: "clean, premium fitness, fundo suave, cores equilibradas",
      cyber: "cyber, detalhes tecnologicos, luzes frias, HUD sutil",
      cyberpunk: "cyberpunk, neon urbano, alto contraste, atmosfera futurista",
      neon: "neon glow, cores vibrantes, alto contraste, luzes coloridas",
      minimal: "minimalista, poucos elementos, foco no personagem, layout limpo",
      anime: "anime moderno, linhas limpas, expressao vibrante",
      cartoon: "cartoon estilizado, traços grossos, cores chapadas",
      ghible: "anime acolhedor inspirado em fantasia, pintura suave",
      pintura: "pintura digital, pinceladas suaves, clima artistico",
      vaporwave: "vaporwave, tons pastel, brilho suave, vibe retro",
      comic: "quadrinhos, contornos marcados, sombras chapadas",
    };
    const resolvedStyle = styleCatalog[style] || styleCatalog.clean;
    const prompt =
      `Thumbnail fitness estilo ${style}. ${resolvedStyle}. ` +
      `Pintura suave aquarela, clima cinematografico, iluminacao quente, cores vibrantes, contraste forte. ` +
      `Academia ao fundo com bokeh, halteres e equipamentos visiveis. ` +
      `Atleta(a) no primeiro plano segurando halter com braco flexionado, postura pos-treino. ` +
      `Adicionar prancheta com titulo "TREINO" e checkmarks, lapis ao lado, raios de energia amarelos. ` +
      `Texto topo: "FICHA DE TREINO" 3D com contorno e sombra. ` +
      `Texto principal: "${fichaNome}" em amarelo com contorno vermelho e sombra forte. ` +
      `Composicao chamativa tipo YouTube fitness, recorte limpo, rim light, sem logos/agua. ` +
      `Basear tema no nome e descricao: ${fichaNome}. ${fichaDescricao || ""}`;

    const tryGenerate = async (model, size) =>
      openai.images.generate({
        model,
        prompt,
        size,
      });

    const primaryModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const fallbackModel = "dall-e-2";
    let result;
    let usedModel = primaryModel;
    try {
      const size = primaryModel === "gpt-image-1" ? "1536x1024" : "1024x1024";
      result = await tryGenerate(primaryModel, size);
    } catch (error) {
      const message = String(error?.response?.data?.error?.message || error?.message || "");
      const shouldFallback =
        primaryModel !== fallbackModel &&
        (message.includes("must be verified") || message.includes("model") || message.includes("not found"));
      if (!shouldFallback) {
        throw error;
      }
      usedModel = fallbackModel;
      result = await tryGenerate(fallbackModel, "1024x1024");
    }

    let base64 = result?.data?.[0]?.b64_json;
    if (!base64 && result?.data?.[0]?.url) {
      base64 = await fetchImageAsBase64(result.data[0].url);
    }
    if (!base64) {
      return res.status(502).json({ error: "Resposta da IA sem imagem." });
    }

    await incrementUsage({
      supabase,
      userId,
      key: "relatorios",
      monthKey: gate.monthKey,
    });

    return res.status(200).json({
      base64,
      mimeType: "image/png",
      model: usedModel,
    });
  } catch (error) {
    console.error("[generateThumbnail] erro:", error?.response?.data || error);
    return res.status(500).json({
      error: "Falha ao gerar thumbnail.",
      details: error?.response?.data || error?.message,
    });
  }
}
