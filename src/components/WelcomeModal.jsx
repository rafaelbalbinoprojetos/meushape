import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function WelcomeModal({ open, onStart, onSeePlans, onClose }) {
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!open || !portalTarget) {
      return undefined;
    }

    const { overflow } = portalTarget.style;
    portalTarget.style.overflow = "hidden";

    return () => {
      portalTarget.style.overflow = overflow;
    };
  }, [open, portalTarget]);

  if (!portalTarget) return null;
  if (!open) return null;

  const handleRootClick = () => {
    onClose?.();
  };

  const handleDialogClick = (event) => {
    event.stopPropagation();
  };

  const handleCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose?.();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-900/70 px-4 py-8 sm:py-12 backdrop-blur"
      onClick={handleRootClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b1530] via-[#2b1f44] to-[#46356d] text-white shadow-2xl shadow-[#32C5FF]/25"
        onClick={handleDialogClick}
      >
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#32C5FF]/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#67FF9A]/25 blur-3xl" aria-hidden="true" />

        <button
          type="button"
          onClick={handleCloseClick}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Fechar boas-vindas"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
            <path strokeWidth="1.6" strokeLinecap="round" d="M6 6l12 12" />
            <path strokeWidth="1.6" strokeLinecap="round" d="M6 18L18 6" />
          </svg>
              </button>

        <div className="relative max-h-[min(90vh,640px)] overflow-y-auto px-8 py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Bem-vindo
          </span>

          <div className="mt-6 space-y-3">
            <h2 id="welcome-modal-title" className="text-2xl font-semibold leading-tight text-white">
              Bem-vindo ao MEU SHAPE!
            </h2>
            <p className="text-sm text-[#e6ddff]/80">
              Voc� est� no plano gratuito. Experimente 7 dias do Shape Pro com treinos ilimitados, nutri��o din�mica e Coach IA.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[#e6ddff]/85">
            <p className="font-medium text-white">Durante o teste gratuito voc� desbloqueia:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Treinos completos com v�deos, cron�metro inteligente e ajustes autom�ticos de carga.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Plano alimentar com macros recalculados e exporta��o em PDF.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">-</span>
                <span>Coach virtual ilimitado com recomenda��es de treino, refei��o e recupera��o.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#32C5FF] via-[#0F1F3C] to-[#67FF9A] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#32C5FF]/30 transition hover:from-[#574de3] hover:via-[#3c2f75] hover:to-[#8f683f] sm:w-auto"
            >
              Come�ar agora
            </button>
            <button
              type="button"
              onClick={onSeePlans}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/35 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Conhecer planos Premium
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#e6ddff]/70">
            Cancelamento simples, sem cart�o at� o fim do teste. Ajuste o plano quando quiser.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
}
