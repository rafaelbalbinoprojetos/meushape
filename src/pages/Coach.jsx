import React, { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SAMPLE_COACH_PROMPTS } from "../data/fitness.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const INITIAL_MESSAGE =
  "Ol�! Sou o Coach IA do MEU SHAPE. Posso ajustar seus treinos, rever macros, comparar fotos e sugerir cargas com base no hist�rico.";

export default function CoachPage() {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([{ role: "assistant", content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({
    objective: "Hipertrofia",
    equipment: ["Barra", "Halteres", "Banco"],
    calories: 2600,
  });

  const displayName = useMemo(() => user?.user_metadata?.nome ?? "Atleta", [user]);
  const handlePrompt = (prompt) => {
    setInput(prompt);
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(context, displayName),
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Falha no coach.");
      setMessages((current) => [...current, { role: "assistant", content: data.reply ?? "Sem resposta no momento." }]);
    } catch (error) {
      console.error("[Coach] erro ao enviar mensagem:", error);
      toast.error(error.message);
      setMessages((current) => [...current, { role: "assistant", content: "Ainda n�o consegui responder. Tente novamente." }]);
    } finally {
      setLoading(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-6 rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Contexto r�pido</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Par�metros do coach</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Ajuste algumas vari�veis para guiar as respostas personalizadas.
          </p>
        </div>
        <div className="space-y-4 text-sm">
          <label className="block space-y-1">
            <span className="text-[rgb(var(--text-secondary))]">Objetivo</span>
            <select
              value={context.objective}
              onChange={(event) => setContext((prev) => ({ ...prev, objective: event.target.value }))}
              className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option>Hipertrofia</option>
              <option>Emagrecimento</option>
              <option>Sa�de geral</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[rgb(var(--text-secondary))]">Calorias alvo</span>
            <input
              type="number"
              value={context.calories}
              onChange={(event) => setContext((prev) => ({ ...prev, calories: Number(event.target.value) }))}
              className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[rgb(var(--text-secondary))]">Equipamentos dispon�veis</span>
            <input
              value={context.equipment.join(", ")}
              onChange={(event) =>
                setContext((prev) => ({ ...prev, equipment: event.target.value.split(",").map((item) => item.trim()) }))
              }
              className="w-full rounded-2xl border border-white/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#32C5FF] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
            <p className="text-xs text-[rgb(var(--text-subtle))]">Separe por v�rgulas.</p>
          </label>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Sugest�es</p>
          <div className="mt-3 space-y-3">
            {SAMPLE_COACH_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePrompt(prompt)}
                className="w-full rounded-2xl border border-white/40 px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] transition hover:border-[#32C5FF] hover:text-[#32C5FF]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-[32px] border border-white/10 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Coach virtual</p>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Conversa com IA</h2>
        </header>

        <div className="flex h-[520px] flex-col gap-4 overflow-y-auto rounded-[24px] border border-white/40 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
          ))}
          {loading ? <TypingIndicator /> : null}
          <span ref={bottomRef} aria-hidden />
        </div>

        <form className="mt-6 space-y-3" onSubmit={sendMessage}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte sobre ajustes de treino, macros, descanso ou evolu��o???"
            className="min-h-[120px] w-full rounded-3xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[rgb(var(--text-secondary))]">
            <p>Enviaremos o contexto do {displayName} para respostas mais precisas.</p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-3xl bg-[#0f1f3c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Pensando..." : "Enviar mensagem"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({ role, content }) {
  const isCoach = role === "assistant";
  return (
    <div className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isCoach
            ? "bg-white text-[rgb(var(--text-primary))] dark:bg-slate-800 dark:text-white"
            : "bg-[#0f1f3c] text-white dark:bg-[#32C5FF]/20"
        }`}
      >
        {content.split("\n").map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs text-gray-500 shadow dark:bg-slate-800 dark:text-gray-100">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#32C5FF]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#32C5FF]" style={{ animationDelay: "120ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#32C5FF]" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}

function buildSystemPrompt(context, displayName) {
  return `Voc� � o Coach Virtual do aplicativo MEU SHAPE. Sempre responda em portugu�s, com tom motivador e direto.
Dados do usu�rio:
- Nome: ${displayName}
- Objetivo principal: ${context.objective}
- Calorias alvo: ${context.calories} kcal
- Equipamentos dispon�veis: ${context.equipment.join(", ") || "peso corporal"}

Quando sugerir treinos, informe s�ries, repeti��es, carga sugerida (em % ou RPE) e tempo de descanso.
Quando falar sobre nutri��o, detalhe prote�nas, carboidratos e gorduras.
Indique cuidados de seguran�a e lembre o usu�rio de registrar execu��es.`;
}
