import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";

const FALLBACK_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const API_BASE = (import.meta.env.VITE_API_BASE || FALLBACK_ORIGIN).replace(/\/$/, "");
const ADMIN_ENDPOINT = `${API_BASE}/api/admin/subscriptions`;

function monthKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

export default function SubscriptionAdminPage() {
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(monthKey());

  const token = session?.access_token || "";
  const isAuthenticated = Boolean(token && user?.id);

  const users = useMemo(() => rows || [], [rows]);

  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }

  async function fetchUsers() {
    if (!isAuthenticated) {
      toast.error("Faça login para acessar a gestão.");
      return;
    }
    setLoading(true);
    try {
      const url = `${ADMIN_ENDPOINT}?month=${encodeURIComponent(month)}&q=${encodeURIComponent(search)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await parseResponse(res);
      if (!res.ok) {
        throw new Error(payload.error || "Falha ao carregar usuários.");
      }
      setRows(payload.users || []);
      toast.success(`Carregado: ${payload.users?.length || 0} usuário(s).`);
    } catch (error) {
      toast.error(error?.message || "Erro ao carregar gestão.");
    } finally {
      setLoading(false);
    }
  }

  async function updateTier(targetUserId, tier) {
    if (!isAuthenticated) return;
    setSavingId(targetUserId);
    try {
      const res = await fetch(ADMIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "set_tier",
          userId: targetUserId,
          tier,
        }),
      });
      const payload = await parseResponse(res);
      if (!res.ok) {
        throw new Error(payload.error || "Falha ao atualizar assinatura.");
      }
      toast.success(`Assinatura atualizada para ${tier}.`);
      await fetchUsers();
    } catch (error) {
      toast.error(error?.message || "Erro ao atualizar assinatura.");
    } finally {
      setSavingId(null);
    }
  }

  async function resetUsage(targetUserId) {
    if (!isAuthenticated) return;
    setSavingId(targetUserId);
    try {
      const res = await fetch(ADMIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "reset_usage",
          userId: targetUserId,
          month,
        }),
      });
      const payload = await parseResponse(res);
      if (!res.ok) {
        throw new Error(payload.error || "Falha ao resetar uso mensal.");
      }
      toast.success("Uso mensal resetado.");
      await fetchUsers();
    } catch (error) {
      toast.error(error?.message || "Erro ao resetar uso.");
    } finally {
      setSavingId(null);
    }
  }

  async function grantProToMe() {
    if (!user?.id) return;
    await updateTier(user.id, "premium");
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[rgb(var(--border-soft))] bg-[rgb(var(--surface-card))] p-5 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-subtle))]">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">Gestão de assinaturas e permissões IA</h1>
        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
          Conceda ou remova Shape Pro e controle o uso mensal da IA na tabela <code>ai_usage_meushape</code>.
        </p>
      </header>

      <div className="rounded-3xl border border-[rgb(var(--border-soft))] bg-[rgb(var(--surface-card))] p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="month"
            value={month.slice(0, 7)}
            onChange={(ev) => setMonth(`${ev.target.value}-01`)}
            className="rounded-xl border border-[rgb(var(--border-soft))] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Buscar por e-mail ou user id"
            className="rounded-xl border border-[rgb(var(--border-soft))] bg-transparent px-3 py-2 text-sm md:col-span-2"
          />
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="rounded-xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={grantProToMe}
            className="rounded-xl border border-[rgb(var(--border-soft))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Conceder Pro para mim
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[rgb(var(--border-soft))] bg-[rgb(var(--surface-card))] p-3">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border-soft))] text-[rgb(var(--text-subtle))]">
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Plano</th>
              <th className="px-3 py-2">Criado em</th>
              <th className="px-3 py-2">Uso IA no mês</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => {
              const usage = item.usage || {};
              const isSaving = savingId === item.id;
              return (
                <tr key={item.id} className="border-b border-[rgb(var(--border-soft))]">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[rgb(var(--text-primary))]">{item.email || "-"}</div>
                    <div className="text-xs text-[rgb(var(--text-subtle))]">{item.id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border border-[rgb(var(--border-soft))] px-2 py-1 text-xs uppercase">
                      {item.tier || "free"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">{formatDateTime(item.created_at)}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>chat: {usage.chat_msgs || 0}</div>
                    <div>insights: {usage.insights || 0}</div>
                    <div>fotos: {usage.fotos_analisadas || 0}</div>
                    <div>fichas: {usage.fichas_geradas || 0}</div>
                    <div>relatórios: {usage.relatorios || 0}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateTier(item.id, "premium")}
                        disabled={isSaving}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Dar Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTier(item.id, "free")}
                        disabled={isSaving}
                        className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Remover Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => resetUsage(item.id)}
                        disabled={isSaving}
                        className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Zerar uso
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-[rgb(var(--text-subtle))]">
                  Sem usuários carregados. Clique em Atualizar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
