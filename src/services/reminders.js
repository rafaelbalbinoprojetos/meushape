import { supabase } from "../lib/supabase.js";

export async function listReminders({ usuarioId } = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para carregar lembretes.");
  }
  const { data, error } = await supabase
    .from("lembretes")
    .select("id, usuario_id, titulo, horario, dias_semana, ativo, tipo, criado_em, atualizado_em")
    .eq("usuario_id", usuarioId)
    .order("horario", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createReminder({
  usuarioId,
  titulo,
  horario,
  diasSemana = [],
  ativo = true,
  tipo = null,
} = {}) {
  if (!usuarioId) {
    throw new Error("Informe o usuario para criar lembretes.");
  }
  if (!titulo) {
    throw new Error("Informe o titulo do lembrete.");
  }
  if (!horario) {
    throw new Error("Informe o horario do lembrete.");
  }

  const payload = {
    usuario_id: usuarioId,
    titulo,
    horario,
    dias_semana: diasSemana,
    ativo,
    tipo,
  };

  const { data, error } = await supabase.from("lembretes").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateReminder({ reminderId, usuarioId, fields = {} } = {}) {
  if (!reminderId) {
    throw new Error("Informe o lembrete para atualizar.");
  }
  if (!usuarioId) {
    throw new Error("Informe o usuario para atualizar o lembrete.");
  }
  const { data, error } = await supabase
    .from("lembretes")
    .update(fields)
    .eq("id", reminderId)
    .eq("usuario_id", usuarioId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminder({ reminderId, usuarioId } = {}) {
  if (!reminderId) {
    throw new Error("Informe o lembrete para excluir.");
  }
  if (!usuarioId) {
    throw new Error("Informe o usuario para excluir o lembrete.");
  }
  const { error } = await supabase.from("lembretes").delete().eq("id", reminderId).eq("usuario_id", usuarioId);
  if (error) throw error;
  return true;
}
