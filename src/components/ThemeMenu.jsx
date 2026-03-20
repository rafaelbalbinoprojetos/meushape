import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeMenu() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const { themes, theme, selectTheme, isDark } = useTheme();

  const lightThemes = React.useMemo(() => themes.filter((preset) => preset.mode === "light"), [themes]);
  const darkThemes = React.useMemo(() => themes.filter((preset) => preset.mode === "dark"), [themes]);

  React.useEffect(() => {
    if (!open) return undefined;

    const closeOnOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEsc = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEsc);
    };
  }, [open]);

  const handleSelect = (themeId) => {
    selectTheme(themeId);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="theme-menu"
        className={`flex h-10 w-10 items-center justify-center rounded-lg border border-[#32C5FF]/60 bg-white text-[#0F1F3C] shadow-sm transition hover:border-[#32C5FF] hover:text-[#0F1F3C] dark:border-white/20 dark:bg-slate-900 dark:text-white dark:hover:border-[#cfc2ff] ${
          open ? "ring-2 ring-[#32C5FF]/30 dark:ring-white/25" : ""
        }`}
        title="Selecionar tema"
      >
        <span className="sr-only">{open ? "Fechar seleção de temas" : "Abrir seleção de temas"}</span>
        <ThemeIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          id="theme-menu"
          role="dialog"
          aria-modal="false"
          className="absolute right-0 top-12 z-40 flex w-80 max-h-[80vh] flex-col rounded-xl border p-4 text-sm shadow-2xl backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 dark:shadow-black/30"
          style={{
            backgroundColor: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.96)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(229,229,234,0.8)",
            boxShadow: isDark
              ? "0 25px 60px -35px rgba(0,0,0,0.45)"
              : "0 25px 60px -35px rgba(15,31,60,0.18)",
          }}
        >
          <header className="border-b border-[color:var(--border-soft)] pb-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))] dark:text-gray-100">Temas MEU SHAPE</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-gray-400">Alterne entre as paletas claras e escuras energéticas.</p>
          </header>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <section>
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-subtle))] dark:text-gray-400">
                Temas claros
              </span>
              <ThemeGrid themes={lightThemes} activeId={theme?.id} onSelect={handleSelect} />
            </section>

            <section className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-subtle))] dark:text-gray-400">
                Temas escuros
              </span>
              <ThemeGrid themes={darkThemes} activeId={theme?.id} onSelect={handleSelect} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeGrid({ themes, activeId, onSelect }) {
  if (!themes.length) {
    return (
      <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Nenhum tema disponível.
      </p>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {themes.map((preset) => {
        const isActive = preset.id === activeId;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            title={preset.description}
            className={`group relative flex flex-col gap-2 rounded-lg border px-2 pb-2 pt-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32C5FF]/40 dark:focus-visible:ring-white/30 ${
              isActive
                ? "border-[#32C5FF]/60 ring-1 ring-[#32C5FF]/40 dark:border-white/40"
                : "border-gray-200 hover:border-[#32C5FF]/50 hover:bg-[#32C5FF]/5 dark:border-gray-700 dark:hover:border-white/40 dark:hover:bg-white/5"
            }`}
          >
            <span className="flex h-6 w-full overflow-hidden rounded-md shadow-inner">
              {preset.preview.map((color, index) => (
                <span key={`${preset.id}-color-${index}`} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </span>
            <span className="text-[11px] font-medium text-gray-600 transition group-hover:text-[#32C5FF] dark:text-gray-300 dark:group-hover:text-white">
              {preset.name}
            </span>
            {isActive && <CheckIcon className="absolute right-1 top-1 h-4 w-4 text-[#32C5FF] dark:text-white" />}
          </button>
        );
      })}
    </div>
  );
}

function ThemeIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 4.25a7.75 7.75 0 107.75 7.75c0-.37-.03-.73-.08-1.08a6 6 0 01-7.17-6.92c-.17-.02-.33-.03-.5-.03z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 2v2.1M12 19.9V22M2 12h2.1M19.9 12H22M4.4 4.4l1.5 1.5M18.1 18.1l1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.53 16.28a.75.75 0 01-1.06 0l-3.25-3.25a.75.75 0 011.06-1.06l2.72 2.72 6.69-6.69a.75.75 0 111.06 1.06z" />
    </svg>
  );
}
