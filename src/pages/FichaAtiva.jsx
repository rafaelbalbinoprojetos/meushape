import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSelectedFichaPreference } from "../services/profile.js";
import { getFichaById } from "../services/fichas.js";
import { loadSelectedFicha, saveSelectedFicha } from "../utils/selectedFicha.js";

export default function FichaAtivaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function resolveFicha() {
      // Primeiro, tenta local
      let targetId = loadSelectedFicha(user?.id)?.id ?? null;

      // Se não tiver local, tenta buscar preferencia remota
      if (!targetId && user?.id) {
        try {
          const remoteId = await getSelectedFichaPreference(user.id);
          if (remoteId) {
            const ficha = await getFichaById(remoteId);
            if (ficha) {
              saveSelectedFicha(ficha, user.id);
              targetId = ficha.id;
            }
          }
        } catch (error) {
          console.error("[FichaAtiva] falha ao recuperar ficha preferida:", error);
        }
      }

      if (!active) return;
      if (targetId) {
        navigate(`/fichas/${targetId}`, { replace: true });
      } else {
        navigate("/fichas", { replace: true });
      }
    }

    resolveFicha();
    return () => {
      active = false;
    };
  }, [navigate, user?.id]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[32px] border border-white/10 bg-white/80 p-6 text-sm text-[rgb(var(--text-secondary))] shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:text-white/80">
      Procurando sua ficha em uso...
    </div>
  );
}
