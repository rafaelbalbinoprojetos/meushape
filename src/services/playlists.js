import { supabase } from "../lib/supabase.js";

const PLAYLISTS_TABLE = "playlists";
const FAVORITES_TABLE = "playlists_favoritas";

/**
 * Busca playlists cadastradas.
 */
export async function fetchPlaylists() {
  const { data, error } = await supabase
    .from(PLAYLISTS_TABLE)
    .select(
      `
        id,
        titulo,
        categoria,
        descricao,
        imagem_url,
        spotify_url,
        deezer_url,
        apple_url,
        duracao_aprox,
        bpm,
        criada_em,
        atualizada_em
      `,
    )
    .order("atualizada_em", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createPlaylist(payload) {
  const { data, error } = await supabase.from(PLAYLISTS_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

/**
 * Registra que o usuário iniciou uma playlist durante o treino.
 */
export async function logPlaylistPlay({ usuarioId = null, playlistId = null, data = null } = {}) {
  if (!playlistId) {
    return null;
  }

  const payload = {
    usuario_id: usuarioId ?? null,
    playlist_id: playlistId,
  };

  // Se uma data específica vier, usamos; caso contrário, deixamos o default do banco preencher.
  if (data) {
    payload.data = data;
  }

  const { error } = await supabase.from("treinos_playlists").insert(payload);
  if (error) {
    console.error("[logPlaylistPlay] erro ao registrar play:", error);
    throw error;
  }

  return true;
}

export async function favoritePlaylist(userId, playlistId) {
  if (!userId || !playlistId) return null;
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .upsert({ user_id: userId, playlist_id: playlistId }, { onConflict: "user_id,playlist_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Busca a playlist tocada pelo usuário em uma data específica (default: hoje).
 */
export async function getPlaylistPlayForDate({ usuarioId = null, date = null } = {}) {
  if (!usuarioId) return null;
  const dateStr =
    date instanceof Date
      ? date.toISOString().slice(0, 10)
      : typeof date === "string" && date.trim()
        ? date.trim()
        : new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("treinos_playlists")
    .select(
      `
        id,
        data,
        playlist:playlist_id (
          id,
          titulo,
          spotify_url,
          deezer_url,
          apple_url,
          imagem_url,
          duracao_aprox,
          bpm
        )
      `,
    )
    .eq("usuario_id", usuarioId)
    .eq("data", dateStr)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getPlaylistPlayForDate] erro ao buscar playlist do dia:", error);
    return null;
  }

  return data ?? null;
}
