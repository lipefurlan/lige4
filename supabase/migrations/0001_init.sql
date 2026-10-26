-- Lig 4 ao vivo: estado das salas, assentos e placar.
-- Rode no painel do Supabase: SQL Editor > New query > cole tudo > Run.

create extension if not exists pgcrypto;

-- Salas: leitura pública (anon), escrita só pela API com a service role.
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[A-HJ-NP-Z]{4}$'),
  status          text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  board           smallint[] not null default array_fill(0::smallint, array[42]),
  move_count      integer not null default 0,
  current_turn    smallint not null default 1 check (current_turn in (1, 2)),
  starting_color  smallint not null default 1 check (starting_color in (1, 2)),
  winner          smallint check (winner in (0, 1, 2)),           -- null = em andamento, 0 = empate
  winning_cells   smallint[] not null default '{}',
  last_move       smallint,                                        -- índice da última casa jogada
  red_nickname    text,
  yellow_nickname text,
  game_number     integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

-- Assentos: guarda o UUID de cada jogador. Fica fora de rooms para que
-- espectadores não consigam ler o UUID de um jogador e jogar no lugar dele.
create table if not exists public.room_seats (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  color     smallint not null check (color in (1, 2)),
  player_id uuid not null,
  nickname  text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, color),
  unique (room_id, player_id)
);

-- Vitórias: sem FK para o placar sobreviver à limpeza das salas.
create table if not exists public.wins (
  id          bigint generated always as identity primary key,
  room_id     uuid not null,
  game_number integer not null,
  nickname    text not null,
  color       smallint not null check (color in (1, 2)),
  created_at  timestamptz not null default now(),
  unique (room_id, game_number)
);

create or replace view public.scoreboard with (security_invoker = true) as
  select nickname, count(*)::integer as wins, max(created_at) as last_win_at
  from public.wins
  group by nickname;

-- updated_at automático (marca a atividade da sala).
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
  before update on public.rooms
  for each row execute function public.touch_updated_at();

-- RLS: o cliente só lê. Sem policies de insert/update/delete = nenhuma escrita via anon.
alter table public.rooms      enable row level security;
alter table public.room_seats enable row level security;
alter table public.wins       enable row level security;

drop policy if exists "salas ativas sao publicas" on public.rooms;
create policy "salas ativas sao publicas" on public.rooms
  for select to anon, authenticated
  using (updated_at > now() - interval '2 hours');

drop policy if exists "placar e publico" on public.wins;
create policy "placar e publico" on public.wins
  for select to anon, authenticated
  using (true);

-- room_seats não tem policy: o anon não lê nem escreve.

-- Grants explícitos (projetos novos podem não expor tabelas novas por padrão).
grant select on public.rooms, public.wins, public.scoreboard to anon, authenticated;
revoke insert, update, delete on public.rooms, public.room_seats, public.wins from anon, authenticated;
revoke select on public.room_seats from anon, authenticated;
grant all on public.rooms, public.room_seats, public.wins to service_role;
grant select on public.scoreboard to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Limpeza de salas inativas há mais de 2h (a API chama ao criar sala).
create or replace function public.cleanup_old_rooms() returns void
language sql security definer set search_path = public as $$
  delete from public.rooms where updated_at < now() - interval '2 hours';
$$;

revoke execute on function public.cleanup_old_rooms() from public, anon, authenticated;
grant execute on function public.cleanup_old_rooms() to service_role;

-- Realtime: clientes assinam mudanças em rooms e wins.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wins') then
    alter publication supabase_realtime add table public.wins;
  end if;
end;
$$;
