create table if not exists public.refeicoes_modelo (
  id uuid not null default extensions.uuid_generate_v4 (),
  usuario_id uuid not null,
  titulo text not null,
  categoria text not null default 'cafe',
  calorias numeric(8, 2) not null default 0,
  proteinas numeric(8, 2) not null default 0,
  carboidratos numeric(8, 2) not null default 0,
  gorduras numeric(8, 2) not null default 0,
  horario_padrao time without time zone null,
  criado_em timestamp without time zone not null default now(),
  atualizado_em timestamp without time zone not null default now(),
  constraint refeicoes_modelo_pkey primary key (id),
  constraint refeicoes_modelo_usuario_id_fkey foreign key (usuario_id) references auth.users (id) on delete cascade
);

create index if not exists idx_refeicoes_modelo_usuario on public.refeicoes_modelo (usuario_id);
create index if not exists idx_refeicoes_modelo_categoria on public.refeicoes_modelo (categoria);

create trigger set_timestamp_refeicoes_modelo
before update on public.refeicoes_modelo
for each row
execute function set_timestamp();
