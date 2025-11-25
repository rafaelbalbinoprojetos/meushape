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
