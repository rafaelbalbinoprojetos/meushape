import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import SettingsMenu from "../components/SettingsMenu.jsx";
import ThemeMenu from "../components/ThemeMenu.jsx";
import NotificationPanel from "../components/NotificationPanel.jsx";
import WelcomeModal from "../components/WelcomeModal.jsx";
import PremiumPlansModal from "../components/PremiumPlansModal.jsx";
import AudioPlaylistBar from "../components/AudioPlaylistBar.jsx";
import WaterQuickActions from "../components/WaterQuickActions.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { MOBILE_NAV_LINKS, NAV_LINKS, normalizeMobileNavSelection } from "../data/navigation.js";
import { DEFAULT_PLAN_ID } from "../data/plans.js";
import { listReminders } from "../services/reminders.js";

const BRAND_NAME = "MEU SHAPE";
const FALLBACK_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const API_BASE = (import.meta.env.VITE_API_BASE || FALLBACK_ORIGIN).replace(/\/$/, "");
const SUBSCRIPTION_ENDPOINT = `${API_BASE}/api/mercadopago/subscription`;
const CHECKOUT_ENDPOINT = `${API_BASE}/api/mercadopago/checkout`;
const NOTIFICATION_CLEAR_KEY = "meushape:notifications:cleared";

const ICON_MAP = {
  dashboard: DashboardIcon,
  workouts: WorkoutIcon,
  exercises: ExercisesIcon,
  fichas: PlansIcon,
  nutrition: NutritionIcon,
  evolution: EvolutionIcon,
  insights: InsightsIcon,
  history: HistoryIcon,
  assistant: AssistantIcon,
  feed: FeedIcon,
  energia: MusicIcon,
  settings: SettingsIcon,
};

const NAV_ITEMS = NAV_LINKS.map((link) => ({
  ...link,
  icon: ICON_MAP[link.id] ?? DashboardIcon,
}));

const MOBILE_ONLY_ITEMS = MOBILE_NAV_LINKS.filter(
  (link) => !NAV_LINKS.some((nav) => nav.to === link.to),
).map((link) => ({
  ...link,
  icon: ICON_MAP[link.id] ?? PlansIcon,
}));

