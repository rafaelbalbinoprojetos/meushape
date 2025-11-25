import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import SettingsMenu from "../components/SettingsMenu.jsx";
import ThemeMenu from "../components/ThemeMenu.jsx";
import NotificationPanel from "../components/NotificationPanel.jsx";
import WelcomeModal from "../components/WelcomeModal.jsx";
import PremiumPlansModal from "../components/PremiumPlansModal.jsx";
import AudioPlaylistBar from "../components/AudioPlaylistBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { NAV_LINKS, normalizeMobileNavSelection } from "../data/navigation.js";
import { DEFAULT_PLAN_ID } from "../data/plans.js";

const BRAND_NAME = "MEU SHAPE";
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const SUBSCRIPTION_ENDPOINT = `${API_BASE}/api/mercadopago/subscription`;

const ICON_MAP = {
  dashboard: DashboardIcon,
  workouts: WorkoutIcon,
  exercises: ExercisesIcon,
  fichas: PlansIcon,
  nutrition: NutritionIcon,
  evolution: EvolutionIcon,
  assistant: AssistantIcon,
  settings: SettingsIcon,
};

const NAV_ITEMS = NAV_LINKS.map((link) => ({
  ...link,
  icon: ICON_MAP[link.id] ?? DashboardIcon,
}));

