import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { MOBILE_NAV_LINKS, normalizeMobileNavSelection } from "../data/navigation.js";
import { supabase } from "../lib/supabase.js";
import { createReminder, deleteReminder, listReminders, updateReminder } from "../services/reminders.js";

const MOBILE_NAV_LIMIT = 5;
const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET?.trim() || "perfil";
const MASTER_EMAIL = "balbino10@hotmail.com";
const AI_LIMITS_PRO = {
  fichas_geradas: 8,
  fotos_analisadas: 186,
  chat_msgs: 300,
  insights: 20,
  relatorios: 10,
};

const buildMonthKey = () => {
  const now = new Date();
  const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  return monthDate.toISOString().slice(0, 10);
};

const normalizeEnumValue = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_");

const objectiveEnumFromLabel = (value) => {
  const normalized = normalizeEnumValue(value);
  if (normalized.includes("emagrec")) return "emagrecimento";
  if (normalized.includes("saude")) return "saude_geral";
  return "hipertrofia";
};

const levelEnumFromLabel = (value) => {
  const normalized = normalizeEnumValue(value);
  if (normalized.includes("avanc")) return "avancado";
  if (normalized.includes("inter")) return "intermediario";
  return "iniciante";
};

const objectiveLabelFromEnum = (value) => {
  const normalized = normalizeEnumValue(value);
  if (normalized.includes("emagrec")) return "Emagrecimento";
  if (normalized.includes("saude")) return "Saude geral";
  return "Hipertrofia";
};

const levelLabelFromEnum = (value) => {
  const normalized = normalizeEnumValue(value);
  if (normalized.includes("avanc")) return "Avancado";
  if (normalized.includes("inter")) return "Intermediario";
  return "Iniciante";
};

const REMINDER_DAYS = [
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 7 },
];

