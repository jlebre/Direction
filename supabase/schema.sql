-- ============================================================
-- App Direção Campo — Schema SQL
-- Colar no Supabase SQL Editor e executar
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type seccao_tipo as enum (
    'mosquitos', 'aranhicos', 'melgas', 'tremelgas', 'camaleoes'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type refeicao_tipo as enum (
    'pequeno_almoco', 'almoco', 'lanche', 'jantar', 'ceia', 'extra'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type armazenamento_tipo as enum (
    'despensa', 'casa_apoio', 'fresco_diario'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type restricao_tipo as enum (
    'alergia', 'intolerancia', 'dieta', 'outro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type categoria_receita as enum (
    'sopa', 'carne', 'frango', 'bacalhau', 'atum',
    'massa', 'arroz_pure', 'salada', 'fruta', 'doce',
    'molho', 'pequeno_almoco', 'lanche', 'outro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type zona_supermercado as enum (
    'mercearia', 'enlatados', 'massas_arroz', 'bebidas_leite',
    'congelados', 'limpeza', 'padaria', 'talho', 'peixaria',
    'frutas_legumes', 'lacticinios', 'charcutaria', 'temperos', 'outro'
  );
exception when duplicate_object then null; end $$;

-- ── Tabela partilhada: campos ─────────────────────────────────────────────────
create table if not exists campos (
  id                      uuid primary key default gen_random_uuid(),
  nome                    text not null unique,
  escalao                 text not null default '',
  datas                   text not null default '',
  pre_campo               text,
  local                   text,
  diretor                 text not null default '',
  adjunto                 text not null default '',
  mama                    text not null default '',
  saldo_inicial           numeric not null default 0,
  pin                     text,
  setup_completo          boolean not null default false,
  -- Campos módulo Mamãs
  seccao                  seccao_tipo,
  ano                     integer default 2026,
  data_inicio             date,
  data_fim                date,
  data_precampo_inicio    date,
  data_precampo_fim       date,
  num_animados            integer not null default 0,
  num_animadores          integer not null default 0,
  orcamento_alimentacao   numeric,
  orcamento_compras_gerais numeric,
  orcamento_talho         numeric,
  orcamento_pao           numeric,
  orcamento_frutas_legumes numeric,
  orcamento_diversos      numeric,
  periodo                 integer,
  created_at              timestamptz not null default now()
);

-- ── Módulo Adjuntos: despesas ─────────────────────────────────────────────────
create table if not exists despesas (
  id                uuid primary key default gen_random_uuid(),
  campo_id          uuid not null references campos(id) on delete cascade,
  numero_recibo     integer not null,
  data              date not null,
  valor             numeric not null,
  descricao         text not null,
  codigo            text not null,
  codigo_descricao  text not null,
  tipo              text not null check (tipo in ('receita', 'despesa')),
  nif_confirmado    boolean not null default false,
  foto_path         text,
  created_at        timestamptz not null default now()
);

create index if not exists despesas_campo_id_idx on despesas(campo_id);

-- ── Módulo Mamãs: Animados ────────────────────────────────────────────────────
create table if not exists animados (
  id                uuid primary key default gen_random_uuid(),
  campo_id          uuid not null references campos(id) on delete cascade,
  nome              text not null,
  data_nascimento   date,
  seccao            text,
  notas             text,
  created_at        timestamptz not null default now()
);

create index if not exists animados_campo_id_idx on animados(campo_id);

-- ── Restrições Alimentares (ligadas ao animado) ───────────────────────────────
create table if not exists restricoes_alimentares (
  id                    uuid primary key default gen_random_uuid(),
  animado_id            uuid not null references animados(id) on delete cascade,
  tipo                  restricao_tipo not null,
  descricao             text not null,
  ingredientes_proibidos text[] not null default '{}',
  notas                 text
);

-- ── Farmácia: Medicações (ligadas ao animado) ─────────────────────────────────
create table if not exists farmacia_medicacoes (
  id          uuid primary key default gen_random_uuid(),
  animado_id  uuid not null references animados(id) on delete cascade,
  medicamento text not null,
  horarios    text[] not null default '{}',
  notas       text,
  ativo       boolean not null default true
);

-- ── Farmácia: Inventário (ligado ao campo) ────────────────────────────────────
create table if not exists farmacia_inventario (
  id                  uuid primary key default gen_random_uuid(),
  campo_id            uuid not null references campos(id) on delete cascade,
  item                text not null,
  quantidade_inicial  numeric not null default 0,
  quantidade_gasta    numeric not null default 0,
  notas               text
);

-- ── Contactos de Emergência (ligados ao animado) ──────────────────────────────
create table if not exists contactos_emergencia (
  id          uuid primary key default gen_random_uuid(),
  animado_id  uuid not null references animados(id) on delete cascade,
  tipo        text not null default 'outro',
  nome        text not null,
  telefone    text not null,
  notas       text
);

-- ── Ingredientes ──────────────────────────────────────────────────────────────
create table if not exists ingredientes (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null unique,
  categoria_supermercado zona_supermercado not null default 'mercearia',
  unidade_base          text not null default 'unidade',
  tipo_armazenamento    armazenamento_tipo not null default 'despensa',
  created_at            timestamptz not null default now()
);

-- ── Receitas ──────────────────────────────────────────────────────────────────
create table if not exists receitas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  categoria     categoria_receita not null default 'outro',
  descricao     text,
  instrucoes    text,
  dicas_campo   text,
  tags          text[] not null default '{}',
  pessoas_base  integer not null default 58,
  is_oficial    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists receita_ingredientes (
  id                      uuid primary key default gen_random_uuid(),
  receita_id              uuid not null references receitas(id) on delete cascade,
  ingrediente_id          uuid not null references ingredientes(id) on delete cascade,
  quantidade_mosquitos    numeric,
  quantidade_aranh_melgas numeric,
  quantidade_cam_trem     numeric,
  unidade                 text not null,
  notas                   text
);

-- ── Ementa ────────────────────────────────────────────────────────────────────
create table if not exists ementa (
  id                  uuid primary key default gen_random_uuid(),
  campo_id            uuid not null references campos(id) on delete cascade,
  dia                 integer not null,
  refeicao            refeicao_tipo not null,
  receita_id          uuid references receitas(id) on delete set null,
  receita_nome_custom text,
  responsavel         text,
  notas               text,
  ordem               integer not null default 0
);

create index if not exists ementa_campo_dia_idx on ementa(campo_id, dia);

-- ── Lista de Compras ──────────────────────────────────────────────────────────
create table if not exists lista_compras (
  id          uuid primary key default gen_random_uuid(),
  campo_id    uuid not null references campos(id) on delete cascade,
  tipo        armazenamento_tipo not null default 'despensa',
  gerada_em   timestamptz not null default now()
);

create table if not exists lista_compras_items (
  id                uuid primary key default gen_random_uuid(),
  lista_id          uuid not null references lista_compras(id) on delete cascade,
  ingrediente_id    uuid references ingredientes(id) on delete set null,
  nome_custom       text,
  quantidade        numeric not null default 0,
  unidade           text not null default '',
  zona_supermercado zona_supermercado,
  dia               integer,
  preco_estimado    numeric,
  comprado          boolean not null default false,
  comprado_por      text,
  comprado_em       timestamptz,
  notas             text
);

-- ── Produtos do Campo ─────────────────────────────────────────────────────────
create table if not exists campo_produtos (
  id          uuid primary key default gen_random_uuid(),
  campo_id    uuid not null references campos(id) on delete cascade,
  nome        text not null,
  categoria   text not null default 'outro',
  quantidade  numeric,
  unidade     text not null default 'unidade',
  notas       text,
  created_at  timestamptz not null default now()
);

-- ── Preços do Campo ───────────────────────────────────────────────────────────
create table if not exists campo_precos (
  id          uuid primary key default gen_random_uuid(),
  campo_id    uuid not null references campos(id) on delete cascade,
  item        text not null,
  categoria   text not null default 'outro',
  preco       numeric,
  unidade     text not null default 'unidade',
  fornecedor  text not null default '',
  notas       text,
  created_at  timestamptz not null default now()
);

-- ── Dicas do Campo ────────────────────────────────────────────────────────────
create table if not exists campo_dicas (
  id          uuid primary key default gen_random_uuid(),
  campo_id    uuid not null references campos(id) on delete cascade,
  titulo      text not null,
  conteudo    text not null,
  categoria   text not null default 'geral',
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── RLS: acesso público total (sem auth) ──────────────────────────────────────
alter table campos                enable row level security;
alter table despesas              enable row level security;
alter table animados              enable row level security;
alter table restricoes_alimentares enable row level security;
alter table farmacia_medicacoes   enable row level security;
alter table farmacia_inventario   enable row level security;
alter table contactos_emergencia  enable row level security;
alter table ingredientes          enable row level security;
alter table receitas              enable row level security;
alter table receita_ingredientes  enable row level security;
alter table ementa                enable row level security;
alter table lista_compras         enable row level security;
alter table lista_compras_items   enable row level security;
alter table campo_produtos        enable row level security;
alter table campo_precos          enable row level security;
alter table campo_dicas           enable row level security;

-- Políticas públicas (sem login)
do $$ declare t text; begin
  for t in select unnest(array[
    'campos','despesas','animados','restricoes_alimentares',
    'farmacia_medicacoes','farmacia_inventario','contactos_emergencia',
    'ingredientes','receitas','receita_ingredientes','ementa',
    'lista_compras','lista_compras_items','campo_produtos','campo_precos','campo_dicas'
  ]) loop
    begin
      execute format('create policy "public_all" on %I for all using (true) with check (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ── Storage: bucket faturas ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('faturas', 'faturas', true)
on conflict (id) do nothing;

do $$ begin
  create policy "faturas_public_read"
    on storage.objects for select using (bucket_id = 'faturas');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "faturas_public_insert"
    on storage.objects for insert with check (bucket_id = 'faturas');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "faturas_public_delete"
    on storage.objects for delete using (bucket_id = 'faturas');
exception when duplicate_object then null; end $$;
