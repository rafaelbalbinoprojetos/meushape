export const DEFAULT_PLAN_ID = "premium";

export const PLAN_DETAILS = {
  starter: {
    id: "starter",
    name: "Shape Base",
    shortName: "Base",
    description: "Fichas essenciais, registro manual e notificações básicas.",
    price: 0,
    currency: "BRL",
    highlight: false,
    reason: "Plano gratuito do MEU SHAPE",
    trialDays: 0,
    features: [
      "Até 3 treinos ativos com séries e tempos pré-configurados",
      "Registro de peso e fotos semanais",
      "Sugestões básicas de refeições e hidratação",
    ],
  },
  premium: {
    id: "premium",
    name: "Shape Pro",
    shortName: "Pro",
    description: "Coach IA ilimitado, nutrição dinâmica e relatórios avançados.",
    price: 29.9,
    currency: "BRL",
    highlight: true,
    reason: "Plano completo do MEU SHAPE",
    trialDays: 7,
    features: [
      "Treinos ilimitados com vídeos, cronômetro inteligente e ajustes automáticos de carga",
      "Plano alimentar com macros recalculados em tempo real e exportação em PDF",
      "Coach virtual ilimitado, insights com IA e comparação automática de fotos",
      "Integração com wearables e relatórios semanais com gráficos de evolução",
    ],
  },
};

export const PLAN_LIST = Object.values(PLAN_DETAILS);
