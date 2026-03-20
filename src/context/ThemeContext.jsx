import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "meushape:theme:v1";
const DEFAULT_LIGHT_THEME = "shape-day";
const DEFAULT_DARK_THEME = "shape-night";

const ThemeContext = createContext({
  theme: null,
  themeId: DEFAULT_LIGHT_THEME,
  isDark: false,
  themes: [],
  selectTheme: () => {},
  toggleTheme: () => {},
});

function hexToRgbTuple(hex) {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

function createThemePreset({ id, name, description, mode, preview, colors }) {
  const variables = {
    "--color-accent-primary": hexToRgbTuple(colors.accent),
    "--color-accent-light": hexToRgbTuple(colors.accentLight ?? colors.accent),
    "--color-accent-dark": hexToRgbTuple(colors.accentDark ?? colors.accent),
    "--color-secondary-primary": hexToRgbTuple(colors.secondary ?? colors.accent),
    "--color-secondary-light": hexToRgbTuple(colors.secondaryLight ?? colors.secondary ?? colors.accent),
    "--color-secondary-dark": hexToRgbTuple(colors.secondaryDark ?? colors.secondary ?? colors.accent),
    "--color-tertiary-primary": hexToRgbTuple(colors.tertiary ?? colors.accent),
    "--color-tertiary-light": hexToRgbTuple(colors.tertiaryLight ?? colors.tertiary ?? colors.accent),
    "--color-tertiary-dark": hexToRgbTuple(colors.tertiaryDark ?? colors.tertiary ?? colors.accent),
    "--surface-base": colors.surfaceBase,
    "--surface-card": colors.surfaceCard,
    "--surface-muted": colors.surfaceMuted,
    "--border-soft": colors.borderSoft,
    "--border-strong": colors.borderStrong,
    "--text-primary": colors.textPrimary,
    "--text-secondary": colors.textSecondary,
    "--text-subtle": colors.textSubtle,
    "--shadow-sm": colors.shadowSm ?? "0 12px 24px -14px rgba(15, 23, 42, 0.18)",
    "--shadow-md": colors.shadowMd ?? "0 45px 85px -45px rgba(15, 23, 42, 0.25)",
    "--shadow-lg": colors.shadowLg ?? "0 90px 160px -80px rgba(15, 23, 42, 0.3)",
    "--ring-glow": colors.ringGlow ?? "0 0 0 3px rgba(15, 23, 42, 0.25)",
    "--surface-gradient": colors.surfaceGradient ?? "none",
    "--radius-sm": colors.radiusSm ?? "12px",
    "--radius-md": colors.radiusMd ?? "18px",
    "--radius-lg": colors.radiusLg ?? "26px",
    "--card-opacity": colors.cardOpacity ?? "1",
    "--card-blur": colors.cardBlur ?? "0px",
    "--card-border-highlight": colors.cardBorderHighlight ?? "rgba(255,255,255,0.06)",
    "--card-elevation": colors.cardElevation ?? "0 0 #0000",
    "--ui-contrast": colors.uiContrast ?? "1",
    "--noise-opacity": colors.noiseOpacity ?? "0",
    "--text-tracking": colors.textTracking ?? "0.02em",
    "--title-weight": colors.titleWeight ?? "600",
    "--ui-density": colors.uiDensity ?? "1",
  };

  return { id, name, description, mode, preview, variables };
}

const THEME_PRESETS = [
  createThemePreset({
    id: "shape-day",
    name: "Shape Day",
    description: "Azul elétrico com toques neon para sessões energéticas em ambientes claros.",
    mode: "light",
    preview: ["#32C5FF", "#67FF9A", "#F5F7FB", "#0F1F3C", "#F5B759"],
    colors: {
      accent: "#32C5FF",
      accentLight: "#67E0FF",
      accentDark: "#0F9BD4",
      secondary: "#67FF9A",
      tertiary: "#F5B759",
      surfaceBase: "245 248 252",
      surfaceCard: "255 255 255",
      surfaceMuted: "232 240 248",
      borderSoft: "rgba(15,31,60,0.08)",
      borderStrong: "rgba(15,31,60,0.18)",
      textPrimary: "15 31 60",
      textSecondary: "60 78 102",
      textSubtle: "113 132 161",
      surfaceGradient:
        "radial-gradient(circle at 15% 10%, rgba(103,255,154,0.25), transparent 55%), radial-gradient(circle at 85% -10%, rgba(50,197,255,0.25), transparent 60%), linear-gradient(155deg, rgba(255,255,255,0.9), rgba(245,247,251,0.9))",
      shadowSm: "0 20px 40px -30px rgba(15,31,60,0.35)",
      shadowMd: "0 60px 120px -70px rgba(15,31,60,0.35)",
      shadowLg: "0 140px 220px -110px rgba(50,197,255,0.3)",
      ringGlow: "0 0 0 3px rgba(50,197,255,0.3)",
      cardOpacity: "0.95",
      cardBlur: "6px",
      cardBorderHighlight: "rgba(50,197,255,0.12)",
      radiusLg: "28px",
      titleWeight: "600",
      uiDensity: "1",
    },
  }),
  createThemePreset({
    id: "shape-glass-night",
    name: "Glass Night",
    description: "Futurista: cards glass + blur + brilho leve.",
    mode: "dark",
    preview: ["#0B1020", "#1B2A55", "#67FF9A", "#32C5FF", "#F5B759"],
    colors: {
      accent: "#67FF9A",
      secondary: "#32C5FF",
      tertiary: "#F5B759",
      surfaceBase: "6 10 20",
      surfaceCard: "18 28 52",
      surfaceMuted: "14 22 40",
      borderSoft: "rgba(255,255,255,0.08)",
      borderStrong: "rgba(103,255,154,0.22)",
      textPrimary: "235 245 255",
      textSecondary: "175 195 220",
      textSubtle: "120 145 180",
      cardOpacity: "0.55",
      cardBlur: "18px",
      cardBorderHighlight: "rgba(255,255,255,0.10)",
      radiusLg: "28px",
      uiContrast: "1",
      noiseOpacity: "0.06",
      surfaceGradient:
        "radial-gradient(circle at 12% 10%, rgba(50,197,255,0.25), transparent 60%), radial-gradient(circle at 85% 0%, rgba(103,255,154,0.18), transparent 60%), linear-gradient(160deg, rgba(6,10,20,0.95), rgba(10,16,34,0.95))",
      shadowSm: "0 28px 70px -45px rgba(0,0,0,0.85)",
      ringGlow: "0 0 0 3px rgba(50,197,255,0.28)",
      titleWeight: "700",
      uiDensity: "1.05",
    },
  }),
  createThemePreset({
    id: "shape-solid-clean",
    name: "Solid Clean",
    description: "Enterprise clean: solido, minimo, super legivel.",
    mode: "light",
    preview: ["#0EA5E9", "#22C55E", "#FFFFFF", "#0F172A", "#E2E8F0"],
    colors: {
      accent: "#0EA5E9",
      secondary: "#22C55E",
      tertiary: "#0EA5E9",
      surfaceBase: "255 255 255",
      surfaceCard: "255 255 255",
      surfaceMuted: "241 245 249",
      borderSoft: "rgba(15,23,42,0.08)",
      borderStrong: "rgba(15,23,42,0.14)",
      textPrimary: "15 23 42",
      textSecondary: "71 85 105",
      textSubtle: "148 163 184",
      cardOpacity: "1",
      cardBlur: "0px",
      cardBorderHighlight: "rgba(0,0,0,0)",
      radiusLg: "20px",
      uiContrast: "0.9",
      noiseOpacity: "0",
      surfaceGradient: "none",
      shadowSm: "0 10px 30px -22px rgba(15,23,42,0.12)",
      ringGlow: "0 0 0 3px rgba(14,165,233,0.18)",
      titleWeight: "600",
      uiDensity: "0.95",
    },
  }),
  createThemePreset({
    id: "shape-solid-clean-pro",
    name: "Solid Clean Pro",
    description: "Enterprise clean: solido, minimo, super legivel.",
    mode: "light",
    preview: ["#0EA5E9", "#22C55E", "#FFFFFF", "#0F172A", "#E2E8F0"],
    colors: {
      accent: "#0EA5E9",
      accentLight: "#38BDF8",
      accentDark: "#0284C7",
      secondary: "#22C55E",
      tertiary: "#F59E0B",
      surfaceBase: "255 255 255",
      surfaceCard: "255 255 255",
      surfaceMuted: "241 245 249",
      borderSoft: "rgba(15,23,42,0.08)",
      borderStrong: "rgba(15,23,42,0.14)",
      textPrimary: "15 23 42",
      textSecondary: "71 85 105",
      textSubtle: "148 163 184",
      cardOpacity: "1",
      cardBlur: "0px",
      cardBorderHighlight: "rgba(0,0,0,0)",
      radiusLg: "20px",
      uiContrast: "0.95",
      uiDensity: "1.02",
      noiseOpacity: "0",
      surfaceGradient: "none",
      shadowSm: "0 10px 30px -22px rgba(15,23,42,0.12)",
      shadowMd: "0 35px 80px -60px rgba(15,23,42,0.14)",
      shadowLg: "0 120px 220px -160px rgba(15,23,42,0.18)",
      ringGlow: "0 0 0 3px rgba(14,165,233,0.18)",
    },
  }),
  createThemePreset({
    id: "shape-paper-warm",
    name: "Paper Warm",
    description: "Editorial: calor suave, contraste tipografico.",
    mode: "light",
    preview: ["#B45309", "#F59E0B", "#FFF7ED", "#1F2937", "#F3E8D3"],
    colors: {
      accent: "#B45309",
      secondary: "#F59E0B",
      tertiary: "#D97706",
      surfaceBase: "255 247 237",
      surfaceCard: "255 252 247",
      surfaceMuted: "243 232 211",
      borderSoft: "rgba(120,71,20,0.12)",
      borderStrong: "rgba(120,71,20,0.2)",
      textPrimary: "31 41 55",
      textSecondary: "75 85 99",
      textSubtle: "120 113 108",
      cardOpacity: "1",
      cardBlur: "0px",
      cardBorderHighlight: "rgba(120,71,20,0.08)",
      radiusLg: "22px",
      uiContrast: "0.95",
      noiseOpacity: "0.08",
      surfaceGradient:
        "radial-gradient(circle at 10% 0%, rgba(245,158,11,0.12), transparent 55%), linear-gradient(160deg, rgba(255,247,237,0.98), rgba(255,252,247,0.98))",
      shadowSm: "0 12px 28px -20px rgba(120,71,20,0.2)",
      ringGlow: "0 0 0 3px rgba(245,158,11,0.2)",
      textTracking: "0.04em",
      titleWeight: "700",
      uiDensity: "1.05",
    },
  }),
  createThemePreset({
    id: "shape-blush",
    name: "Shape Blush",
    description: "Paleta rosa pastel e brilho perolado para rotinas suaves em ambientes claros.",
    mode: "light",
    preview: ["#FF6FB7", "#FFB8DE", "#FFF5FA", "#C54586", "#FFD3E8"],
    colors: {
      accent: "#FF6FB7",
      accentLight: "#FFC1E1",
      accentDark: "#C54586",
      secondary: "#FFB8DE",
      tertiary: "#FFD3E8",
      surfaceBase: "255 245 250",
      surfaceCard: "255 255 255",
      surfaceMuted: "252 228 238",
      borderSoft: "rgba(197,69,134,0.15)",
      borderStrong: "rgba(197,69,134,0.3)",
      textPrimary: "74 15 49",
      textSecondary: "132 47 95",
      textSubtle: "173 88 133",
      surfaceGradient:
        "radial-gradient(circle at 18% 5%, rgba(255,206,229,0.4), transparent 55%), radial-gradient(circle at 80% -5%, rgba(255,111,183,0.3), transparent 60%), linear-gradient(150deg, rgba(255,255,255,0.95), rgba(255,245,250,0.9))",
      shadowSm: "0 20px 45px -30px rgba(197,69,134,0.35)",
      shadowMd: "0 60px 120px -70px rgba(197,69,134,0.35)",
      shadowLg: "0 140px 220px -110px rgba(255,111,183,0.3)",
      ringGlow: "0 0 0 3px rgba(255,111,183,0.35)",
    },
  }),
  createThemePreset({
    id: "clean-health",
    name: "Clean Health",
    description: "Clínico, premium e organizado para transmitir confiança.",
    mode: "light",
    preview: ["#2563EB", "#22C55E", "#F8FAFC", "#0F172A", "#1E293B"],
    colors: {
      accent: "#2563EB",
      accentLight: "#3B82F6",
      accentDark: "#1E3A8A",
      secondary: "#22C55E",
      tertiary: "#22C55E",
      surfaceBase: "248 250 252",
      surfaceCard: "255 255 255",
      surfaceMuted: "241 245 249",
      borderSoft: "rgba(15,23,42,0.08)",
      borderStrong: "rgba(37,99,235,0.18)",
      textPrimary: "15 23 42",
      textSecondary: "71 85 105",
      textSubtle: "148 163 184",
      surfaceGradient:
        "radial-gradient(circle at 10% 5%, rgba(37,99,235,0.08), transparent 55%), radial-gradient(circle at 85% -5%, rgba(34,197,94,0.08), transparent 55%), linear-gradient(165deg, rgba(255,255,255,0.94), rgba(248,250,252,0.96))",
      shadowSm: "0 18px 44px -28px rgba(15,23,42,0.12)",
      shadowMd: "0 55px 95px -70px rgba(15,23,42,0.15)",
      shadowLg: "0 140px 240px -140px rgba(15,23,42,0.18)",
      ringGlow: "0 0 0 3px rgba(37,99,235,0.18)",
    },
  }),
  createThemePreset({
    id: "shape-night",
    name: "Shape Night",
    description: "Gradiente midnight com neon verde para treinos noturnos.",
    mode: "dark",
    preview: ["#050914", "#0F1F3C", "#67FF9A", "#32C5FF", "#F5B759"],
    colors: {
      accent: "#67FF9A",
      accentLight: "#A1FFC7",
      accentDark: "#1CB567",
      secondary: "#32C5FF",
      tertiary: "#F5B759",
      surfaceBase: "5 9 20",
      surfaceCard: "12 24 46",
      surfaceMuted: "18 35 62",
      borderSoft: "rgba(50,197,255,0.12)",
      borderStrong: "rgba(103,255,154,0.25)",
      textPrimary: "230 244 255",
      textSecondary: "172 191 214",
      textSubtle: "125 147 176",
      surfaceGradient:
        "radial-gradient(circle at 20% 0%, rgba(50,197,255,0.35), transparent 60%), radial-gradient(circle at 85% -10%, rgba(103,255,154,0.25), transparent 60%), linear-gradient(160deg, rgba(5,9,20,0.95), rgba(8,13,28,0.95))",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.8)",
      shadowMd: "0 80px 140px -90px rgba(3,6,14,0.9)",
      shadowLg: "0 140px 260px -120px rgba(17,31,59,0.85)",
      ringGlow: "0 0 0 3px rgba(103,255,154,0.35)",
      cardOpacity: "0.75",
      cardBlur: "8px",
      cardBorderHighlight: "rgba(103,255,154,0.12)",
      radiusLg: "26px",
      titleWeight: "600",
      uiDensity: "1",
    },
  }),
  createThemePreset({
    id: "shape-glass-night-pro",
    name: "Glass Night Pro",
    description: "Premium futurista: cards glass + blur + brilho leve.",
    mode: "dark",
    preview: ["#0B1020", "#1B2A55", "#67FF9A", "#32C5FF", "#F5B759"],
    colors: {
      accent: "#67FF9A",
      accentLight: "#A1FFC7",
      accentDark: "#1CB567",
      secondary: "#32C5FF",
      tertiary: "#F5B759",
      surfaceBase: "6 10 20",
      surfaceCard: "18 28 52",
      surfaceMuted: "14 22 40",
      borderSoft: "rgba(255,255,255,0.08)",
      borderStrong: "rgba(103,255,154,0.22)",
      textPrimary: "235 245 255",
      textSecondary: "175 195 220",
      textSubtle: "120 145 180",
      cardOpacity: "0.55",
      cardBlur: "18px",
      cardBorderHighlight: "rgba(255,255,255,0.12)",
      radiusLg: "28px",
      uiContrast: "1.05",
      uiDensity: "1",
      noiseOpacity: "0.05",
      surfaceGradient:
        "radial-gradient(circle at 12% 10%, rgba(50,197,255,0.25), transparent 60%), radial-gradient(circle at 85% 0%, rgba(103,255,154,0.18), transparent 60%), linear-gradient(160deg, rgba(6,10,20,0.96), rgba(10,16,34,0.96))",
      shadowSm: "0 28px 70px -45px rgba(0,0,0,0.85)",
      shadowMd: "0 90px 160px -110px rgba(0,0,0,0.85)",
      shadowLg: "0 160px 300px -160px rgba(0,0,0,0.9)",
      ringGlow: "0 0 0 3px rgba(50,197,255,0.28)",
    },
  }),
  createThemePreset({
    id: "performance-dark",
    name: "Performance Dark",
    description: "Azul técnico com verde performance e acentos ciano para foco total no resultado.",
    mode: "dark",
    preview: ["#0F172A", "#020617", "#22C55E", "#38BDF8", "#FACC15"],
    colors: {
      accent: "#22C55E",
      accentLight: "#4ADE80",
      accentDark: "#16A34A",
      secondary: "#38BDF8",
      tertiary: "#FACC15",
      surfaceBase: "15 23 42",
      surfaceCard: "2 6 23",
      surfaceMuted: "23 34 56",
      borderSoft: "rgba(56,189,248,0.12)",
      borderStrong: "rgba(34,197,94,0.3)",
      textPrimary: "229 231 235",
      textSecondary: "148 163 184",
      textSubtle: "100 116 139",
      surfaceGradient:
        "radial-gradient(circle at 18% -5%, rgba(56,189,248,0.25), transparent 60%), radial-gradient(circle at 88% -8%, rgba(34,197,94,0.22), transparent 55%), linear-gradient(160deg, rgba(2,6,23,0.96), rgba(15,23,42,0.96))",
      shadowSm: "0 22px 52px -32px rgba(0,0,0,0.6)",
      shadowMd: "0 80px 150px -95px rgba(0,0,0,0.7)",
      shadowLg: "0 160px 280px -150px rgba(0,0,0,0.8)",
      ringGlow: "0 0 0 3px rgba(56,189,248,0.35)",
      cardOpacity: "0.85",
      cardBlur: "4px",
      cardBorderHighlight: "rgba(56,189,248,0.15)",
      radiusLg: "24px",
      titleWeight: "600",
    },
  }),
  createThemePreset({
    id: "shape-velvet",
    name: "Shape Velvet",
    description: "Roxo escuro com neon rosa para sessões noturnas cheias de atitude.",
    mode: "dark",
    preview: ["#140618", "#220E2C", "#FF8ADB", "#C13C8C", "#FF6FB7"],
    colors: {
      accent: "#FF8ADB",
      accentLight: "#FFC4F0",
      accentDark: "#C13C8C",
      secondary: "#FF6FB7",
      tertiary: "#FFCFEB",
      surfaceBase: "20 6 24",
      surfaceCard: "34 14 44",
      surfaceMuted: "54 22 66",
      borderSoft: "rgba(255,138,219,0.15)",
      borderStrong: "rgba(255,138,219,0.4)",
      textPrimary: "249 223 244",
      textSecondary: "212 171 208",
      textSubtle: "167 120 165",
      surfaceGradient:
        "radial-gradient(circle at 22% -5%, rgba(255,111,183,0.3), transparent 55%), radial-gradient(circle at 90% 5%, rgba(193,60,140,0.35), transparent 60%), linear-gradient(160deg, rgba(10,2,15,0.95), rgba(20,6,24,0.95))",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.85)",
      shadowMd: "0 80px 150px -90px rgba(12,4,18,0.9)",
      shadowLg: "0 150px 280px -130px rgba(255,104,189,0.4)",
      ringGlow: "0 0 0 3px rgba(255,138,219,0.4)",
    },
  }),
  createThemePreset({
    id: "shape-carbon",
    name: "Shape Carbon",
    description: "Grafite minimalista com detalhes âmbar para dashboards premium.",
    mode: "dark",
    preview: ["#0B0F17", "#151B27", "#F5B759", "#2D3648", "#4C566A"],
    colors: {
      accent: "#F5B759",
      accentLight: "#FFD48A",
      accentDark: "#C9892A",
      secondary: "#32C5FF",
      tertiary: "#67FF9A",
      surfaceBase: "11 15 23",
      surfaceCard: "21 27 39",
      surfaceMuted: "37 44 62",
      borderSoft: "rgba(255,255,255,0.05)",
      borderStrong: "rgba(245,183,89,0.32)",
      textPrimary: "232 236 245",
      textSecondary: "176 184 200",
      textSubtle: "128 136 156",
      surfaceGradient:
        "radial-gradient(circle at 12% -5%, rgba(245,183,89,0.25), transparent 60%), radial-gradient(circle at 80% 0%, rgba(50,197,255,0.18), transparent 60%), linear-gradient(140deg, rgba(10,14,22,0.95), rgba(6,8,14,0.95))",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.85)",
      shadowMd: "0 90px 160px -100px rgba(0,0,0,0.9)",
      shadowLg: "0 150px 280px -140px rgba(15,23,42,0.85)",
      ringGlow: "0 0 0 3px rgba(245,183,89,0.32)",
    },
  }),
  createThemePreset({
    id: "shape-carbon-dashboard",
    name: "Carbon Dashboard",
    description: "Grafite premium: solido, discreto, dashboard de alta classe.",
    mode: "dark",
    preview: ["#0B0F17", "#151B27", "#F5B759", "#2D3648", "#67FF9A"],
    colors: {
      accent: "#F5B759",
      accentLight: "#FFD48A",
      accentDark: "#C9892A",
      secondary: "#67FF9A",
      tertiary: "#32C5FF",
      surfaceBase: "11 15 23",
      surfaceCard: "21 27 39",
      surfaceMuted: "31 38 54",
      borderSoft: "rgba(255,255,255,0.06)",
      borderStrong: "rgba(245,183,89,0.28)",
      textPrimary: "232 236 245",
      textSecondary: "176 184 200",
      textSubtle: "128 136 156",
      cardOpacity: "0.92",
      cardBlur: "6px",
      cardBorderHighlight: "rgba(255,255,255,0.07)",
      radiusLg: "24px",
      uiContrast: "1",
      uiDensity: "0.98",
      noiseOpacity: "0.035",
      surfaceGradient:
        "radial-gradient(circle at 12% -5%, rgba(245,183,89,0.18), transparent 60%), radial-gradient(circle at 80% 0%, rgba(103,255,154,0.10), transparent 60%), linear-gradient(150deg, rgba(10,14,22,0.96), rgba(6,8,14,0.96))",
      shadowSm: "0 26px 70px -45px rgba(0,0,0,0.82)",
      shadowMd: "0 90px 170px -120px rgba(0,0,0,0.88)",
      shadowLg: "0 180px 320px -180px rgba(0,0,0,0.92)",
      ringGlow: "0 0 0 3px rgba(245,183,89,0.26)",
    },
  }),
  createThemePreset({
    id: "shape-minimal",
    name: "Shape Minimal",
    description: "Clean premium ao estilo Apple: branco puro com acentos vivos.",
    mode: "light",
    preview: ["#007AFF", "#34C759", "#FF3B30", "#FFFFFF", "#E5E5EA"],
    colors: {
      accent: "#007AFF",
      accentLight: "#4DA0FF",
      accentDark: "#005FCC",
      secondary: "#34C759",
      tertiary: "#FF3B30",
      surfaceBase: "255 255 255",
      surfaceCard: "249 249 249",
      surfaceMuted: "237 237 240",
      borderSoft: "rgba(229,229,234,0.8)",
      borderStrong: "rgba(60,60,67,0.2)",
      textPrimary: "17 17 17",
      textSecondary: "58 58 60",
      textSubtle: "142 142 147",
      shadowSm: "0 16px 40px -28px rgba(0,0,0,0.08)",
      shadowMd: "0 45px 90px -65px rgba(0,0,0,0.1)",
      shadowLg: "0 140px 240px -150px rgba(0,0,0,0.14)",
      ringGlow: "0 0 0 3px rgba(0,122,255,0.18)",
    },
  }),
  createThemePreset({
    id: "shape-nebula",
    name: "Shape Nebula",
    description: "Escuro futurista com roxo neon e ciano elétrico.",
    mode: "dark",
    preview: ["#6D5DFB", "#30F2F2", "#FF75B5", "#0D0F1A", "#8F9BB3"],
    colors: {
      accent: "#6D5DFB",
      accentLight: "#9B8CFF",
      accentDark: "#4C3FD7",
      secondary: "#30F2F2",
      tertiary: "#FF75B5",
      surfaceBase: "13 15 26",
      surfaceCard: "20 23 38",
      surfaceMuted: "27 31 48",
      borderSoft: "rgba(109,93,251,0.2)",
      borderStrong: "rgba(48,242,242,0.35)",
      textPrimary: "230 234 241",
      textSecondary: "175 186 205",
      textSubtle: "143 155 179",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.75)",
      shadowMd: "0 90px 160px -100px rgba(0,0,0,0.8)",
      shadowLg: "0 160px 300px -140px rgba(13,15,26,0.85)",
      ringGlow: "0 0 0 3px rgba(109,93,251,0.35)",
    },
  }),
  createThemePreset({
    id: "shape-ember",
    name: "Shape Ember",
    description: "Escuro quente e intenso para treinos hardcore.",
    mode: "dark",
    preview: ["#FF4F4F", "#FFA74F", "#FFD077", "#111111", "#8E8E8E"],
    colors: {
      accent: "#FF4F4F",
      accentLight: "#FF8A8A",
      accentDark: "#D13636",
      secondary: "#FFA74F",
      tertiary: "#FFD077",
      surfaceBase: "17 17 17",
      surfaceCard: "26 26 26",
      surfaceMuted: "32 32 32",
      borderSoft: "rgba(255,79,79,0.16)",
      borderStrong: "rgba(255,167,79,0.35)",
      textPrimary: "245 245 245",
      textSecondary: "200 200 200",
      textSubtle: "142 142 142",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.8)",
      shadowMd: "0 90px 160px -100px rgba(0,0,0,0.85)",
      shadowLg: "0 160px 300px -140px rgba(0,0,0,0.9)",
      ringGlow: "0 0 0 3px rgba(255,79,79,0.35)",
    },
  }),
  createThemePreset({
    id: "shape-titanium",
    name: "Shape Titanium",
    description: "Dark neutro premium inspirado em dashboards.",
    mode: "dark",
    preview: ["#3EA6FF", "#A1E44D", "#FFC244", "#171717", "#2A2A2A"],
    colors: {
      accent: "#3EA6FF",
      accentLight: "#7BC5FF",
      accentDark: "#1E7FC7",
      secondary: "#A1E44D",
      tertiary: "#FFC244",
      surfaceBase: "23 23 23",
      surfaceCard: "42 42 42",
      surfaceMuted: "34 34 34",
      borderSoft: "rgba(255,255,255,0.06)",
      borderStrong: "rgba(62,166,255,0.35)",
      textPrimary: "236 236 236",
      textSecondary: "190 196 201",
      textSubtle: "128 136 145",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.75)",
      shadowMd: "0 90px 170px -110px rgba(0,0,0,0.85)",
      shadowLg: "0 180px 320px -150px rgba(0,0,0,0.9)",
      ringGlow: "0 0 0 3px rgba(62,166,255,0.35)",
    },
  }),
  createThemePreset({
    id: "shape-gold",
    name: "Shape Gold Edition",
    description: "VIP dourado com fundo escuro para assinantes premium.",
    mode: "dark",
    preview: ["#EFBF59", "#C9983C", "#3C3C3C", "#111111", "#F7F7F7"],
    colors: {
      accent: "#EFBF59",
      accentLight: "#FFD88A",
      accentDark: "#C9983C",
      secondary: "#C9983C",
      tertiary: "#EFBF59",
      surfaceBase: "17 17 17",
      surfaceCard: "28 28 28",
      surfaceMuted: "36 36 36",
      borderSoft: "rgba(239,191,89,0.2)",
      borderStrong: "rgba(201,152,60,0.4)",
      textPrimary: "247 247 247",
      textSecondary: "220 220 220",
      textSubtle: "170 170 170",
      shadowSm: "0 25px 60px -35px rgba(0,0,0,0.82)",
      shadowMd: "0 90px 170px -110px rgba(0,0,0,0.88)",
      shadowLg: "0 180px 320px -150px rgba(0,0,0,0.92)",
      ringGlow: "0 0 0 3px rgba(239,191,89,0.42)",
    },
  }),
  createThemePreset({
    id: "shape-cyberpulse",
    name: "Shape CyberPulse",
    description: "Neon gamer intenso para treinos noturnos.",
    mode: "dark",
    preview: ["#00FFD1", "#D900FF", "#00A3FF", "#08080A", "#E1E1E1"],
    colors: {
      accent: "#00FFD1",
      accentLight: "#5CFFE1",
      accentDark: "#00C7A8",
      secondary: "#D900FF",
      tertiary: "#00A3FF",
      surfaceBase: "8 8 10",
      surfaceCard: "16 16 19",
      surfaceMuted: "22 22 26",
      borderSoft: "rgba(0,255,209,0.2)",
      borderStrong: "rgba(217,0,255,0.35)",
      textPrimary: "225 225 225",
      textSecondary: "185 189 200",
      textSubtle: "156 160 174",
      shadowSm: "0 25px 70px -40px rgba(0,0,0,0.8)",
      shadowMd: "0 110px 180px -120px rgba(0,0,0,0.85)",
      shadowLg: "0 200px 360px -180px rgba(0,0,0,0.9)",
      ringGlow: "0 0 0 3px rgba(0,255,209,0.4)",
      cardOpacity: "0.7",
      cardBlur: "10px",
      cardBorderHighlight: "rgba(0,255,209,0.2)",
      radiusLg: "28px",
      titleWeight: "700",
      uiContrast: "1.1",
    },
  }),
];

