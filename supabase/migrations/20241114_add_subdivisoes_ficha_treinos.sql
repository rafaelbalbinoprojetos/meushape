-- Adiciona subdivisoes (Treino A, B, C...) em ficha_treinos
begin;

alter table public.ficha_treinos
  add column if not exists subdivisao text;

with ranked as (
  select
    id,
    row_number() over (
      partition by ficha_id
      order by ordem, coalesce(nome, ''), id
    ) as rn
  from public.ficha_treinos
)
update public.ficha_treinos ft
set subdivisao = chr(64 + (((ranked.rn - 1) % 26)::int) + 1)
from ranked
where ranked.id = ft.id
  and (ft.subdivisao is null or ft.subdivisao = '' or ft.subdivisao = 'A');

alter table public.ficha_treinos
  alter column subdivisao set default 'A',
  alter column subdivisao set not null;

alter table public.ficha_treinos
  add column if not exists subdivisao_ordem smallint generated always as (greatest(1, ascii(subdivisao) - 64)) stored;

alter table public.ficha_treinos
  add column if not exists subdivisao_label text generated always as ('Treino '::text || subdivisao) stored;

do $$
begin
  alter table public.ficha_treinos
    add constraint ficha_treinos_subdivisao_check
      check (subdivisao ~ '^[A-Z]$');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ficha_treinos
    add constraint ficha_treinos_ficha_subdivisao_key
      unique (ficha_id, subdivisao);
exception
  when duplicate_object then null;
end $$;

create index if not exists ficha_treinos_ficha_ordem_idx
  on public.ficha_treinos (ficha_id, subdivisao_ordem, ordem);

comment on column public.ficha_treinos.subdivisao is 'Letra que identifica o bloco (Treino A, B, C, ...).';
comment on column public.ficha_treinos.subdivisao_label is 'Label calculado automaticamente (ex.: Treino A).';

commit;
