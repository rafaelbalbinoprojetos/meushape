alter table public.ai_logs
  add column if not exists tipo text,
  add column if not exists periodo_inicio date,
  add column if not exists periodo_fim date,
  add column if not exists versao_modelo text,
  add column if not exists score_confianca numeric(4, 2),
  add column if not exists fonte_dados jsonb;

create index if not exists idx_ai_logs_usuario_tipo
  on public.ai_logs (usuario_id, tipo);

create index if not exists idx_ai_logs_periodo
  on public.ai_logs (periodo_inicio, periodo_fim);
