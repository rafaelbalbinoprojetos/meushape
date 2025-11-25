import React from "react";
import { SAMPLE_MEAL_PLAN } from "../data/fitness.js";

export default function NutritionPage() {
  const remaining = Math.max(SAMPLE_MEAL_PLAN.caloriesTarget - SAMPLE_MEAL_PLAN.caloriesConsumed, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#040d1f] via-[#0f1f3c] to-[#122640] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Nutri��o inteligente</p>
        <h1 className="mt-3 text-3xl font-semibold">Planeje macronutrientes e calorias com a mesma precis�o dos treinos.</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Atualize refei��es ao longo do dia e receba sugest�o autom�tica do que comer em seguida para bater prote�na e manter calorias
          sob controle.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Highlight label="Meta di�ria" value={`${SAMPLE_MEAL_PLAN.caloriesTarget} kcal`} detail="Distribua em 4 a 5 refei��es" />
          <Highlight label="Consumido" value={`${SAMPLE_MEAL_PLAN.caloriesConsumed} kcal`} detail="At� agora" />
          <Highlight label="Restante" value={`${remaining} kcal`} detail="Sugest�es ajustadas automaticamente" />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/40 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Macros</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Consumo do dia</h2>
        </header>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <MacroCard label="Prote�na" macro={SAMPLE_MEAL_PLAN.protein} color="from-[#67FF9A] to-[#32C5FF]" />
          <MacroCard label="Carboidratos" macro={SAMPLE_MEAL_PLAN.carbs} color="from-[#32C5FF] to-[#F5B759]" />
          <MacroCard label="Gorduras" macro={SAMPLE_MEAL_PLAN.fats} color="from-[#F5B759] to-[#FF6CAB]" />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/40 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Refei��es</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Plano de hoje</h2>
          </div>
          <button className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-sm font-semibold text-[#32C5FF]">Adicionar refei��o</button>
        </header>
        <div className="mt-6 space-y-4">
          {SAMPLE_MEAL_PLAN.meals.map((meal) => (
            <article
              key={meal.id}
              className="rounded-[28px] border border-white/50 bg-white/70 px-5 py-4 shadow-inner dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{meal.time}</p>
                  <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{meal.title}</h3>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{meal.items.join(" ??? ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Calorias</p>
                  <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{meal.calories} kcal</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-3 text-xs text-[rgb(var(--text-secondary))]">
                <li>
                  <strong>{meal.macros.protein} g</strong> prote�na
                </li>
                <li>
                  <strong>{meal.macros.carbs} g</strong> carboidratos
                </li>
                <li>
                  <strong>{meal.macros.fats} g</strong> gorduras
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-dashed border-[#32C5FF]/30 bg-white/50 p-6 text-sm text-[rgb(var(--text-secondary))] shadow-inner dark:border-white/20 dark:bg-slate-900/40">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Receitas r�pidas</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SAMPLE_MEAL_PLAN.quickRecipes.map((recipe) => (
            <article key={recipe.id} className="rounded-3xl border border-white/60 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <h3 className="text-base font-semibold text-[rgb(var(--text-primary))]">{recipe.name}</h3>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{recipe.time}</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>
                  Prote�na: <strong>{recipe.macros.protein} g</strong>
                </li>
                <li>
                  Carboidrato: <strong>{recipe.macros.carbs} g</strong>
                </li>
                <li>
                  Gordura: <strong>{recipe.macros.fats} g</strong>
                </li>
              </ul>
              <button className="mt-3 w-full rounded-2xl border border-[#32C5FF]/50 px-3 py-2 text-xs font-semibold text-[#32C5FF]">
                Ver instru��es
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Highlight({ label, value, detail }) {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-sm text-white/60">{detail}</p>
    </div>
  );
}

function MacroCard({ label, macro, color }) {
  const percent = Math.min(100, Math.round((macro.current / macro.target) * 100));
  return (
    <article className="rounded-[28px] border border-white/50 bg-white/70 p-5 shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">
        {macro.current}/{macro.target} g
      </p>
      <div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-[rgb(var(--text-secondary))]">{percent}% atingido</p>
    </article>
  );
}