export default function ProfilePage() {
  const { user, updateUserMetadata } = useAuth();
  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);
  const [profileForm, setProfileForm] = useState(() => ({
    name: metadata.nome ?? user?.email ?? "",
    objective: metadata.objective ?? "Hipertrofia",
    level: metadata.level ?? "Intermediario",
    height: metadata.height_cm ?? "",
    weight: metadata.weight_kg ?? "",
    saude_observacoes: "",
    restricoes_alimentares: "",
    alergias: "",
    medicacoes: "",
  }));
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [mobileNavSelection, setMobileNavSelection] = useState(() =>
    normalizeMobileNavSelection(metadata.mobile_nav_paths),
  );
  const [mobileNavSaving, setMobileNavSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(metadata.avatar_url || metadata.photo_url || null);
  const [lifetimeEmail, setLifetimeEmail] = useState("");
  const [lifetimeSaving, setLifetimeSaving] = useState(false);
  const [lifetimeAccessList, setLifetimeAccessList] = useState(
    Array.isArray(metadata.lifetime_access_emails) ? metadata.lifetime_access_emails : [],
  );
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [remindersState, setRemindersState] = useState({ loading: false, error: null, items: [] });
  const [reminderForm, setReminderForm] = useState({
    titulo: "",
    horario: "08:00",
    dias_semana: [1, 2, 3, 4, 5, 6, 7],
    ativo: true,
  });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderDeletingId, setReminderDeletingId] = useState(null);
  const [aiUsageState, setAiUsageState] = useState({ loading: false, error: null, data: null });
  const aiMonthKey = useMemo(() => buildMonthKey(), []);
  const isPro = useMemo(() => {
    const tier = metadata.subscription_tier ?? metadata.plan ?? "";
    return ["premium", "pro", "shape pro", "shape_pro", "shapepro", "shape-pro"].includes(String(tier).toLowerCase());
  }, [metadata.plan, metadata.subscription_tier]);

  const isMaster = (user?.email ?? "").toLowerCase() === MASTER_EMAIL;

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReminderChange = (field, value) => {
    setReminderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSyncLifetimeList = (nextList) => {
    const normalized = Array.from(new Set((nextList ?? []).map((item) => (item || "").trim().toLowerCase()).filter(Boolean)));
    setLifetimeAccessList(normalized);
    return normalized;
  };

  React.useEffect(() => {
    handleSyncLifetimeList(metadata.lifetime_access_emails);
  }, [metadata.lifetime_access_emails]);

  React.useEffect(() => {
    setProfileLoaded(false);
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id || profileLoaded) return;
    let active = true;
    async function loadProfile() {
      setProfileLoaded(true);
      const { data, error } = await supabase
        .from("perfis")
        .select("nome, objetivo, nivel, altura, peso, foto_url, saude_observacoes, restricoes_alimentares, alergias, medicacoes")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error("[Profile] falha ao carregar perfis:", error);
        return;
      }
      if (!data) return;
      setProfileForm((prev) => ({
        ...prev,
        name: data.nome ?? prev.name,
        objective: data.objetivo ? objectiveLabelFromEnum(data.objetivo) : prev.objective,
        level: data.nivel ? levelLabelFromEnum(data.nivel) : prev.level,
        height:
          data.altura != null && Number.isFinite(Number(data.altura))
            ? String(Math.round(Number(data.altura) * 100))
            : prev.height,
        weight: data.peso != null ? String(data.peso) : prev.weight,
        saude_observacoes: data.saude_observacoes ?? prev.saude_observacoes,
        restricoes_alimentares: data.restricoes_alimentares ?? prev.restricoes_alimentares,
        alergias: data.alergias ?? prev.alergias,
        medicacoes: data.medicacoes ?? prev.medicacoes,
      }));
      setAvatarPreview(data.foto_url || metadata.avatar_url || metadata.photo_url || null);
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user?.id, profileLoaded, metadata.avatar_url, metadata.photo_url]);

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const loadReminders = async () => {
      setRemindersState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const items = await listReminders({ usuarioId: user.id });
        if (!active) return;
        setRemindersState({ loading: false, error: null, items });
      } catch (error) {
        console.error("[Profile] falha ao carregar lembretes:", error);
        if (!active) return;
        setRemindersState({
          loading: false,
          error: error?.message ?? "Nao foi possivel carregar lembretes.",
          items: [],
        });
      }
    };
    loadReminders();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    async function loadAiUsage() {
      if (!user?.id) {
        setAiUsageState({ loading: false, error: null, data: null });
        return;
      }
      setAiUsageState((prev) => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase
        .from("ai_usage_meushape")
        .select("fichas_geradas, fotos_analisadas, chat_msgs, insights, relatorios")
        .eq("user_id", user.id)
        .eq("month", aiMonthKey)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setAiUsageState({ loading: false, error: error.message, data: null });
        return;
      }
      setAiUsageState({ loading: false, error: null, data });
    }

    loadAiUsage();
    return () => {
      active = false;
    };
  }, [aiMonthKey, user?.id]);

  const aiUsage = aiUsageState.data ?? {
    fichas_geradas: 0,
    fotos_analisadas: 0,
    chat_msgs: 0,
    insights: 0,
    relatorios: 0,
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notificacoes nao suportadas neste dispositivo.");
      setNotificationPermission("unsupported");
      return;
    }
    const status = await Notification.requestPermission();
    setNotificationPermission(status);
    if (status === "granted") {
      toast.success("Notificacoes ativadas.");
    } else {
      toast.error("Permissao de notificacao negada.");
    }
  };

  const handleTestNotification = () => {
    toast("🔔 Teste de notificacao do MEU SHAPE", { duration: 5000 });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Meu Shape", {
          body: "Teste de notificacao: lembretes ativados.",
          icon: "/images/logo_light.png",
        });
      } catch (error) {
        console.warn("[Profile] falha ao testar notificacao:", error);
      }
    }
  };

  const handleAddReminder = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error("Entre para salvar lembretes.");
      return;
    }
    if (!reminderForm.titulo.trim()) {
      toast.error("Informe o titulo do lembrete.");
      return;
    }
    const normalizeDays = (days) => {
      if (!Array.isArray(days)) return [];
      const sanitized = days
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 7);
      return Array.from(new Set(sanitized)).sort((a, b) => a - b);
    };
    const normalizedDays = normalizeDays(reminderForm.dias_semana);
    const daysToSave = normalizedDays.length > 0 ? normalizedDays : [1, 2, 3, 4, 5, 6, 7];
    setReminderSaving(true);
    try {
      const created = await createReminder({
        usuarioId: user.id,
        titulo: reminderForm.titulo.trim(),
        horario: reminderForm.horario,
        diasSemana: daysToSave,
        ativo: reminderForm.ativo,
      });
      setRemindersState((prev) => ({
        loading: false,
        error: null,
        items: [...prev.items, created].sort((a, b) => (a.horario || "").localeCompare(b.horario || "")),
      }));
      setReminderForm((prev) => ({ ...prev, titulo: "" }));
      window.dispatchEvent(new Event("meushape:reminders-updated"));
      toast.success("Lembrete criado.");
    } catch (error) {
      toast.error(error?.message ?? "Nao foi possivel criar o lembrete.");
    } finally {
      setReminderSaving(false);
    }
  };

  const handleToggleReminderDay = (value) => {
    setReminderForm((prev) => {
      const exists = prev.dias_semana.includes(value);
      const nextDays = exists
        ? prev.dias_semana.filter((day) => day !== value)
        : [...prev.dias_semana, value];
      return { ...prev, dias_semana: nextDays.sort((a, b) => a - b) };
    });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const numOrNull = (value) => {
        if (value === "" || value === null || value === undefined) return null;
        const normalized = String(value).replace(",", ".").replace(/[^0-9.\-]/g, "");
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const heightCm = numOrNull(profileForm.height);
      const altura = heightCm != null ? Number((heightCm / 100).toFixed(2)) : null;
      const peso = numOrNull(profileForm.weight);
      const { error: perfilError } = await supabase
        .from("perfis")
        .upsert(
          {
            id: user?.id,
            nome: profileForm.name || null,
            objetivo: objectiveEnumFromLabel(profileForm.objective),
            nivel: levelEnumFromLabel(profileForm.level),
            altura,
            peso,
            foto_url: avatarPreview || null,
            saude_observacoes: profileForm.saude_observacoes || null,
            restricoes_alimentares: profileForm.restricoes_alimentares || null,
            alergias: profileForm.alergias || null,
            medicacoes: profileForm.medicacoes || null,
          },
          { onConflict: "id" },
        );
      if (perfilError) throw perfilError;
      await updateUserMetadata({
        nome: profileForm.name,
        objective: profileForm.objective,
        level: profileForm.level,
        height_cm: profileForm.height,
        weight_kg: profileForm.weight,
      });
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("[Profile] falha ao salvar perfil:", error);
      toast.error("Nao foi possivel atualizar seus dados agora.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleShortcut = (path) => {
    setMobileNavSelection((prev) => {
      if (prev.includes(path)) {
        return prev.filter((item) => item !== path);
      }
      if (prev.length >= MOBILE_NAV_LIMIT) {
        toast.error(`Escolha no maximo ${MOBILE_NAV_LIMIT} atalhos.`);
        return prev;
      }
      return [...prev, path];
    });
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error("Entre para salvar sua foto.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Escolha uma imagem de até 5MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        throw new Error("Nao foi possivel obter a URL publica da imagem.");
      }

      const { error: perfilError } = await supabase
        .from("perfis")
        .upsert({ id: user.id, foto_url: publicUrl }, { onConflict: "id" });
      if (perfilError) throw perfilError;

      await updateUserMetadata({
        avatar_url: publicUrl,
        photo_url: publicUrl,
      });

      setAvatarPreview(publicUrl);
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error("[Profile] falha upload avatar:", error);
      const message =
        error?.message?.toLowerCase()?.includes("bucket not found")
          ? "Bucket de avatar nao encontrado. Crie o bucket e habilite acesso publico."
          : error?.message ?? "Nao foi possivel enviar sua foto agora.";
      toast.error(message);
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleAddLifetimeAccess = async (event) => {
    event.preventDefault();
    if (!isMaster) {
      toast.error("Apenas o usuario master pode conceder acesso vitalicio.");
      return;
    }
    const email = lifetimeEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Informe um email valido.");
      return;
    }
    const nextList = handleSyncLifetimeList([...lifetimeAccessList, email]);
    setLifetimeSaving(true);
    try {
      await updateUserMetadata({ lifetime_access_emails: nextList });
      setLifetimeEmail("");
      toast.success("Acesso vitalicio concedido.");
    } catch (error) {
      console.error("[Profile] falha ao conceder acesso vitalicio:", error);
      toast.error(error?.message ?? "Nao foi possivel conceder acesso agora.");
    } finally {
      setLifetimeSaving(false);
    }
  };

  const handleSaveShortcuts = async (event) => {
    event.preventDefault();
    setMobileNavSaving(true);
    try {
      await updateUserMetadata({ mobile_nav_paths: mobileNavSelection });
      toast.success("Atalhos atualizados!");
    } catch (error) {
      console.error("[Profile] falha ao salvar atalhos:", error);
      toast.error("Nao foi possivel atualizar os atalhos agora.");
    } finally {
      setMobileNavSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Perfil</p>
        <h1 className="mt-3 text-3xl font-semibold">Personalize seus dados para treinos e nutrição.</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Quanto mais contexto voce compartilhar, mais preciso fica o coach, a nutricao automatizada e os ajustes de carga.
        </p>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Dados pessoais</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Bio de treino</h2>
        </header>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveProfile}>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-3xl border border-white/60 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Foto do usuario"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[#32C5FF]/60"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#32C5FF] to-[#67FF9A] text-lg font-semibold text-[#041220] ring-2 ring-[#32C5FF]/60">
                  {profileForm.name?.slice(0, 2)?.toUpperCase() || "MS"}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Foto</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">JPG ou PNG até 5MB.</p>
              </div>
            </div>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#32C5FF]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#032840] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10 dark:text-white">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
              {avatarUploading ? "Enviando..." : "Enviar foto"}
            </label>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nome</span>
            <input
              value={profileForm.name}
              onChange={(event) => handleProfileChange("name", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Objetivo atual</span>
            <select
              value={profileForm.objective}
              onChange={(event) => handleProfileChange("objective", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Hipertrofia</option>
              <option>Emagrecimento</option>
              <option>Saude geral</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nivel</span>
            <select
              value={profileForm.level}
              onChange={(event) => handleProfileChange("level", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Iniciante</option>
              <option>Intermediario</option>
              <option>Avancado</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Altura (cm)</span>
            <input
              type="number"
              value={profileForm.height}
              onChange={(event) => handleProfileChange("height", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Peso atual (kg)</span>
            <input
              type="number"
              value={profileForm.weight}
              onChange={(event) => handleProfileChange("weight", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-[rgb(var(--text-secondary))]">Observações de saúde</span>
            <textarea
              rows="2"
              value={profileForm.saude_observacoes}
              onChange={(event) => handleProfileChange("saude_observacoes", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Ex.: hernia de disco, dor no joelho"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-[rgb(var(--text-secondary))]">Restricoes alimentares</span>
            <textarea
              rows="2"
              value={profileForm.restricoes_alimentares}
              onChange={(event) => handleProfileChange("restricoes_alimentares", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Ex.: lactose, glúten, vegetariano"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-[rgb(var(--text-secondary))]">Alergias</span>
            <textarea
              rows="2"
              value={profileForm.alergias}
              onChange={(event) => handleProfileChange("alergias", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Ex.: amendoim, frutos do mar"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-[rgb(var(--text-secondary))]">Medicacoes</span>
            <textarea
              rows="2"
              value={profileForm.medicacoes}
              onChange={(event) => handleProfileChange("medicacoes", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Ex.: anti-inflamatórios, contínuos"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-3xl bg-[#32C5FF] px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg shadow-slate-900/20 transition hover:shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f1f3c] dark:text-white"
            >
              {savingProfile ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Lembretes</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Notificacoes personalizadas</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Crie lembretes de creatina, whey, agua e qualquer outro habito importante.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Permissao de notificacao</p>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              {notificationPermission === "granted"
                ? "Ativada"
                : notificationPermission === "denied"
                  ? "Negada"
                  : notificationPermission === "unsupported"
                    ? "Indisponivel"
                    : "Nao solicitada"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className="rounded-2xl border border-[#32C5FF]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#032840] transition hover:border-[#32C5FF] hover:bg-[#32C5FF]/10 dark:text-white"
            >
              Ativar notificacoes
            </button>
            <button
              type="button"
              onClick={handleTestNotification}
              className="rounded-2xl border border-white/50 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[rgb(var(--text-secondary))] transition hover:border-[#32C5FF]/50 hover:text-[rgb(var(--text-primary))] dark:border-slate-700 dark:bg-slate-900/70"
            >
              Testar notificacao
            </button>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-[2fr,1fr,1fr] items-end" onSubmit={handleAddReminder}>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Lembrete</span>
            <input
              value={reminderForm.titulo}
              onChange={(event) => handleReminderChange("titulo", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Ex.: Tomar creatina"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Horario</span>
            <input
              type="time"
              value={reminderForm.horario}
              onChange={(event) => handleReminderChange("horario", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={reminderSaving}
            className="rounded-3xl bg-[#32C5FF] px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg shadow-slate-900/20 transition hover:shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f1f3c] dark:text-white"
          >
            {reminderSaving ? "Salvando..." : "Adicionar lembrete"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {REMINDER_DAYS.map((day) => {
            const active = reminderForm.dias_semana.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => handleToggleReminderDay(day.value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  active
                    ? "border-[#32C5FF]/60 bg-[#E6F4FF]/80 text-[#0F1F3C]"
                    : "border-white/40 bg-white/70 text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900/70"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          {remindersState.loading ? (
            <p className="text-sm text-[rgb(var(--text-secondary))]">Carregando lembretes...</p>
          ) : null}
          {remindersState.error ? (
            <p className="text-sm text-rose-500">{remindersState.error}</p>
          ) : null}
          {remindersState.items.length === 0 && !remindersState.loading ? (
            <div className="rounded-3xl border border-dashed border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:border-slate-800 dark:bg-slate-900/60">
              Nenhum lembrete cadastrado ainda.
            </div>
          ) : null}
          {remindersState.items.map((reminder) => (
            <div
              key={reminder.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/40 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{reminder.titulo}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">
                  {String(reminder.horario || "").slice(0, 5)} •{" "}
                  {Array.isArray(reminder.dias_semana) && reminder.dias_semana.length > 0
                    ? reminder.dias_semana
                        .map((day) => REMINDER_DAYS.find((item) => item.value === day)?.label || day)
                        .join(", ")
                    : "Todos os dias"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!user?.id) return;
                    try {
                      const updated = await updateReminder({
                        reminderId: reminder.id,
                        usuarioId: user.id,
                        fields: { ativo: !reminder.ativo },
                      });
                      setRemindersState((prev) => ({
                        ...prev,
                        items: prev.items.map((item) => (item.id === reminder.id ? updated : item)),
                      }));
                      window.dispatchEvent(new Event("meushape:reminders-updated"));
                    } catch (error) {
                      toast.error(error?.message ?? "Nao foi possivel atualizar o lembrete.");
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition ${
                    reminder.ativo
                      ? "border-emerald-300/60 bg-emerald-50/80 text-emerald-600"
                      : "border-white/40 bg-white/70 text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900/70"
                  }`}
                >
                  {reminder.ativo ? "Ativo" : "Pausado"}
                </button>
                {reminderDeletingId === reminder.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReminderDeletingId(null)}
                      className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[rgb(var(--text-secondary))] dark:border-slate-700 dark:bg-slate-900/70"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          await deleteReminder({ reminderId: reminder.id, usuarioId: user.id });
                          setRemindersState((prev) => ({
                            ...prev,
                            items: prev.items.filter((item) => item.id !== reminder.id),
                          }));
                          setReminderDeletingId(null);
                          window.dispatchEvent(new Event("meushape:reminders-updated"));
                          toast.success("Lembrete excluido.");
                        } catch (error) {
                          toast.error(error?.message ?? "Nao foi possivel excluir o lembrete.");
                        }
                      }}
                      className="rounded-full border border-rose-300/60 bg-rose-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-600"
                    >
                      Excluir
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReminderDeletingId(reminder.id)}
                    className="rounded-full border border-rose-300/60 bg-rose-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-600 transition hover:border-rose-400 hover:bg-rose-100"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Uso de IA (mensal)</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Limites do seu plano</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            O ciclo reinicia todo mês. Plano Pro libera limites maiores e uso contínuo.
          </p>
        </header>

        {aiUsageState.loading ? (
          <p className="text-sm text-[rgb(var(--text-secondary))]">Carregando uso do mês...</p>
        ) : null}
        {aiUsageState.error ? (
          <p className="text-sm text-[#FF8F8F]">Não foi possível carregar o uso: {aiUsageState.error}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Fichas inteligentes", key: "fichas_geradas", suffix: "" },
            { label: "Fotos analisadas", key: "fotos_analisadas", suffix: "" },
            { label: "Mensagens no coach", key: "chat_msgs", suffix: "" },
            { label: "Insights IA", key: "insights", suffix: "" },
            { label: "Relatórios/PDF", key: "relatorios", suffix: "" },
          ].map((item) => {
            const limit = AI_LIMITS_PRO[item.key];
            const current = aiUsage[item.key] ?? 0;
            const display = isPro ? `${current}/${limit}` : "Disponível no Shape Pro";
            return (
              <div
                key={item.key}
                className="rounded-3xl border border-white/40 bg-white/70 p-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))]">{display}</p>
                {isPro ? (
                  <p className="text-xs text-[rgb(var(--text-secondary))]">Restante: {Math.max(limit - current, 0)}</p>
                ) : (
                  <p className="text-xs text-[rgb(var(--text-secondary))]">Faça upgrade para liberar este recurso.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {isMaster ? (
        <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <header className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Acesso vitalicio</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Liberar familiares</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Apenas o usuario master ({MASTER_EMAIL}) pode conceder acesso vitalicio.
            </p>
          </header>
          <form className="space-y-4" onSubmit={handleAddLifetimeAccess}>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="email"
                value={lifetimeEmail}
                onChange={(event) => setLifetimeEmail(event.target.value)}
                disabled={lifetimeSaving}
                placeholder="email@familia.com"
                className="min-w-[260px] flex-1 rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-2 focus:ring-[#32C5FF]/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={lifetimeSaving}
                className="rounded-2xl bg-gradient-to-r from-[#32C5FF] to-[#67FF9A] px-4 py-2 text-sm font-semibold text-[#041220] shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {lifetimeSaving ? "Salvando..." : "Conceder acesso"}
              </button>
            </div>
            <div className="rounded-3xl border border-white/40 bg-white/70 p-4 text-sm text-[rgb(var(--text-primary))] dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-subtle))]">Emails com acesso vitalicio</p>
              {lifetimeAccessList.length === 0 ? (
                <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">Nenhum email liberado ainda.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {lifetimeAccessList.map((email) => (
                    <li key={email} className="rounded-2xl border border-white/30 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
                      {email}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Menu inferior (mobile)</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Atalhos rapidos</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Escolha ate {MOBILE_NAV_LIMIT} atalhos para o menu inferior em celulares. Eles permanecem sempre visiveis.
          </p>
        </header>
        <form className="space-y-6" onSubmit={handleSaveShortcuts}>
          <div className="grid gap-4 md:grid-cols-2">
            {MOBILE_NAV_LINKS.map((link) => {
              const checked = mobileNavSelection.includes(link.to);
              return (
                <label
                  key={link.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-3 transition ${
                    checked
                      ? "border-[#32C5FF] bg-[#32C5FF]/10 text-[#032840]"
                      : "border-white/60 bg-white text-[rgb(var(--text-primary))] dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleShortcut(link.to)}
                    className="mt-1 h-4 w-4 rounded border-2 border-[#32C5FF] text-[#32C5FF] focus:ring-[#32C5FF]"
                  />
                  <div>
                    <p className="text-sm font-semibold">{link.label}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{link.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              {mobileNavSelection.length} / {MOBILE_NAV_LIMIT} atalhos selecionados
            </p>
            <button
              type="submit"
              disabled={mobileNavSaving}
              className="rounded-3xl bg-[#32C5FF] px-5 py-3 text-sm font-semibold text-[#041220] shadow-lg shadow-slate-900/20 transition hover:shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f1f3c] dark:text-white"
            >
              {mobileNavSaving ? "Salvando..." : "Salvar atalhos"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