const THEME_MAP = new Map(THEME_PRESETS.map((theme) => [theme.id, theme]));

export function ThemeProvider({ children }) {
  const explicitPreference = useRef(false);

  const [themeId, setThemeId] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LIGHT_THEME;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_MAP.has(stored)) {
      explicitPreference.current = true;
      return stored;
    }

    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  });

  const activeTheme = useMemo(() => THEME_MAP.get(themeId) ?? THEME_MAP.get(DEFAULT_LIGHT_THEME), [themeId]);

  useEffect(() => {
    if (!activeTheme) return;

    const root = document.documentElement;
    root.dataset.theme = activeTheme.id;
    root.dataset.colorMode = activeTheme.mode;
    root.classList.toggle("dark", activeTheme.mode === "dark");

    Object.entries(activeTheme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (explicitPreference.current) {
      window.localStorage.setItem(STORAGE_KEY, activeTheme.id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      if (explicitPreference.current) return;
      setThemeId(event.matches ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const selectTheme = useCallback((id) => {
    if (!THEME_MAP.has(id)) return;
    explicitPreference.current = true;
    setThemeId(id);
  }, []);

  const toggleTheme = useCallback(() => {
    explicitPreference.current = true;
    setThemeId((current) => {
      const currentTheme = THEME_MAP.get(current);
      return currentTheme?.mode === "dark" ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: activeTheme,
      themeId: activeTheme?.id ?? DEFAULT_LIGHT_THEME,
      isDark: activeTheme?.mode === "dark",
      themes: THEME_PRESETS,
      selectTheme,
      toggleTheme,
    }),
    [activeTheme, selectTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
