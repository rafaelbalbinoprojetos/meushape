import { supabase } from "../lib/supabase.js";

const FEED_TABLE = "feed_posts";
const FRIENDS_TABLE = "friends";
const REACTIONS_TABLE = "feed_reactions";
const REACTIONS_ENV_ENABLED = (import.meta.env.VITE_FEED_REACTIONS_ENABLED ?? "true") !== "false";
let reactionsAvailable =
  REACTIONS_ENV_ENABLED &&
  (typeof localStorage === "undefined" ? true : localStorage.getItem("feed:reactions:disabled") !== "true");

function isMissingReactionsTable(error) {
  const msg = `${error?.message ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.code === "404" ||
    error?.status === 404 ||
    msg.includes("feed_reactions") ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("feed_reactions"))
  );
}

export async function fetchFollowingIds(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from(FRIENDS_TABLE).select("seguido_id").eq("seguidor_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.seguido_id).filter(Boolean);
}

export async function fetchFeedPosts({ scope = "general", userId } = {}) {
  let ids = [];
  if (scope === "following" && userId) {
    ids = await fetchFollowingIds(userId);
    ids = Array.from(new Set([...ids, userId])); // inclui o próprio usuário
    if (ids.length === 0) return [];
  }

  const baseSelect = `
    id,
    usuario_id,
    tipo,
    titulo,
    conteudo,
    imagem_url,
    dados,
    visibilidade,
    criada_em
  `;

  const buildQuery = () => {
    let query = supabase.from(FEED_TABLE).select(baseSelect).order("criada_em", { ascending: false }).limit(100);
    if (scope === "following" && userId) {
      query = query.in("usuario_id", ids).in("visibilidade", ["public", "friends"]);
    } else {
      query = query.eq("visibilidade", "public");
    }
    return query;
  };

  // Consulta simples para evitar erros de join/perfil
  try {
    const res = await buildQuery();
    if (res.error) throw res.error;
    return res.data ?? [];
  } catch (error) {
    console.error("[feed] falha ao buscar feed:", error);
    return [];
  }
}

export async function createFeedPost(payload) {
  const { data, error } = await supabase.from(FEED_TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function fetchReactions(postIds = [], userId) {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    return { counts: {}, mine: {} };
  }
  if (!reactionsAvailable) {
    return { counts: {}, mine: {} };
  }

  try {
    const { data, error } = await supabase
      .from(REACTIONS_TABLE)
      .select("post_id, usuario_id, tipo")
      .in("post_id", postIds);

    if (error) {
    if (isMissingReactionsTable(error)) {
      console.warn("[feed] tabela feed_reactions ausente, ignorando reações.", error);
      reactionsAvailable = false;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("feed:reactions:disabled", "true");
      }
      return { counts: {}, mine: {} };
    }
    throw error;
  }

    const counts = {};
    const mine = {};

    (data ?? []).forEach((row) => {
      if (!counts[row.post_id]) counts[row.post_id] = { clap: 0, fire: 0, flex: 0 };
      if (row.tipo && counts[row.post_id][row.tipo] !== undefined) {
        counts[row.post_id][row.tipo] += 1;
      }
      if (userId && row.usuario_id === userId) {
        mine[row.post_id] = row.tipo;
      }
    });

    return { counts, mine };
  } catch (error) {
    if (isMissingReactionsTable(error)) {
      console.warn("[feed] tabela feed_reactions ausente, ignorando reações.", error);
      reactionsAvailable = false;
      return { counts: {}, mine: {} };
    }
    throw error;
  }

}

export async function sendReaction({ postId, userId, reaction }) {
  if (!postId || !userId || !reaction) {
    throw new Error("Reação inválida.");
  }
  if (!reactionsAvailable) {
    return { counts: {}, mine: reaction };
  }

  try {
    const { error } = await supabase
      .from(REACTIONS_TABLE)
      .upsert(
        { post_id: postId, usuario_id: userId, tipo: reaction },
        { onConflict: "post_id,usuario_id" },
      );

    if (error) {
      if (isMissingReactionsTable(error)) {
        console.warn("[feed] tabela feed_reactions ausente, registrando reação apenas localmente.");
        reactionsAvailable = false;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("feed:reactions:disabled", "true");
        }
        return { counts: {}, mine: reaction };
      }
      throw error;
    }

    // Retorna contagem atualizada para o post
    const { counts, mine } = await fetchReactions([postId], userId);
    return { counts: counts[postId] ?? {}, mine: mine[postId] ?? null };
  } catch (error) {
    if (isMissingReactionsTable(error)) {
      console.warn("[feed] tabela feed_reactions ausente, registrando reação apenas localmente.");
      reactionsAvailable = false;
      return { counts: {}, mine: reaction };
    }
    throw error;
  }
}