const NAV_ITEMS_BY_PATH = new Map([...NAV_ITEMS, ...MOBILE_ONLY_ITEMS].map((item) => [item.to, item]));

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, updateUserMetadata } = useAuth();
  const { isDark } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsSeenCount, setNotificationsSeenCount] = useState(0);
  const [hideReminderNotifications, setHideReminderNotifications] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const [notificationsCleared, setNotificationsCleared] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [remindersState, setRemindersState] = useState({ loading: false, items: [] });
  const [reminderModal, setReminderModal] = useState(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const remindersRef = React.useRef([]);
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
  const currentPageTitle =
    location.pathname === "/" ? "Painel pessoal" : NAV_ITEMS_BY_PATH.get(location.pathname)?.label;
  const logoSrc = isDark ? "/images/logo_light.png" : "/images/logo_dark.png";

  const mobileNavItems = useMemo(() => {
    const paths = normalizeMobileNavSelection(mobileNavPreference);
    return paths.map((path) => NAV_ITEMS_BY_PATH.get(path)).filter(Boolean);
  }, [mobileNavPreference]);

  const formatReminderDays = useCallback((days) => {
    if (!Array.isArray(days) || days.length === 0) return "Todos os dias";
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    const normalized = days
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 7)
      .sort((a, b) => a - b);
    return normalized.map((value) => labels[value - 1] || value).join(", ");
  }, [notifications.length]);

  const reminderNotifications = useMemo(() => {
    const items = remindersState.items || [];
    if (notificationsCleared) {
      return [];
    }
    if (hideReminderNotifications) {
      return [];
    }
    return items
      .filter((reminder) => reminder?.ativo)
      .slice(0, 4)
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: "reminder",
        title: "Lembrete ativo",
        message: `${reminder.titulo} • ${String(reminder.horario || "").slice(0, 5)} • ${formatReminderDays(
          reminder.dias_semana,
        )}`,
        time: "Agora",
      }));
  }, [formatReminderDays, hideReminderNotifications, remindersState.items]);

  const combinedNotifications = useMemo(() => {
    if (notificationsCleared) {
      return [];
    }
    return [...reminderNotifications, ...notifications];
  }, [notifications, notificationsCleared, reminderNotifications]);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
    setNotificationsSeenCount(0);
    setHideReminderNotifications(true);
    setVisibleNotifications([]);
    setNotificationsCleared(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(NOTIFICATION_CLEAR_KEY, "true");
    }
  }, []);

  const badgeCount = notificationsCleared ? 0 : Math.max(0, (notifications?.length ?? 0) - notificationsSeenCount);

  const normalizeReminderDays = useCallback((days) => {
    if (!Array.isArray(days)) return [];
    const map = {
      seg: 1,
      ter: 2,
      qua: 3,
      qui: 4,
      sex: 5,
      sab: 6,
      dom: 7,
    };
    return days
      .map((value) => {
        if (typeof value === "number") {
          if (value >= 1 && value <= 7) return value;
          if (value >= 0 && value <= 6) return value === 0 ? 7 : value;
          return null;
        }
        if (typeof value === "string") {
          const key = value.toLowerCase().trim().slice(0, 3);
          return map[key] ?? null;
        }
        return null;
      })
      .filter(Boolean);
  }, []);

  const normalizeReminderTime = useCallback((time) => {
    if (!time) return null;
    const raw = String(time).trim();
    if (raw.length >= 5) return raw.slice(0, 5);
    return raw;
  }, []);

  const parseTimeToMinutes = useCallback((value) => {
    if (!value) return null;
    const parts = String(value).split(":");
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }, []);

  const triggerReminder = useCallback((reminder) => {
    const title = reminder?.titulo || "Lembrete do Shape";
    toast(`🔔 ${title}`, { duration: 6000 });
    setReminderModal({
      titulo: title,
      horario: normalizeReminderTime(reminder?.horario),
      dias: formatReminderDays(reminder?.dias_semana),
    });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Meu Shape", {
          body: title,
          icon: "/images/logo_light.png",
        });
      } catch (error) {
        console.warn("[layout] falha ao disparar notificacao:", error);
      }
    }
  }, [formatReminderDays, normalizeReminderTime]);

  useEffect(() => {
    if (!reminderModal) return undefined;
    const timeout = window.setTimeout(() => setReminderModal(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [reminderModal]);

  useEffect(() => {
    if (!user?.id) {
      setRemindersState({ loading: false, items: [] });
      remindersRef.current = [];
      return undefined;
    }

    let active = true;
    const loadReminders = async () => {
      setRemindersState((prev) => ({ ...prev, loading: true }));
      try {
        const items = await listReminders({ usuarioId: user.id });
        if (!active) return;
        remindersRef.current = items;
        setRemindersState({ loading: false, items });
      } catch (error) {
        console.error("[layout] falha ao carregar lembretes:", error);
        if (!active) return;
        setRemindersState((prev) => ({ ...prev, loading: false }));
      }
    };

    loadReminders();

    const handleRemindersUpdated = () => {
      loadReminders();
    };

    window.addEventListener("meushape:reminders-updated", handleRemindersUpdated);
    return () => {
      active = false;
      window.removeEventListener("meushape:reminders-updated", handleRemindersUpdated);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const checkReminders = () => {
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = ((now.getDay() + 6) % 7) + 1;

      remindersRef.current.forEach((reminder) => {
        if (!reminder?.ativo) return;
        const reminderTime = normalizeReminderTime(reminder.horario);
        if (!reminderTime) return;
        const reminderMinutes = parseTimeToMinutes(reminderTime);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (reminderMinutes == null || nowMinutes == null) return;
        const diffMinutes = nowMinutes - reminderMinutes;
        if (diffMinutes < 0 || diffMinutes > 1) return;
        const allowedDays = normalizeReminderDays(reminder.dias_semana);
        if (allowedDays.length > 0 && !allowedDays.includes(currentDay)) return;

        const firedKey = `meushape:reminder:${reminder.id}`;
        const lastFired = localStorage.getItem(firedKey);
        const currentStamp = `${todayKey} ${currentTime}`;
        if (lastFired === currentStamp) return;
        localStorage.setItem(firedKey, currentStamp);
        triggerReminder(reminder);
      });
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(interval);
  }, [normalizeReminderDays, normalizeReminderTime, triggerReminder, user?.id]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    setNotificationsSeenCount((prev) => Math.max(prev, notifications.length));
    if (notificationsCleared) {
      setVisibleNotifications([]);
    } else {
      setVisibleNotifications(combinedNotifications);
    }

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
  }, [combinedNotifications, notifications.length, notificationsCleared, notificationsOpen]);

  useEffect(() => {
    if (notifications.length > lastNotificationCount) {
      setNotificationsCleared(false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(NOTIFICATION_CLEAR_KEY);
      }
    }
    setLastNotificationCount(notifications.length);
  }, [lastNotificationCount, notifications.length]);

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
    const wasCleared = typeof localStorage !== "undefined" && localStorage.getItem(NOTIFICATION_CLEAR_KEY) === "true";
    if (wasCleared) {
      setNotifications([]);
      setNotificationsCleared(true);
      setNotificationsError(null);
      setNotificationsLoading(false);
      return;
    }
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
    setNotificationsSeenCount((prev) => Math.max(prev, notifications.length));
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false);
    setNotificationsSeenCount((prev) => Math.max(prev, notifications.length));
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen((previous) => {
      const next = !previous;
      if (next) {
        const event = new CustomEvent("meushape:close-settings-menu");
        window.dispatchEvent(event);
        setNotificationsSeenCount((prev) => Math.max(prev, notifications.length));
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

      if (selectedPlan !== "premium") {
        toast.success("Plano gratuito já está disponível. Para recursos avançados, escolha o Shape Pro.");
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

  const handleOneTimeCheckout = useCallback(
    async (selectedPlan = DEFAULT_PLAN_ID) => {
      if (!user) {
        toast.error("Faça login para concluir a assinatura.");
        return;
      }

      if (selectedPlan !== "premium") {
        toast.success("Plano gratuito já está disponível. Para recursos avançados, escolha o Shape Pro.");
        return;
      }

      try {
        toast.loading("Redirecionando para o Mercado Pago...", { id: "subscription" });

        const response = await fetch(CHECKOUT_ENDPOINT, {
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
          throw new Error(payload.error ?? "Não foi possível criar o checkout agora.");
        }

        const payload = await response.json();
        toast.dismiss("subscription");

        if (payload.checkoutUrl) {
          window.location.href = payload.checkoutUrl;
          return;
        }

        toast.success("Checkout criado! Verifique seu email para concluir o processo.");
      } catch (error) {
        toast.dismiss("subscription");
        toast.error(error?.message ?? "Erro inesperado ao criar o checkout.");
        console.error("[layout] Erro ao criar checkout:", error);
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
            "rounded-xl border border-[#0f1f3c]/30 bg-[#0f1f3c]/95 px-4 py-3 text-sm text-white shadow-lg backdrop-blur dark:border-white/20 dark:bg-slate-900/95",
          style: {
            color: "#ffffff",
            background: "rgba(15,31,60,0.95)",
            border: "1px solid rgba(50,197,255,0.35)",
          },
        }}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[18rem] max-h-screen overflow-y-auto transform border-r border-white/40 bg-[#F5F7FB]/90 pb-6 backdrop-blur-md transition-transform duration-300 dark:border-white/10 dark:bg-slate-900/90 md:sticky md:top-0 md:inset-auto md:self-start md:z-20 md:h-screen md:max-h-none md:w-[19rem] md:flex-shrink-0 md:translate-x-0 md:rounded-none md:bg-[#F5F7FB]/85 md:shadow-none md:dark:bg-slate-900/85 lg:w-[21rem] ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between border-b border-white/35 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Logo Meu Shape" className="h-10 w-10 rounded-xl object-contain" />
            <div>
              <span className="text-xs uppercase tracking-[0.28em] text-[#4A5568]/70 dark:text-[#cfc2ff]/60">
                Performance construída com inteligência
              </span>
              <h1 className="mt-1 text-xl font-semibold text-[#1f2933] dark:text-[#f8f6ff]">{BRAND_NAME}</h1>
            </div>
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
                <img
                  src={logoSrc}
                  alt="Logo Meu Shape"
                  className="h-9 w-9 rounded-xl object-contain md:hidden"
                />
                <div className="hidden md:block">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#4A5568]/70 dark:text-[#cfc2ff]/70">Bem-vindo</p>
                  <h2 className="text-sm font-semibold text-[#1f2933] leading-tight dark:text-white md:text-base">
                    {currentPageTitle}
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
                    {!notificationsOpen && badgeCount > 0 ? (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#32C5FF] text-[11px] font-semibold text-white shadow">
                        {badgeCount}
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
              notifications={notificationsCleared ? [] : visibleNotifications}
              onClose={handleCloseNotifications}
              container={typeof document !== "undefined" ? document.body : null}
            />
            {reminderModal && portalTarget
              ? createPortal(
                  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] border border-white/20 bg-white/95 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
                      <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Lembrete</p>
                      <h3 className="mt-3 text-xl font-semibold text-[rgb(var(--text-primary))]">
                        {reminderModal.titulo}
                      </h3>
                      <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
                        {reminderModal.horario ? `Horario: ${reminderModal.horario}` : "Horario nao informado"}
                      </p>
                      <p className="text-sm text-[rgb(var(--text-secondary))]">
                        {reminderModal.dias ? `Dias: ${reminderModal.dias}` : "Dias nao informados"}
                      </p>
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setReminderModal(null)}
                          className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]"
                        >
                          Ok
                        </button>
                      </div>
                    </div>
                  </div>,
                  portalTarget,
                )
              : null}
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
              <div className="mb-4 px-1 md:hidden">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#4A5568]/70 dark:text-[#cfc2ff]/70">Bem-vindo</p>
                <h2 className="text-sm font-semibold text-[#1f2933] leading-tight dark:text-white">
                  {currentPageTitle}
                </h2>
              </div>
              <Outlet />
            </main>
            <AudioPlaylistBar />
            <WaterQuickActions />

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
          onCheckoutPix={handleOneTimeCheckout}
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

function InsightsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 18V6a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 10h5M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 4v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 4v16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 16.5V12M12 16.5V8M16.5 16.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 9.5l4.5-2.5 4.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function MusicIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 4.5l5 1v8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8.5l5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 14V6.5l5-1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeedIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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




