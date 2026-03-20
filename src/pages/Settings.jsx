import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { PLAN_LIST } from "../data/plans.js";
import { MOBILE_NAV_LINKS, normalizeMobileNavSelection } from "../data/navigation.js";
import { supabase } from "../lib/supabase.js";

const MOBILE_NAV_LIMIT = 5;
const AI_LIMITS_PRO = {
  fichas_geradas: 8,
  fotos_analisadas: 186,
  chat_msgs: 300,
  insights: 20,
  relatorios: 10,
};

const buildMonthKey = () => {
  const now = new Date();
  const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  return monthDate.toISOString().slice(0, 10);
};

export default function SettingsPage() {
  const { user, updateUserMetadata } = useAuth();
  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);
  const [profileForm, setProfileForm] = useState(() => ({
    name: metadata.nome ?? user?.email ?? "",
    objective: metadata.objective ?? "Hipertrofia",
    level: metadata.level ?? "Intermediario",
    height: metadata.height_cm ?? "",
    weight: metadata.weight_kg ?? "",
  }));
  const [savingProfile, setSavingProfile] = useState(false);
  const [mobileNavSelection, setMobileNavSelection] = useState(() =>
    normalizeMobileNavSelection(metadata.mobile_nav_paths)
  );
  const [mobileNavSaving, setMobileNavSaving] = useState(false);
  const [aiUsageState, setAiUsageState] = useState({ loading: false, error: null, data: null });
  const aiMonthKey = useMemo(() => buildMonthKey(), []);
  const isPro = useMemo(() => {
    const tier = metadata.subscription_tier ?? metadata.plan ?? "";
    return ["premium", "pro", "shape pro", "shape_pro", "shapepro", "shape-pro"].includes(String(tier).toLowerCase());
  }, [metadata.plan, metadata.subscription_tier]);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserMetadata({
        nome: profileForm.name,
        objective: profileForm.objective,
        level: profileForm.level,
        height_cm: profileForm.height,
        weight_kg: profileForm.weight,
      });
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("[Settings] falha ao salvar perfil:", error);
      toast.error("Nao foi possivel atualizar seus dados agora.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleShortcut = (path) => {
    setMobileNavSelection((prev) => {
      if (prev.includes(path)) {
        return prev.filter((item) => item !== path);
      }
      if (prev.length >= MOBILE_NAV_LIMIT) {
        toast.error(`Escolha no maximo ${MOBILE_NAV_LIMIT} atalhos.`);
        return prev;
      }
      return [...prev, path];
    });
  };

  const handleSaveShortcuts = async (event) => {
    event.preventDefault();
    setMobileNavSaving(true);
    try {
      await updateUserMetadata({ mobile_nav_paths: mobileNavSelection });
      toast.success("Atalhos atualizados!");
    } catch (error) {
      console.error("[Settings] falha ao salvar atalhos:", error);
      toast.error("Nao foi possivel atualizar os atalhos agora.");
    } finally {
      setMobileNavSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadAiUsage() {
      if (!user?.id) {
        setAiUsageState({ loading: false, error: null, data: null });
        return;
      }
      setAiUsageState((prev) => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase
        .from("ai_usage_meushape")
        .select("fichas_geradas, fotos_analisadas, chat_msgs, insights, relatorios")
        .eq("user_id", user.id)
        .eq("month", aiMonthKey)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setAiUsageState({ loading: false, error: error.message, data: null });
        return;
      }
      setAiUsageState({ loading: false, error: null, data });
    }

    loadAiUsage();
    return () => {
      active = false;
    };
  }, [aiMonthKey, user?.id]);

  const aiUsage = aiUsageState.data ?? {
    fichas_geradas: 0,
    fotos_analisadas: 0,
    chat_msgs: 0,
    insights: 0,
    relatorios: 0,
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Perfil & plano</p>
        <h1 className="mt-3 text-3xl font-semibold">Personalize treinos, notificacoes e assinatura.</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Quanto mais contexto voce compartilhar, mais preciso fica o coach, a nutricao automatizada e os ajustes de carga.
        </p>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Dados pessoais</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Bio de treino</h2>
        </header>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveProfile}>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nome</span>
            <input
              value={profileForm.name}
              onChange={(event) => handleProfileChange("name", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Objetivo atual</span>
            <select
              value={profileForm.objective}
              onChange={(event) => handleProfileChange("objective", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Hipertrofia</option>
              <option>Emagrecimento</option>
              <option>Saude geral</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nivel</span>
            <select
              value={profileForm.level}
              onChange={(event) => handleProfileChange("level", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Iniciante</option>
              <option>Intermediario</option>
              <option>Avancado</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Altura (cm)</span>
            <input
              type="number"
              value={profileForm.height}
              onChange={(event) => handleProfileChange("height", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Peso atual (kg)</span>
            <input
              type="number"
              value={profileForm.weight}
              onChange={(event) => handleProfileChange("weight", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-3xl bg-[#0f1f3c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Menu inferior (mobile)</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Atalhos rapidos</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Escolha ate {MOBILE_NAV_LIMIT} atalhos para o menu inferior em celulares. Eles permanecem sempre visiveis.
          </p>
        </header>
        <form className="space-y-6" onSubmit={handleSaveShortcuts}>
          <div className="grid gap-4 md:grid-cols-2">
            {MOBILE_NAV_LINKS.map((link) => {
              const checked = mobileNavSelection.includes(link.to);
              return (
                <label
                  key={link.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-3 transition ${
                    checked
                      ? "border-[#32C5FF] bg-[#32C5FF]/10 text-[#032840]"
                      : "border-white/60 bg-white text-[rgb(var(--text-primary))] dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleShortcut(link.to)}
                    className="mt-1 h-4 w-4 rounded border-2 border-[#32C5FF] text-[#32C5FF] focus:ring-[#32C5FF]"
                  />
                  <div>
                    <p className="text-sm font-semibold">{link.label}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{link.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              {mobileNavSelection.length} / {MOBILE_NAV_LIMIT} atalhos selecionados
            </p>
            <button
              type="submit"
              disabled={mobileNavSaving}
              className="rounded-3xl bg-[#0f1f3c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mobileNavSaving ? "Salvando..." : "Salvar atalhos"}
            </button>
          </div>
        </form>
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

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Uso de IA (mensal)</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Limites do seu plano</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            O ciclo reinicia todo mês. Plano Pro libera limites maiores e uso contínuo.
          </p>
        </header>

        {aiUsageState.loading ? (
          <p className="text-sm text-[rgb(var(--text-secondary))]">Carregando uso do mês...</p>
        ) : null}
        {aiUsageState.error ? (
          <p className="text-sm text-[#FF8F8F]">Não foi possível carregar o uso: {aiUsageState.error}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Fichas inteligentes", key: "fichas_geradas", suffix: "" },
            { label: "Fotos analisadas", key: "fotos_analisadas", suffix: "" },
            { label: "Mensagens no coach", key: "chat_msgs", suffix: "" },
            { label: "Insights IA", key: "insights", suffix: "" },
            { label: "Relatórios/PDF", key: "relatorios", suffix: "" },
          ].map((item) => {
            const limit = AI_LIMITS_PRO[item.key];
            const current = aiUsage[item.key] ?? 0;
            const display =
              isPro ? `${current}/${limit}` : "Disponível no Shape Pro";
            return (
              <div
                key={item.key}
                className="rounded-3xl border border-white/40 bg-white/70 p-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))]">{display}</p>
                {isPro ? (
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    Restante: {Math.max(limit - current, 0)}
                  </p>
                ) : (
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    Faça upgrade para liberar este recurso.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
