import { supabase } from "../lib/supabase.js";

const PROFILE_TABLE = "perfis";

export async function getSelectedFichaPreference(usuarioId) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para buscar a ficha selecionada.");
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("selected_ficha_id")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error) throw error;
  return data?.selected_ficha_id ?? null;
}

export async function saveSelectedFichaPreference({ usuarioId, fichaId }) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para salvar a ficha selecionada.");
  }

  const payload = {
    id: usuarioId,
    selected_ficha_id: fichaId ?? null,
  };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: "id" })
    .select("selected_ficha_id")
    .maybeSingle();

  if (error) throw error;
  return data?.selected_ficha_id ?? null;
}
