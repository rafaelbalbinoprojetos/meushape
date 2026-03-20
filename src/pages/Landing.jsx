import React, { useMemo } from "react";

const PROBLEMS = [
  {
    title: "Treinos sem confirmacao de evolucao",
    description: "Voce treina, mas nao sabe se o volume e a carga estao avancando de verdade.",
  },
  {
    title: "Historico perdido ou fragmentado",
    description: "Sem registro confiavel, fica impossivel repetir o que funcionou.",
  },
  {
    title: "Nutricao desconectada do treino",
    description: "Macros estaticas nao acompanham o seu esforco e sua rotina muda.",
  },
  {
    title: "Apps que so registram",
    description: "Dados entram, mas quase nenhum insight sai.",
  },
  {
    title: "Falta de feedback real",
    description: "Sem analise, e facil seguir no piloto automatico.",
  },
];

const SOLUTION_PILLARS = [
  {
    label: "Registro inteligente",
    description: "Automatico ou manual, com consistencia e detalhes por exercicio.",
  },
  {
    label: "Treinos guiados",
    description: "Execucao com video, controle de descanso e progressao segura.",
  },
  {
    label: "Nutricao viva",
    description: "Macros ajustaveis e alinhadas ao esforco do dia.",
  },
  {
    label: "IA contextual",
    description: "Entende seu historico, le seus dados e responde com contexto.",
  },
  {
    label: "Insights acionaveis",
    description: "Resumos e comparativos que transformam dados em decisoes.",
  },
];

const FEATURES = [
  {
    title: "Treinos inteligentes",
    items: [
      "Fichas personalizadas A/B/C",
      "Cronometro de descanso inteligente",
      "Sugestao automatica de carga",
      "Registro de series, reps e volume",
    ],
    benefit: "Voce sabe exatamente quanto evoluiu em carga, volume e consistencia.",
  },
  {
    title: "Evolucao e historico",
    items: [
      "Historico completo de treinos realizados",
      "Volume total por treino e por periodo",
      "PRs automaticos",
      "Comparativos semanais e mensais",
    ],
    benefit: "Nada fica no achismo. Sua evolucao aparece em numeros claros.",
  },
  {
    title: "Nutricao dinamica",
    items: [
      "Registro de refeicoes",
      "Macros com barras de progresso",
      "Ajuste automatico baseado no treino do dia",
      "Historico alimentar e medias",
    ],
    benefit: "A alimentacao acompanha seu treino, nao o contrario.",
  },
  {
    title: "Coach IA",
    items: [
      "Chat com contexto pessoal",
      "Sugestoes de treino e nutricao",
      "Analise de refeicoes, fotos e PDFs",
      "Insights baseados no seu historico real",
    ],
    benefit: "Voce recebe orientacao com base nos seus dados, nao em receitas genericas.",
  },
  {
    title: "Insights inteligentes",
    items: [
      "Resumos automaticos por periodo",
      "Destaques de evolucao de carga",
      "Mudancas corporais interpretadas",
      "Exportacao em PDF",
    ],
    benefit: "Voce entende o que funcionou e onde ajustar, sem ruido.",
  },
];

const PLAN_FEATURES = [
  { label: "Registro de treinos", base: true, pro: true },
  { label: "Fichas basicas", base: true, pro: true },
  { label: "Historico simples", base: true, pro: true },
  { label: "Videos de exercicios", base: false, pro: true },
  { label: "Cronometro inteligente", base: false, pro: true },
  { label: "Sugestao automatica de carga", base: false, pro: true },
  { label: "Nutricao dinamica com IA", base: false, pro: true },
  { label: "Coach IA ilimitado", base: false, pro: true },
  { label: "Insights por periodo", base: false, pro: true },
  { label: "Comparacao corporal", base: false, pro: true },
  { label: "Exportacao PDF", base: false, pro: true },
  { label: "Integracao com wearables", base: false, pro: true },
];

