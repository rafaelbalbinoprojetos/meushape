import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeMenu() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const { themes, theme, selectTheme } = useTheme();

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
        <span className="sr-only">{open ? "Fechar sele��o de temas" : "Abrir sele��o de temas"}</span>
        <PaletteIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          id="theme-menu"
          role="dialog"
          aria-modal="false"
          className="absolute right-0 top-12 z-40 flex w-80 max-h-[80vh] flex-col rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <header className="border-b border-gray-200 pb-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Temas MEU SHAPE</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Alterne entre as paletas claras e escuras energ�ticas.
            </p>
          </header>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <section>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Temas claros
              </span>
              <ThemeGrid themes={lightThemes} activeId={theme?.id} onSelect={handleSelect} />
            </section>

            <section className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
        Nenhum tema dispon�vel.
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

function PaletteIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 00-7.07 17.07 1.75 1.75 0 001.59.48l1.73-.4a2.25 2.25 0 011.77.37l2.16 1.62a1.75 1.75 0 002.76-1.4v-.78a2.25 2.25 0 012.25-2.25h1.94a1.75 1.75 0 001.71-2.23A10 10 0 0012 2zm-4.5 6a1.25 1.25 0 111.25-1.25A1.25 1.25 0 017.5 8zm3 3A1.25 1.25 0 1111.75 9.75 1.25 1.25 0 0110.5 11zm3-5.5A1.25 1.25 0 1114.75 4.25 1.25 1.25 0 0113.5 5.5zm2.75 5.5A1.25 1.25 0 1117.5 9.75 1.25 1.25 0 0116.25 11z" />
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
