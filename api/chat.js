/* eslint-env node */
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

async function fetchFitnessSnapshot() {
  if (!supabase) {
    return null;
  }

  try {
    const [{ data: workouts }, { data: exercises }, { data: mealPlans }, { data: evolutions }] = await Promise.all([
      supabase
        .from("treinos")
        .select("id, nome, objetivo, nível, destaque")
        .order("atualizado_em", {
          ascending: false,
        })
        .limit(6),
      supabase.from("exercicios").select("id, nome, grupo_muscular").order("atualizado_em", { ascending: false }).limit(6),
      supabase.from("planos_alimentares").select("id, titulo, calorias").order("criado_em", { ascending: false }).limit(4),
      supabase
        .from("evolucoes")
        .select("id, peso, created_at")
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    return {
      workouts: workouts ?? [],
      exercises: exercises ?? [],
      mealPlans: mealPlans ?? [],
      evolutions: evolutions ?? [],
    };
  } catch (error) {
    console.error("[chat] Falha ao consultar snapshot fitness:", error);
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { messages = [], systemPrompt } = request.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: "Envie ao menos uma mensagem." });
    return;
  }

  try {
    const snapshot = await fetchFitnessSnapshot();
    const snapshotSummary = snapshot
      ? `Contexto do app:\n- Treinos ativos: ${snapshot.workouts
          .slice(0, 5)
          .map((workout) => `"${workout.nome}"`)
          .join(", ") || "sem registros"}\n- Exercícios cadastrados: ${snapshot.exercises.length}\n- Planos alimentares: ${
          snapshot.mealPlans.length
        }\n- Registros de evolução: ${snapshot.evolutions.length}`
      : "Contexto indisponível";

    const chatMessages = [
      {
        role: "system",
        content:
          systemPrompt ??
          "Você é o Coach Virtual do MEU SHAPE. Sugira treinos, ajustes de carga, planos alimentares e análises de evolução.",
      },
      {
        role: "system",
        content: snapshotSummary,
      },
      ...messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? "",
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "Não consegui formular uma resposta agora.";
    response.status(200).json({ reply });
  } catch (error) {
    console.error("[chat] Erro ao processar conversa:", error);
    response.status(500).json({ error: "Não foi possível responder no momento." });
  }
}