export default function LandingPage() {
  const planRows = useMemo(() => PLAN_FEATURES, []);

  const handleStartTrial = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("meushape:open-plans"));
    }
  };

  return (
    <div className="space-y-16 pb-10">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-8 text-white shadow-2xl lg:p-12">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 18% 20%, rgba(50, 197, 255, 0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(103, 255, 154, 0.28), transparent 45%)",
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">MEU SHAPE</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-5xl font-display">
            Evolua com dados reais, nao com achismo.
            <span className="block text-white/80">
              Treinos, nutricao e insights que se adaptam ao seu corpo.
            </span>
          </h1>
          <p className="mt-5 text-base text-[rgb(var(--text-secondary))] md:text-lg dark:text-white/75">
            O MEU SHAPE conecta treino, alimentacao e inteligencia artificial para mostrar, com numeros, como seu corpo
            evolui ao longo do tempo.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-[rgb(var(--text-subtle))] dark:text-white/55">
            Construido com base em principios de treinamento, nutricao e analise de dados aplicados a evolucao fisica real.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleStartTrial}
              className="rounded-2xl bg-[#32C5FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-[#0F1F3C]"
            >
              Comecar teste gratuito de 7 dias
            </button>
            <a
              href="#planos"
              className="rounded-2xl border border-[rgb(var(--border-subtle))] px-6 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--text-secondary))] dark:border-white/30 dark:text-white/90 dark:hover:border-white/60"
            >
              Ver comparacao de planos
            </a>
          </div>
          <p className="mt-4 text-xs text-white/60">Sem cartao durante o teste. Cancele quando quiser.</p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">O problema</p>
          <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
            Treinar sem dados e repetir esforco sem direcao.
          </h2>
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))] md:text-base">
            O que trava sua evolucao nao e falta de esforco, e falta de leitura do que esta funcionando. Sem historico,
            sem analise e sem conexao entre treino e nutricao, o progresso fica lento e invisivel.
          </p>
        </div>
        <div className="grid gap-4">
          {PROBLEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/30 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70"
            >
              <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</h3>
              <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/20 bg-white/85 p-8 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">A solucao MEU SHAPE</p>
            <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
              Um ecossistema inteligente para evoluir com dados reais.
            </h2>
            <p className="mt-4 text-sm text-[rgb(var(--text-secondary))] md:text-base">
              O MEU SHAPE integra treino, nutricao e historico com inteligencia artificial para entregar respostas
              objetivas: quanto voce evoluiu, o que precisa ajustar e onde esta sua melhor janela de progresso.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOLUTION_PILLARS.map((pillar) => (
              <div
                key={pillar.label}
                className="rounded-2xl border border-white/20 bg-white/90 p-4 text-sm text-[rgb(var(--text-secondary))] shadow-sm dark:border-white/10 dark:bg-slate-900/70"
              >
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{pillar.label}</p>
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">
            Funcionalidades com impacto
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
            Cada modulo entrega beneficios que voce consegue medir.
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[26px] border border-white/30 bg-white/85 p-6 shadow-md dark:border-white/10 dark:bg-slate-900/70"
            >
              <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{feature.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--text-secondary))]">
                {feature.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 flex-none rounded-full bg-[#32C5FF]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-2xl border border-[#32C5FF]/25 bg-[#32C5FF]/10 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))] dark:border-white/10 dark:bg-white/5">
                {feature.benefit}
              </p>
            </article>
          ))}
        </div>
        <div className="rounded-[24px] border border-white/20 bg-white/85 p-6 text-sm text-[rgb(var(--text-secondary))] shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">
            Individualidade em primeiro lugar
          </p>
          <p className="mt-3 text-sm text-[rgb(var(--text-secondary))] md:text-base">
            O MEU SHAPE considera historico, limitacoes fisicas, restricoes alimentares, alergias e preferencias pessoais
            para orientar treino e nutricao com responsabilidade.
          </p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Para quem e</p>
          <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
            Pensado para quem leva a evolucao a serio.
          </h2>
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))] md:text-base">
            Do primeiro treino a progressao avancada, com execucao guiada, dados reais e historico continuo.
          </p>
        </div>
        <div className="grid gap-4">
          {[
            "Quer treinar com metodo, mesmo comecando agora",
            "Ja treina e quer parar de repetir erros invisiveis",
            "Precisa de fichas guiadas com videos e execucao correta",
            "Quer nutricao e treino ajustados as suas caracteristicas pessoais",
            "Valoriza dados claros, historico real e decisoes conscientes",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/30 bg-white/80 p-4 text-sm text-[rgb(var(--text-secondary))] shadow-sm dark:border-white/10 dark:bg-slate-900/70"
            >
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Comparacao de planos</p>
          <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
            O plano gratuito e o comeco. O Shape Pro e onde os dados viram evolucao.
          </h2>
        </div>
        <div className="overflow-x-auto rounded-[28px] border border-white/20 bg-white/90 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/20 text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">
              <tr>
                <th className="px-6 py-4">Recurso</th>
                <th className="px-6 py-4">Shape Base</th>
                <th className="px-6 py-4">Shape Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15 text-[rgb(var(--text-secondary))]">
              {planRows.map((row) => (
                <tr key={row.label}>
                  <td className="px-6 py-4 font-medium text-[rgb(var(--text-primary))]">{row.label}</td>
                  <td className="px-6 py-4">{row.base ? "Sim" : "-"}</td>
                  <td className="px-6 py-4">{row.pro ? "Sim" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Prova visual</p>
          <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--text-primary))] md:text-3xl font-display">
            Veja sua evolucao de forma clara, organizada e automatica.
          </h2>
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))] md:text-base">
            Use prints reais do app para mostrar a leitura de dados e a evolucao corporal. Esses exemplos destacam onde o
            MEU SHAPE entrega valor: insights, volume, nutricao e comparativos visuais.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Tela de insights",
              description: "Entenda o que evoluiu, o que estagnou e onde ajustar.",
            },
            {
              title: "Volume total de treino",
              description: "Compare semanas, meses e blocos de treino com dados reais.",
            },
            {
              title: "Nutricao com macros",
              description: "A alimentacao se ajusta ao treino — nao o contrario.",
            },
            {
              title: "Decisao orientada por dados",
              description: "Treine, ajuste e evolua com base em historico real, nao em sensacao.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-white/20 bg-white/85 p-4 text-sm text-[rgb(var(--text-secondary))] shadow-sm dark:border-white/10 dark:bg-slate-900/70"
            >
              <div>
                <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">{card.title}</p>
                <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-8 text-white shadow-2xl lg:p-12">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Pronto para evoluir</p>
          <h2 className="mt-3 text-2xl font-semibold text-white md:text-4xl font-display">
            Voce nao precisa treinar mais. Precisa treinar com informacao.
          </h2>
          <p className="mt-4 text-sm text-white/70 md:text-base">
            Teste o Shape Pro e veja seu corpo evoluir com dados reais, consistencia e inteligencia aplicada ao seu
            historico.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleStartTrial}
              className="rounded-2xl bg-[#32C5FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-[#0F1F3C]"
            >
              Comecar teste gratuito de 7 dias
            </button>
            <span className="text-xs text-white/60">Sem cartao durante o teste. Cancele quando quiser.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
