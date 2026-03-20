import React, { useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PLAN_LIST } from "../data/plans.js";

export default function PlanPage() {
  const { user } = useAuth();
  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Planos & assinatura</p>
        <h1 className="mt-3 text-3xl font-semibold">Escolha o plano ideal e libere recursos premium.</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Assinantes liberam Coach IA ilimitado, exportação de PDFs, ajustes automáticos de carga e nutrição dinâmica.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Plano atual</p>
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                {metadata.plan ?? "Free"} - {metadata.subscription_tier ?? "sem assinatura"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("meushape:open-plans"))}
              className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-xs font-semibold text-[#32C5FF]"
            >
              Ver planos
            </button>
          </header>
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">
            Assinantes Premium desbloqueiam o Coach IA ilimitado, ajustes automaticos de carga e exportacao de PDFs personalizados.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
            <li>- Treinos ilimitados com videos e execucoes inteligentes.</li>
            <li>- Nutricao dinamica com projecao de macros.</li>
            <li>- Comparacao automatica de fotos com IA.</li>
          </ul>
        </article>

        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Planos MEU SHAPE</p>
          <div className="mt-4 space-y-4">
            {PLAN_LIST.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{plan.name}</p>
                    <p className="text-xs text-[rgb(var(--text-subtle))]">{plan.description}</p>
                  </div>
                  <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                    {plan.price === 0 ? "Free" : `R$ ${plan.price}/mes`}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-[rgb(var(--text-secondary))]">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
