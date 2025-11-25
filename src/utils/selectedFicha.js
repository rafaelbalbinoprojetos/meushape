const STORAGE_KEY = "meushape:selected_ficha:v1";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeFicha(data) {
  if (!data || typeof data !== "object") return null;
  const id = typeof data.id === "string" && data.id.trim() ? data.id.trim() : null;
  if (!id) return null;
  return {
    id,
    nome: data.nome ?? null,
    descricao: data.descricao ?? null,
    objetivo: data.objetivo ?? null,
    nivel: data.nivel ?? null,
    visibilidade: data.visibilidade ?? null,
    thumbnail_url: data.thumbnail_url ?? data.thumbnailUrl ?? null,
    capa_url: data.capa_url ?? data.capaUrl ?? null,
    atualizado_em: data.atualizado_em ?? data.atualizadoEm ?? null,
    salvo_em: data.salvo_em ?? Date.now(),
  };
}

export function saveSelectedFicha(rawData) {
  if (!hasWindow()) return null;
  const normalized = normalizeFicha(rawData);
  if (!normalized) return null;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadSelectedFicha() {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeFicha(parsed);
  } catch {
    return null;
  }
}

export function clearSelectedFicha() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY as SELECTED_FICHA_STORAGE_KEY };
