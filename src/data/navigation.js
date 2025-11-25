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
    id: "assistant",
    to: "/coach",
    label: "Coach IA",
    shortLabel: "Coach",
    description: "Treinador virtual para treinos e alimentacao",
  },
  {
    id: "settings",
    to: "/perfil",
    label: "Perfil & Plano",
    shortLabel: "Perfil",
    description: "Dados pessoais, preferencias e assinatura",
  },
];

export const MOBILE_NAV_ALLOWED_PATHS = ["/", "/treinos", "/exercicios", "/fichas", "/nutricao", "/evolucao", "/coach"];

export const DEFAULT_MOBILE_NAV_PATHS = ["/", "/treinos", "/coach"];

export const MOBILE_NAV_LINKS = NAV_LINKS.filter((link) => MOBILE_NAV_ALLOWED_PATHS.includes(link.to));

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
