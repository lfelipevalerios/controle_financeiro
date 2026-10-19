-- =====================================================================
-- Baldinhos — schema completo (docs/05), com as adaptações de docs/decisoes.md:
--   * nada é apagado fisicamente: sem DELETE para o app e gatilho que barra DELETE;
--   * toda alteração de lançamento guarda a versão anterior em historico_lancamentos;
--   * privilégios concedidos explicitamente (o projeto não expõe tabelas novas sozinho).
-- Rode uma única vez no SQL Editor do Supabase (ou com `supabase db push`).
-- =====================================================================

-- ============ tabelas ============
create table public.familias (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 1 and 60),
  criado_por  uuid references auth.users(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create table public.membros (
  familia_id  uuid not null references public.familias(id),
  user_id     uuid not null references auth.users(id),
  papel       text not null default 'membro' check (papel in ('admin', 'membro')),
  apelido     text not null check (char_length(btrim(apelido)) between 1 and 30),
  entrou_em   timestamptz not null default now(),
  removido_em timestamptz,
  primary key (familia_id, user_id)
);
create index membros_user_idx on public.membros (user_id) where removido_em is null;

create table public.convites (
  token        text primary key default replace(gen_random_uuid()::text, '-', ''),
  familia_id   uuid not null references public.familias(id),
  criado_por   uuid references auth.users(id) on delete set null,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '7 days',
  usado_por    uuid references auth.users(id) on delete set null,
  usado_em     timestamptz,
  cancelado_em timestamptz
);
create index convites_familia_idx on public.convites (familia_id);

create table public.baldinhos (
  id              uuid primary key default gen_random_uuid(),
  familia_id      uuid not null references public.familias(id),
  nome            text not null check (char_length(btrim(nome)) between 1 and 40),
  cor             text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem           integer not null default 0,
  arquivado_desde date check (arquivado_desde is null or extract(day from arquivado_desde) = 1),
  criado_por      uuid references auth.users(id) on delete set null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index baldinhos_familia_idx on public.baldinhos (familia_id);

create table public.regras_baldinho (
  id             uuid primary key default gen_random_uuid(),
  baldinho_id    uuid not null references public.baldinhos(id),
  familia_id     uuid not null references public.familias(id),
  vigente_desde  date not null check (extract(day from vigente_desde) = 1),
  periodicidade  text not null check (periodicidade in ('dia', 'semana', 'mes')),
  dias           text not null default 'todos' check (dias in ('uteis', 'fds', 'todos')),
  valor_centavos integer not null check (valor_centavos between 1 and 100000000),
  criado_por     uuid references auth.users(id) on delete set null,
  criado_em      timestamptz not null default now(),
  unique (baldinho_id, vigente_desde),
  check (periodicidade = 'dia' or dias = 'todos')
);
create index regras_familia_idx on public.regras_baldinho (familia_id);

create table public.lancamentos (
  id             uuid primary key,                       -- gerado no cliente
  familia_id     uuid not null references public.familias(id),
  baldinho_id    uuid not null references public.baldinhos(id),
  valor_centavos integer not null check (valor_centavos between 1 and 100000000),
  data           date not null check (data >= date '2000-01-01'),
  descricao      text not null default '' check (char_length(descricao) <= 80),
  criado_por     uuid references auth.users(id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em  timestamptz not null default now(),
  excluido_em    timestamptz                             -- exclusão lógica
);
create index lancamentos_familia_data_idx on public.lancamentos (familia_id, data);
create index lancamentos_baldinho_idx on public.lancamentos (baldinho_id);

-- versões anteriores de cada lançamento (auditoria; nunca apagada)
create table public.historico_lancamentos (
  id             bigint generated always as identity primary key,
  lancamento_id  uuid not null references public.lancamentos(id),
  familia_id     uuid not null references public.familias(id),
  versao_anterior jsonb not null,
  alterado_por   uuid references auth.users(id) on delete set null,
  alterado_em    timestamptz not null default now()
);
create index historico_lancamento_idx on public.historico_lancamentos (lancamento_id);

-- ============ nada é apagado ============
create or replace function public.impedir_exclusao()
returns trigger language plpgsql as $$
begin
  raise exception 'Registros do Baldinhos não são apagados (tabela %). Use arquivamento ou exclusão lógica.', tg_table_name
    using errcode = '42501';
end $$;

do $$
declare t text;
begin
  foreach t in array array['familias','membros','convites','baldinhos','regras_baldinho','lancamentos','historico_lancamentos'] loop
    execute format('create trigger %I before delete on public.%I for each row execute function public.impedir_exclusao()', t || '_sem_delete', t);
  end loop;
end $$;

-- ============ segurança (RLS) ============
create or replace function public.eh_membro(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
    where m.familia_id = f and m.user_id = auth.uid() and m.removido_em is null
  );
$$;

create or replace function public.eh_admin(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
    where m.familia_id = f and m.user_id = auth.uid() and m.removido_em is null and m.papel = 'admin'
  );
$$;

alter table public.familias              enable row level security;
alter table public.membros               enable row level security;
alter table public.convites              enable row level security;
alter table public.baldinhos             enable row level security;
alter table public.regras_baldinho       enable row level security;
alter table public.lancamentos           enable row level security;
alter table public.historico_lancamentos enable row level security;

-- privilégios explícitos: só leitura, inserção e atualização; nunca DELETE
revoke all on public.familias, public.membros, public.convites, public.baldinhos,
              public.regras_baldinho, public.lancamentos, public.historico_lancamentos from anon, authenticated;
grant select on public.familias, public.membros, public.convites, public.baldinhos,
                public.regras_baldinho, public.lancamentos, public.historico_lancamentos to authenticated;
grant insert on public.convites, public.baldinhos, public.regras_baldinho, public.lancamentos to authenticated;
grant update (nome) on public.familias to authenticated;
grant update (apelido) on public.membros to authenticated;
grant update (cancelado_em) on public.convites to authenticated;
grant update (nome, cor, ordem, arquivado_desde) on public.baldinhos to authenticated;
-- regras e lançamentos são gravados com upsert (todas as colunas); os gatilhos protegem autoria e família
grant update on public.regras_baldinho, public.lancamentos to authenticated;

create policy familias_select on public.familias for select to authenticated using (public.eh_membro(id));
create policy familias_update on public.familias for update to authenticated
  using (public.eh_admin(id)) with check (public.eh_admin(id));

create policy membros_select on public.membros for select to authenticated using (public.eh_membro(familia_id));
create policy membros_update_proprio on public.membros for update to authenticated
  using (user_id = auth.uid() and removido_em is null) with check (user_id = auth.uid());

create policy convites_select on public.convites for select to authenticated using (public.eh_admin(familia_id));
create policy convites_insert on public.convites for insert to authenticated
  with check (public.eh_admin(familia_id) and criado_por = auth.uid());
create policy convites_update on public.convites for update to authenticated
  using (public.eh_admin(familia_id)) with check (public.eh_admin(familia_id));

create policy baldinhos_select on public.baldinhos for select to authenticated using (public.eh_membro(familia_id));
create policy baldinhos_insert on public.baldinhos for insert to authenticated with check (public.eh_membro(familia_id));
create policy baldinhos_update on public.baldinhos for update to authenticated
  using (public.eh_membro(familia_id)) with check (public.eh_membro(familia_id));

create policy regras_select on public.regras_baldinho for select to authenticated using (public.eh_membro(familia_id));
create policy regras_insert on public.regras_baldinho for insert to authenticated with check (public.eh_membro(familia_id));
create policy regras_update on public.regras_baldinho for update to authenticated
  using (public.eh_membro(familia_id)) with check (public.eh_membro(familia_id));

create policy lancamentos_select on public.lancamentos for select to authenticated using (public.eh_membro(familia_id));
create policy lancamentos_insert on public.lancamentos for insert to authenticated with check (public.eh_membro(familia_id));
create policy lancamentos_update on public.lancamentos for update to authenticated
  using (public.eh_membro(familia_id)) with check (public.eh_membro(familia_id));

create policy historico_select on public.historico_lancamentos for select to authenticated using (public.eh_membro(familia_id));

-- ============ gatilhos de integridade ============
create or replace function public.validar_familia_do_baldinho()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.baldinhos b where b.id = new.baldinho_id and b.familia_id = new.familia_id) then
    raise exception 'O baldinho não pertence a esta família' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger lancamentos_valida_familia before insert or update of baldinho_id, familia_id
  on public.lancamentos for each row execute function public.validar_familia_do_baldinho();
create trigger regras_valida_familia before insert or update of baldinho_id, familia_id
  on public.regras_baldinho for each row execute function public.validar_familia_do_baldinho();

create or replace function public.lancamentos_carimbos()
returns trigger language plpgsql set search_path = public as $$
begin
  -- RN-41: data não pode ser futura (tolerância de 1 dia para o relógio do aparelho)
  if new.data > (now() at time zone 'America/Sao_Paulo')::date + 1 then
    raise exception 'A data não pode ser depois de hoje' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.criado_por     := auth.uid();
    new.criado_em      := now();
    new.atualizado_por := null;
    new.atualizado_em  := now();
  else
    new.criado_por := old.criado_por;
    new.criado_em  := old.criado_em;
    new.familia_id := old.familia_id;
    -- exclusão é definitiva: um reenvio antigo da fila não ressuscita o lançamento
    if old.excluido_em is not null then
      return old;
    end if;
    new.atualizado_por := auth.uid();
    new.atualizado_em  := now();
  end if;
  return new;
end $$;

create trigger lancamentos_carimbos before insert or update
  on public.lancamentos for each row execute function public.lancamentos_carimbos();

-- guarda a versão anterior sempre que um lançamento muda de fato
create or replace function public.lancamentos_historico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.baldinho_id, old.valor_centavos, old.data, old.descricao, old.excluido_em)
     is distinct from (new.baldinho_id, new.valor_centavos, new.data, new.descricao, new.excluido_em) then
    insert into public.historico_lancamentos (lancamento_id, familia_id, versao_anterior, alterado_por)
    values (old.id, old.familia_id, to_jsonb(old), auth.uid());
  end if;
  return new;
end $$;

create trigger lancamentos_historico after update
  on public.lancamentos for each row execute function public.lancamentos_historico();

create or replace function public.baldinhos_carimbos()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
  else
    new.criado_por := old.criado_por;
    new.familia_id := old.familia_id;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create trigger baldinhos_carimbos before insert or update
  on public.baldinhos for each row execute function public.baldinhos_carimbos();

-- ============ funções chamadas pelo app ============
create or replace function public.criar_familia(p_nome text, p_apelido text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '28000'; end if;
  insert into public.familias (nome, criado_por) values (btrim(p_nome), auth.uid()) returning id into v_id;
  insert into public.membros (familia_id, user_id, papel, apelido) values (v_id, auth.uid(), 'admin', btrim(p_apelido));
  return v_id;
end $$;

create or replace function public.info_convite(p_token text)
returns table (familia_nome text, valido boolean)
language sql stable security definer set search_path = public as $$
  select f.nome,
         (c.usado_em is null and c.cancelado_em is null and c.expira_em > now())
  from public.convites c join public.familias f on f.id = c.familia_id
  where c.token = p_token;
$$;

create or replace function public.aceitar_convite(p_token text, p_apelido text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_conv public.convites%rowtype;
begin
  if auth.uid() is null then raise exception 'Não autenticado' using errcode = '28000'; end if;
  select * into v_conv from public.convites where token = p_token for update;
  if not found or v_conv.usado_em is not null or v_conv.cancelado_em is not null or v_conv.expira_em <= now() then
    raise exception 'Convite inválido' using errcode = 'P0001', hint = 'convite_invalido';
  end if;
  insert into public.membros (familia_id, user_id, papel, apelido)
    values (v_conv.familia_id, auth.uid(), 'membro', btrim(p_apelido))
  on conflict (familia_id, user_id) do update
    set removido_em = null, apelido = excluded.apelido, entrou_em = now();
  update public.convites set usado_por = auth.uid(), usado_em = now() where token = p_token;
  return v_conv.familia_id;
end $$;

create or replace function public.remover_membro(p_familia uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin(p_familia) then raise exception 'Apenas o administrador pode remover membros' using errcode = '42501'; end if;
  if exists (select 1 from public.membros where familia_id = p_familia and user_id = p_user and papel = 'admin' and removido_em is null)
     and (select count(*) from public.membros where familia_id = p_familia and papel = 'admin' and removido_em is null) <= 1 then
    raise exception 'A família precisa de pelo menos um administrador' using errcode = 'P0001', hint = 'ultimo_admin';
  end if;
  update public.membros set removido_em = now() where familia_id = p_familia and user_id = p_user;
end $$;

revoke execute on function public.criar_familia(text, text), public.info_convite(text),
  public.aceitar_convite(text, text), public.remover_membro(uuid, uuid),
  public.eh_membro(uuid), public.eh_admin(uuid) from anon, public;
grant execute on function public.criar_familia(text, text), public.info_convite(text),
  public.aceitar_convite(text, text), public.remover_membro(uuid, uuid),
  public.eh_membro(uuid), public.eh_admin(uuid) to authenticated;

-- ============ tempo real ============
alter table public.baldinhos       replica identity full;
alter table public.regras_baldinho replica identity full;
alter publication supabase_realtime add table public.lancamentos, public.baldinhos, public.regras_baldinho;
