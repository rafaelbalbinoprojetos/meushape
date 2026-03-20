import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

const MENU_ITEMS = [
  {
    id: "profile",
    label: "Meu Perfil",
    icon: UserIcon,
    description: "Preferências pessoais",
    action: (navigate, helpers) => {
      navigate("/perfil");
      helpers.close();
    },
  },
  {
    id: "plans",
    label: "Planos e upgrade",
    icon: SparkIcon,
    description: "Teste Premium e assinatura",
    action: (_navigate, helpers) => {
      helpers.openPlans?.();
      helpers.close();
    },
  },
  {
    id: "notifications",
    label: "Notificações",
    icon: BellIcon,
    description: "Central de alertas",
    action: (_navigate, helpers) => {
      helpers.openNotifications?.();
      helpers.close();
    },
  },
  {
    id: "security",
    label: "Segurança",
    icon: ShieldIcon,
    description: "Ajustes de autenticação",
    action: (navigate, helpers) => {
      navigate("/perfil?tab=seguranca");
      helpers.close();
    },
  },
];

export default function SettingsMenu({ onSignOut, onReload, onOpenNotifications, onOpenPlans }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  React.useEffect(() => {
    const handleExternalClose = () => setOpen(false);
    window.addEventListener("meushape:close-settings-menu", handleExternalClose);
    return () => window.removeEventListener("meushape:close-settings-menu", handleExternalClose);
  }, []);

  const helpers = React.useMemo(
    () => ({
      close: () => setOpen(false),
      openNotifications: onOpenNotifications,
      openPlans: onOpenPlans,
    }),
    [onOpenNotifications, onOpenPlans],
  );

  const handleReload = () => {
    setOpen(false);
    onReload?.();
  };

  const handleSignOut = () => {
    setOpen(false);
    onSignOut?.();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="settings-menu"
        className={`flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald ${open ? "ring-2 ring-temaSky/30 dark:ring-temaEmerald/30" : ""}`}
        title="Abrir configurações do usuário"
      >
        <span className="sr-only">{open ? "Fechar configurações" : "Abrir configurações"}</span>
        <SlidersIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          id="settings-menu"
          role="dialog"
          aria-modal="false"
          aria-label="configurações"
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
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))] dark:text-gray-100">configurações</p>
          </header>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {MENU_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.action(navigate, helpers)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition hover:border-temaSky/50 hover:bg-temaSky/10 hover:text-temaSky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:hover:border-temaEmerald/50 dark:hover:bg-temaEmerald/10 dark:hover:text-temaEmerald dark:focus-visible:ring-temaEmerald/40"
                  >
                    <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

          </div>

          <footer className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-800">
            <button
              type="button"
              onClick={handleReload}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-temaSky transition hover:bg-temaSky/10 hover:text-temaSky/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:text-temaEmerald dark:hover:bg-temaEmerald/10 dark:hover:text-temaEmerald/90 dark:focus-visible:ring-temaEmerald/40"
            >
              <RefreshIcon className="h-4 w-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-rose-500 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-rose-400 dark:hover:bg-rose-400/10"
            >
              <SignOutIcon className="h-4 w-4" />
              Sair
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

function SlidersIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 6h6M14 6h6M10 6v8M4 18h10M18 18h2M14 18v-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a5 5 0 015 5v1a5 5 0 11-10 0V7a5 5 0 015-5zm-7 17a5 5 0 015-5h4a5 5 0 015 5v1.25A1.75 1.75 0 0117.25 22h-10.5A1.75 1.75 0 015 20.25z" />
    </svg>
  );
}

function SparkIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.52 1.7a.75.75 0 011.44 0l1.05 3.23a2.25 2.25 0 001.43 1.44l3.23 1.05a.75.75 0 010 1.44l-3.23 1.05a2.25 2.25 0 00-1.44 1.43l-1.05 3.23a.75.75 0 01-1.44 0L10.47 11a2.25 2.25 0 00-1.43-1.43L5.81 8.06a.75.75 0 010-1.44l3.23-1.05a2.25 2.25 0 001.43-1.44z" />
      <path d="M6 16.5a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 016 16.5zm9.75-.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5zM12 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 13zm0 7a.75.75 0 01.75.75V22a.75.75 0 01-1.5 0v-1.25A.75.75 0 0112 20z" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a6 6 0 00-6 6v2.586c0 .414-.168.81-.469 1.098l-.97.97A1.5 1.5 0 006 15h12a1.5 1.5 0 001.06-2.56l-.97-.97A1.5 1.5 0 0018 10.586V8a6 6 0 00-6-6z" />
      <path d="M10.25 18.75a1.75 1.75 0 003.5 0z" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a.75.75 0 01.374.1l7 4a.75.75 0 01.376.65v5.32c0 3.176-2.05 6.125-5.536 7.96a3.9 3.9 0 01-3.628 0C7.1 18.195 5.05 15.246 5.05 12.07V6.75a.75.75 0 01.376-.65l7-4A.75.75 0 0112 2zm0 4.5a.75.75 0 00-.75.75v4.738l-1.72-1.72a.75.75 0 10-1.06 1.06l2.993 2.993a.75.75 0 001.28-.53V7.25A.75.75 0 0012 6.5z" />
    </svg>
  );
}

function RefreshIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 4.75A.75.75 0 014.75 4h4.5a.75.75 0 010 1.5H6.81l.22.22a8 8 0 0111.32 0l.11.11a.75.75 0 01-1.06 1.06l-.11-.11a6.5 6.5 0 00-9.19 0L7.5 7.75h1.75a.75.75 0 010 1.5h-4.5A.75.75 0 014 8.5zM19.25 20a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v1.44l.22-.22a8 8 0 00-11.32-11.32l-.11.11a.75.75 0 01-1.06-1.06l.11-.11a9.5 9.5 0 0113.45 13.45l-.22.22h1.44a.75.75 0 010 1.5z" />
    </svg>
  );
}

function SignOutIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.75 4A2.75 2.75 0 003 6.75v10.5A2.75 2.75 0 005.75 20h5.5a.75.75 0 000-1.5h-5.5A1.25 1.25 0 014.5 17.25V6.75A1.25 1.25 0 015.75 5.5h5.5a.75.75 0 000-1.5z" />
      <path d="M15.72 7.22a.75.75 0 10-1.06 1.06L16.94 10.5H10a.75.75 0 000 1.5h6.94l-2.28 2.22a.75.75 0 001.06 1.06l3.75-3.75a.75.75 0 000-1.06z" />
    </svg>
  );
}

