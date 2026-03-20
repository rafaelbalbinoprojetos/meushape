import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { registerWaterIntake } from "../services/water.js";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

const PRESET_AMOUNTS = [150, 200, 300, 500];

export default function WaterQuickActions() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 768px)");
    const handle = (event) => setIsMobile(event.matches);
    handle(query);
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  const handleRegister = async (ml) => {
    if (!user?.id) {
      toast.error("Entre para registrar sua hidratação.");
      return;
    }
    const quantidadeMl = Number(ml || custom);
    if (!Number.isFinite(quantidadeMl) || quantidadeMl <= 0) {
      toast.error("Informe a quantidade em ml.");
      return;
    }
    setSaving(true);
    try {
      await registerWaterIntake({ usuarioId: user.id, quantidadeMl });
      toast.success("Hidratação registrada.");
      setCustom("");
      setOpen(false);
    } catch (error) {
      console.error("[WaterQuickActions] falha ao salvar água:", error);
      toast.error(error?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);
  const animationStyles = useMemo(
    () => `
    @keyframes waterFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes waterPopIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  `,
    [],
  );

  if (!portalTarget) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Registrar água"
        style={{ position: "fixed", bottom: isMobile ? "84px" : "18px", right: "18px", zIndex: 60 }}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#32C5FF] to-[#67FF9A] text-[#041220] shadow-xl shadow-[#32C5FF]/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32C5FF]/40"
      >
        💧
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex min-h-screen items-center justify-center bg-black/60 px-4 py-8"
          style={{ animation: "waterFadeIn 180ms ease" }}
        >
          <style>{animationStyles}</style>
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[rgb(var(--surface-card))] p-5 text-[rgb(var(--text-primary))] shadow-2xl backdrop-blur dark:border-white/15 dark:text-white"
            style={{ position: "relative", animation: "waterPopIn 200ms ease" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Hidratação</p>
                <h2 className="text-lg font-semibold">Registrar água</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))] transition hover:border-[color:var(--border-strong)] hover:text-[rgb(var(--text-primary))] dark:border-white/20 dark:text-white/70 dark:hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleRegister(amount)}
                  disabled={saving}
                  className="rounded-xl border border-[#32C5FF]/40 px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:bg-[#32C5FF]/10 dark:border-white/30 dark:text-white"
                >
                  {amount} ml
                </button>
              ))}
              <div className="col-span-2 grid grid-cols-[1fr,auto] gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  placeholder="Outro (ml)"
                  className="rounded-xl border border-[color:var(--border-soft)] bg-white/70 px-3 py-2 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[#32C5FF] dark:border-white/20 dark:bg-slate-900/70 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleRegister(custom || 0)}
                  disabled={saving}
                  className="rounded-xl border border-[#67FF9A]/50 px-3 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:bg-[#67FF9A]/10 dark:border-white/30 dark:text-white"
                >
                  Registrar
                </button>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[rgb(var(--text-secondary))] dark:text-white/70">
              Toque em um valor rápido ou digite outro número para lançar a hidratação.
            </p>
          </div>
        </div>
      ) : null}
    </>,
    portalTarget,
  );
}