const NAV_ITEMS_BY_PATH = new Map(NAV_ITEMS.map((item) => [item.to, item]));

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, updateUserMetadata } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const notificationContainerRef = React.useRef(null);
  const notificationPanelRef = React.useRef(null);
  const notificationButtonRef = React.useRef(null);
  const mobileSearchPanelRef = React.useRef(null);
  const mobileSearchButtonRef = React.useRef(null);
  const mobileSearchInputRef = React.useRef(null);

  const userMetadata = user?.user_metadata ?? {};
  const subscriptionTier = userMetadata.subscription_tier ?? userMetadata.plan ?? "free";
  const trialStatus = userMetadata.trial_status ?? "eligible";
  const trialEndsAt = userMetadata.trial_expires_at ? new Date(userMetadata.trial_expires_at) : null;
  const trialExpired = Boolean(trialEndsAt) && trialEndsAt.getTime() <= Date.now();
  const trialActive = trialStatus === "active" && Boolean(trialEndsAt) && !trialExpired;
  const onboardingComplete =
    userMetadata.completed_reading_onboarding ?? userMetadata.has_seen_welcome === true ?? false;
  const mobileNavPreference = userMetadata.mobile_nav_paths;

  const mobileNavItems = useMemo(() => {
    const paths = normalizeMobileNavSelection(mobileNavPreference);
    return paths.map((path) => NAV_ITEMS_BY_PATH.get(path)).filter(Boolean);
  }, [mobileNavPreference]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (
        notificationPanelRef.current?.contains(event.target) ||
        notificationButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return undefined;
    const input = mobileSearchInputRef.current;
    if (input) {
      input.focus();
    }

    const handlePointerDown = (event) => {
      if (
        mobileSearchPanelRef.current?.contains(event.target) ||
        mobileSearchButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      setMobileSearchOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSearchOpen]);

  useEffect(() => {
    setWelcomeOpen(Boolean(user) && !onboardingComplete);
  }, [user, onboardingComplete]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const sampleMessages = [
      {
        id: `shape-welcome-${user.id}`,
        type: "info",
        title: "Bem-vindo ao MEU SHAPE",
        message: "Ative suas fichas personalizadas e acompanhe treinos, nutri??o e evolu??o em um s? lugar.",
        time: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      },
    ];
    setNotifications(sampleMessages);
    setNotificationsError(null);
    setNotificationsLoading(false);
  }, [user, refreshVersion]);

  useEffect(() => {
    function handleOpenPlans() {
      setPlansOpen(true);
    }

    window.addEventListener("meushape:open-plans", handleOpenPlans);
    return () => window.removeEventListener("meushape:open-plans", handleOpenPlans);
  }, []);

  useEffect(() => {
    if (!updateUserMetadata || !user) return undefined;

    if (trialStatus === "active" && trialExpired) {
      updateUserMetadata({ trial_status: "expired" }).catch((error) => {
        console.error("[layout] Erro ao atualizar status do teste:", error);
      });
    }

    return undefined;
  }, [trialExpired, trialStatus, updateUserMetadata, user]);

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = searchTerm.trim();
      if (!trimmed) return;
      navigate(`/treinos?search=${encodeURIComponent(trimmed)}`);
      setMobileSearchOpen(false);
    },
    [navigate, searchTerm],
  );

  const handleCloseWelcome = useCallback(() => setWelcomeOpen(false), []);

  const handleStartOnboarding = useCallback(async () => {
    setWelcomeOpen(false);
    if (user && updateUserMetadata) {
      try {
        await updateUserMetadata({ completed_reading_onboarding: true, has_seen_welcome: true });
      } catch (error) {
        console.error("[layout] Erro ao confirmar onboarding:", error);
      }
    }
  }, [updateUserMetadata, user]);

  const handleSeePlans = useCallback(() => {
    setWelcomeOpen(false);
    setPlansOpen(true);
  }, []);

  const handleClosePlans = useCallback(() => {
    setPlansOpen(false);
    setSubscribingPlan(null);
  }, []);

  const handleOpenNotifications = useCallback(() => {
    setNotificationsOpen(true);
    setMenuOpen(false);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen((previous) => {
      const next = !previous;
      if (next) {
        const event = new CustomEvent("meushape:close-settings-menu");
        window.dispatchEvent(event);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (!notificationContainerRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [notificationsOpen]);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success("Até logo! Esperamos você para a próxima leitura.");
      navigate("/login");
    } catch (error) {
      toast.error(error?.message ?? "Não foi possível sair da conta agora.");
    }
  }, [navigate, signOut]);

  const handleAutomaticSubscription = useCallback(
    async (selectedPlan = DEFAULT_PLAN_ID) => {
      if (!user) {
        toast.error("Faça login para concluir a assinatura.");
        return;
      }

      try {
        toast.loading("Redirecionando para o Mercado Pago...", { id: "subscription" });

        const response = await fetch(SUBSCRIPTION_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            userId: user.id,
            email: user.email,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Não foi possível criar a assinatura agora.");
        }

        const payload = await response.json();
        toast.dismiss("subscription");

        if (payload.checkoutUrl) {
          window.location.href = payload.checkoutUrl;
          return;
        }

        toast.success("Assinatura criada! Verifique seu email para concluir o processo.");
      } catch (error) {
        toast.dismiss("subscription");
        toast.error(error?.message ?? "Erro inesperado ao criar a assinatura.");
        console.error("[layout] Erro ao criar assinatura automática:", error);
      }
    },
    [user],
  );

  const handleSubscribe = useCallback(
    (planId) => {
      setSubscribingPlan(planId);
      handleAutomaticSubscription(planId);
    },
    [handleAutomaticSubscription],
  );

  return (
    <div className="relative min-h-screen bg-essencia-radiance pb-20 md:flex md:pb-0">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "rounded-xl border border-white/40 bg-[#F5F7FB]/95 px-4 py-3 text-sm text-[#1f2933] shadow-lg backdrop-blur",
        }}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[18rem] transform border-r border-white/40 bg-[#F5F7FB]/90 backdrop-blur-md transition-transform duration-300 dark:border-white/10 dark:bg-slate-900/90 md:sticky md:top-0 md:inset-auto md:self-start md:z-20 md:h-screen md:w-[19rem] md:flex-shrink-0 md:translate-x-0 md:rounded-none md:bg-[#F5F7FB]/85 md:shadow-none md:dark:bg-slate-900/85 lg:w-[21rem] ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between border-b border-white/35 px-5 py-4 dark:border-white/10">
          <div>
            <span className="text-xs uppercase tracking-[0.28em] text-[#4A5568]/70 dark:text-[#cfc2ff]/60">
              Plataforma de Leitura
            </span>
            <h1 className="mt-2 text-xl font-semibold text-[#1f2933] dark:text-[#f8f6ff]">{BRAND_NAME}</h1>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-[#4A5568] transition hover:bg-[#E6F4FF]/80 hover:text-[#32C5FF] md:hidden"
            aria-label="Fechar Navegação"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="sidebar-nav flex flex-col gap-1 px-3 py-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "sidebar-link group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition duration-200",
                  isActive
                    ? "sidebar-link--active text-[#0F1F3C] shadow-sm dark:text-[#cfc2ff]"
                    : "text-[#0F1F3C]/80 hover:bg-[#E6F4FF] hover:text-[#0F1F3C] dark:text-[#a89fc1] dark:hover:bg-white/5 dark:hover:text-white",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={() => setMenuOpen(false)}
            >
              {React.createElement(item.icon, {
                className: "h-5 w-5 flex-shrink-0",
              })}
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                {item.description ? (
                  <span className="text-xs text-[#4A5568]/70 dark:text-[#cfc2ff]/70">{item.description}</span>
                ) : null}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 px-5 pb-6">
          <div className="rounded-2xl border border-[#32C5FF]/30 bg-[#E6F4FF]/70 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
            <span className="text-xs uppercase tracking-[0.28em] text-[#67FF9A] dark:text-[#cfc2ff]">Plano</span>
            <p className="mt-2 text-base font-semibold text-[#0F1F3C] dark:text-white">
              {subscriptionTier === "premium" ? "Shape Pro" : "Shape Free"}
            </p>
            {trialActive && trialEndsAt ? (
              <p className="mt-1 text-xs text-[#4A5568]/80 dark:text-[#cfc2ff]/80">
                Teste termina em {formatTrialCountdown(trialEndsAt)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setPlansOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#32C5FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0F1F3C]"
            >
              Explorar benefícios
            </button>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#32C5FF]/20 bg-white/70 px-3 py-2 text-sm font-semibold text-[#0F1F3C] transition hover:border-[#32C5FF]/40 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:border-white/30"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          aria-label="Fechar Navegação lateral"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="relative flex min-h-screen flex-1 flex-col bg-[rgb(var(--surface-base))]/95 backdrop-blur transition-[padding] md:ml-0">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-[rgb(var(--surface-card))]/90 backdrop-blur-md dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:flex-nowrap md:gap-6 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-[#32C5FF]/20 bg-white/80 p-2 text-[#0F1F3C] transition hover:border-[#32C5FF]/40 hover:text-[#0F1F3C] md:hidden"
                  aria-label="Abrir Navegação principal"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#4A5568]/70 dark:text-[#cfc2ff]/70">Bem-vindo</p>
                  <h2 className="text-base font-semibold text-[#1f2933] leading-tight dark:text-white md:text-lg">
                    {location.pathname === "/"
                      ? "Painel pessoal"
                      : NAV_ITEMS_BY_PATH.get(location.pathname)?.label}
                  </h2>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end md:gap-3">
                <form className="hidden min-w-[220px] flex-1 items-center md:flex" onSubmit={handleSearchSubmit}>
                  <div className="relative flex w-full items-center">
                    <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-[#4A5568]/70" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Busque por treinos, exerc?cios ou receitas"
                      className="w-full rounded-xl border border-[#32C5FF]/40 bg-white py-2 pl-9 pr-4 text-sm text-[#1f2933] shadow-sm outline-none transition focus:border-[#32C5FF]/60 focus:ring-2 focus:ring-[#32C5FF]/20 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                    />
                  </div>
                </form>

                <div className="flex items-center justify-end gap-2 md:flex-none">
                  <button
                    ref={mobileSearchButtonRef}
                    type="button"
                    onClick={() => setMobileSearchOpen((prev) => !prev)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#32C5FF]/60 bg-white text-[#0F1F3C] shadow-sm transition hover:border-[#32C5FF] hover:text-[#0F1F3C] dark:border-white/20 dark:bg-slate-900 dark:text-white dark:hover:border-[#cfc2ff] md:hidden ${
                      mobileSearchOpen ? "ring-2 ring-[#32C5FF]/30 dark:ring-white/20" : ""
                    }`}
                    aria-label="Abrir busca"
                    aria-expanded={mobileSearchOpen}
                  >
                    <SearchIcon className="h-5 w-5" />
                  </button>
                  <button
                    ref={notificationButtonRef}
                    type="button"
                  onClick={handleToggleNotifications}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#32C5FF]/25 bg-white text-[#0F1F3C] shadow-sm transition hover:border-[#32C5FF]/45 hover:text-[#0F1F3C] dark:border-white/10 dark:bg-slate-900 dark:text-white ${notificationsOpen ? "ring-2 ring-[#32C5FF]/30 dark:ring-white/20" : ""}`}
                    aria-label="Abrir notificações"
                  >
                    <BellIcon className="h-5 w-5" />
                    {notifications.length > 0 ? (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#32C5FF] text-[11px] font-semibold text-white shadow">
                        {notifications.length}
                      </span>
                    ) : null}
                  </button>
                  <ThemeMenu />

                  <SettingsMenu
                    onSignOut={handleSignOut}
                    onReload={handleRefresh}
                    onOpenNotifications={handleOpenNotifications}
                    onOpenPlans={() => setPlansOpen(true)}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="relative flex flex-1 flex-col" ref={notificationContainerRef}>
            <NotificationPanel
              ref={notificationPanelRef}
              open={notificationsOpen}
              loading={notificationsLoading}
              error={notificationsError}
              notifications={notifications}
              onClose={handleCloseNotifications}
              container={typeof document !== "undefined" ? document.body : null}
            />
            {mobileSearchOpen && (
              <>
                <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" />
                <div
                  ref={mobileSearchPanelRef}
                  className="fixed left-4 right-4 top-24 z-40 md:hidden"
                >
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/95 px-3 py-2 text-sm text-[#1f2933] shadow-2xl dark:border-white/10 dark:bg-slate-900/95 dark:text-white"
                  >
                    <SearchIcon className="h-4 w-4 text-[#4A5568]/70 dark:text-[#cfc2ff]/70" />
                    <input
                      ref={mobileSearchInputRef}
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Busque por treinos, exerc?cios ou receitas"
                      className="flex-1 bg-transparent text-sm text-[#1f2933] placeholder:text-[#4A5568]/70 focus:outline-none dark:text-white"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#32C5FF] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0F1F3C]"
                    >
                      Buscar
                    </button>
                  </form>
                </div>
              </>
            )}

            <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-8 bg-[rgb(var(--surface-base))]">
              <Outlet />
            </main>
            <AudioPlaylistBar />

        </div>

        <WelcomeModal
          open={welcomeOpen}
          onStart={handleStartOnboarding}
          onSeePlans={handleSeePlans}
          onClose={handleCloseWelcome}
        />

        <PremiumPlansModal
          open={plansOpen}
          onClose={handleClosePlans}
          onSubscribe={handleSubscribe}
          subscribingPlanId={subscribingPlan}
          hasPremiumAccess={subscriptionTier === "premium" || trialActive}
          currentPlanId={subscriptionTier}
          trialActive={trialActive}
          trialEndsAt={trialEndsAt}
        />
      </div>
      {(mobileNavItems.length || NAV_ITEMS.length) && (
        <nav className="pointer-events-auto md:hidden fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-t-3xl border border-[#32C5FF]/20 border-b-0 bg-white/95 px-4 py-3 shadow-[0_-20px_45px_-35px_rgba(108,99,255,0.5)] backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
            {(mobileNavItems.length ? mobileNavItems : NAV_ITEMS).map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              const itemColor = isActive
                ? "rgb(var(--color-accent-primary))"
                : "var(--text-secondary)";
              const iconColor = isActive
                ? "rgb(var(--color-accent-primary))"
                : "var(--text-subtle)";
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(var(--color-accent-primary),0.25)]"
                  style={{ color: itemColor }}
                >
                  {React.createElement(item.icon, {
                    className: "h-5 w-5",
                    style: { color: iconColor },
                  })}
                  <span>{item.shortLabel ?? item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function DashboardIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 5h6v6H5zM13 5h6v4h-6zM5 13h6v6H5zM13 15h6v4h-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function WorkoutIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 10.5h3v3h-3zM16.5 10.5h3v3h-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 9.5v5m2-5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ExercisesIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15.5" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlansIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 3.5h8.5L20 8v12.25A1.75 1.75 0 0118.25 22H7A1.75 1.75 0 015.25 20.25V5.25A1.75 1.75 0 017 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15.5 3.5V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 12h7M8.5 15h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NutritionIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 7h10a4 4 0 014 4v0a4 4 0 01-4 4H7a4 4 0 01-4-4v0a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EvolutionIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 15.5l4-4 3 3 6-6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 20.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AssistantIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3a7 7 0 016.93 6.12A5 5 0 0117 19H9.5l-3.06 2.45a.75.75 0 01-1.22-.58V19A5 5 0 015.07 9.12 7 7 0 0112 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 10.75h6M9 13.75h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M11.4 3.6a1 1 0 011.2 0l1.18.86a1 1 0 001.26-.08l.9-.9a1 1 0 011.5.13l1 1.28a1 1 0 01-.13 1.37l-.9.75a1 1 0 00-.33.93l.3 1.45a1 1 0 01-.78 1.18l-1.17.23a1 1 0 00-.82.82L14 13.4a1 1 0 01-1 1H11a1 1 0 01-1-1l-.21-1.2a1 1 0 00-.82-.82l-1.17-.23a1 1 0 01-.78-1.18L7.3 8.62a1 1 0 00-.33-.93l-.9-.75a1 1 0 01-.13-1.37l1-1.28a1 1 0 011.5-.13l.9.9a1 1 0 001.26.08z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 00-6 6v2.2a2 2 0 01-.58 1.41l-.92.92A1 1 0 005 15h14a1 1 0 00.7-1.71l-.92-.92A2 2 0 0117 11.2V9a6 6 0 00-5-5.91V3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 18.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M11 4.5a6.5 6.5 0 104.6 11.1l3.4 3.39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}




