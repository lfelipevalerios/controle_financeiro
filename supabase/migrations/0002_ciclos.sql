-- =====================================================================
-- Baldinhos — ciclo do orçamento por data de corte (docs/decisoes.md D-13)
--   cortes_ciclo : dia de corte padrão, com vigência a partir de um ciclo
--   ajustes_ciclo: início diferente para um ciclo específico (null = volta ao padrão)
-- Nada é apagado: sem DELETE para o app e gatilho que barra DELETE.
-- Rode uma única vez no SQL Editor do Supabase, depois do 0001.
-- =====================================================================

create table public.cortes_ciclo (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references public.familias(id),
  vigente_desde date not null check (extract(day from vigente_desde) = 1),
  dia           integer not null check (dia between 1 and 31),
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (familia_id, vigente_desde)
);

create table public.ajustes_ciclo (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references public.familias(id),
  mes           date not null check (extract(day from mes) = 1),
  inicio        date check (inicio is null or (inicio between mes - 31 and mes + 61)),
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (familia_id, mes)
);

-- autoria e carimbo de atualização
create or replace function public.ciclo_carimbos()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
  else
    new.criado_por := old.criado_por;
    new.criado_em  := old.criado_em;
    new.familia_id := old.familia_id;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create trigger cortes_ciclo_carimbos before insert or update on public.cortes_ciclo
  for each row execute function public.ciclo_carimbos();
create trigger ajustes_ciclo_carimbos before insert or update on public.ajustes_ciclo
  for each row execute function public.ciclo_carimbos();

create trigger cortes_ciclo_sem_delete before delete on public.cortes_ciclo
  for each row execute function public.impedir_exclusao();
create trigger ajustes_ciclo_sem_delete before delete on public.ajustes_ciclo
  for each row execute function public.impedir_exclusao();

alter table public.cortes_ciclo  enable row level security;
alter table public.ajustes_ciclo enable row level security;

revoke all on public.cortes_ciclo, public.ajustes_ciclo from anon, authenticated;
grant select, insert, update on public.cortes_ciclo, public.ajustes_ciclo to authenticated;

create policy cortes_select on public.cortes_ciclo for select to authenticated using (public.eh_membro(familia_id));
create policy cortes_insert on public.cortes_ciclo for insert to authenticated with check (public.eh_membro(familia_id));
create policy cortes_update on public.cortes_ciclo for update to authenticated
  using (public.eh_membro(familia_id)) with check (public.eh_membro(familia_id));

create policy ajustes_select on public.ajustes_ciclo for select to authenticated using (public.eh_membro(familia_id));
create policy ajustes_insert on public.ajustes_ciclo for insert to authenticated with check (public.eh_membro(familia_id));
create policy ajustes_update on public.ajustes_ciclo for update to authenticated
  using (public.eh_membro(familia_id)) with check (public.eh_membro(familia_id));

alter publication supabase_realtime add table public.cortes_ciclo, public.ajustes_ciclo;
