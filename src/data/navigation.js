export const NAV_LINKS = [
  {
    id: "dashboard",
    to: "/",
    label: "Panorama do Shape",
    shortLabel: "Inicio",
    description: "Ultimos treinos, calorias e evolucao",
  },
  {
    id: "workouts",
    to: "/treinos",
    label: "Treinos",
    shortLabel: "Treinos",
    description: "Fichas guiadas, series, videos e cronometro",
  },
  {
    id: "exercises",
    to: "/exercicios",
    label: "Exercicios",
    shortLabel: "Exercicios",
    description: "Catalogo filtravel de exercicios com video e equipamento",
  },
  {
    id: "fichas",
    to: "/fichas",
    label: "Fichas",
    shortLabel: "Fichas",
    description: "Catalogo premium de fichas ja cadastradas",
  },
  {
    id: "nutrition",
    to: "/nutricao",
    label: "Nutricao",
    shortLabel: "Nutricao",
    description: "Calorias diarias, macros e receitas",
  },
  {
    id: "evolution",
    to: "/evolucao",
    label: "Evolucao",
    shortLabel: "Evolucao",
    description: "Peso, medidas, fotos e PRs",
  },
  {
    id: "insights",
    to: "/insights",
    label: "Insights IA",
    shortLabel: "Insights",
    description: "Resumo IA de carga, medidas e alimentacao",
  },
  {
    id: "history",
    to: "/historico",
    label: "Historico",
    shortLabel: "Historico",
    description: "Resumo por treino e analise por exercicio",
  },
  {
    id: "assistant",
    to: "/coach",
    label: "Coach IA",
    shortLabel: "Coach",
    description: "Treinador virtual para treinos e alimentacao",
  },
  {
    id: "feed",
    to: "/feed",
    label: "Feed do Shape",
    shortLabel: "Feed",
    description: "Acompanhe treinos, conquistas e playlists",
  },
  {
    id: "profile",
    to: "/perfil",
    label: "Perfil",
    shortLabel: "Perfil",
    description: "Dados pessoais, preferencias e métricas de treino",
  },
  {
    id: "plan",
    to: "/plano",
    label: "Plano",
    shortLabel: "Plano",
    description: "Assinatura e benefícios premium",
  },
  {
    id: "plan",
    to: "/gestao-assinaturas",
    label: "Gestão Assinaturas",
    shortLabel: "Gestão",
    description: "Conceder permissões e administrar uso de IA",
  },
  {
    id: "energia",
    to: "/energia",
    label: "Energia do Treino",
    shortLabel: "Playlists",
    description: "Playlists inteligentes para aquecer, focar e explodir",
  },
];

const EXTRA_MOBILE_LINKS = [
  {
    id: "ficha-ativa",
    to: "/fichas/ativa",
    label: "Ficha em uso",
    shortLabel: "Ficha",
    description: "Abre rapidamente a ficha que está em uso",
  },
];

export const MOBILE_NAV_ALLOWED_PATHS = [
  "/",
  "/treinos",
  "/exercicios",
  "/fichas",
  "/nutricao",
  "/evolucao",
  "/insights",
  "/historico",
  "/coach",
  "/feed",
  "/perfil",
  "/plano",
  "/energia",
  "/fichas/ativa",
];

export const DEFAULT_MOBILE_NAV_PATHS = ["/", "/treinos", "/coach"];

const MOBILE_CANDIDATES = [...NAV_LINKS, ...EXTRA_MOBILE_LINKS];

export const MOBILE_NAV_LINKS = MOBILE_CANDIDATES.filter((link) => MOBILE_NAV_ALLOWED_PATHS.includes(link.to));

export function sanitizeMobileNavSelection(selection) {
  if (!Array.isArray(selection)) {
    return [];
  }
  const allowedSet = new Set(MOBILE_NAV_ALLOWED_PATHS);
  return MOBILE_NAV_ALLOWED_PATHS.filter((path) => allowedSet.has(path) && selection.includes(path));
}

export function normalizeMobileNavSelection(selection) {
  const sanitized = sanitizeMobileNavSelection(selection);
  if (sanitized.length > 0) {
    return sanitized;
  }
  return DEFAULT_MOBILE_NAV_PATHS;
}
