-- ============================================================
-- chore-to-mate: complete database schema
-- Run this in the Supabase SQL Editor on your new project
-- ============================================================


-- ─── 1. Tables ────────────────────────────────────────────

create table public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  name  text not null,
  color text not null default '#6466C8'
);

create table public.flats (
  id                uuid    primary key default gen_random_uuid(),
  name              text    not null,
  sprint_cycle_days integer not null default 7,
  tenancy_start     text    not null
);

create table public.flat_memberships (
  user_id uuid    not null references public.profiles(id) on delete cascade,
  flat_id uuid    not null references public.flats(id)    on delete cascade,
  role    text    not null check (role in ('flatmaster', 'resident')),
  score   numeric not null default 0,
  primary key (user_id, flat_id)
);

create table public.events (
  id                       uuid        primary key default gen_random_uuid(),
  flat_id                  uuid        not null references public.flats(id) on delete cascade,
  title                    text        not null,
  type                     text        not null check (type in ('Chore', 'Bill', 'Visitor', 'Away / Availability')),
  owner_id                 uuid        not null references public.profiles(id),
  start_time               timestamptz not null,
  end_time                 timestamptz not null,
  status                   text        not null check (status in ('Scheduled', 'Due', 'Claimed Done', 'Verified', 'Overdue', 'Extension Pending')),
  description              text,
  recurrence               text,
  attendees                jsonb       not null default '[]'::jsonb,
  verified_by_id           uuid        references public.profiles(id),
  requested_extension_date timestamptz,
  push_notified_at         timestamptz,
  push_notified_day_at     timestamptz
);

create table public.invite_codes (
  code       text        primary key,
  flat_id    uuid        not null references public.flats(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh   text not null,
  auth     text not null,
  primary key (user_id, endpoint)
);


-- ─── 2. Indexes ───────────────────────────────────────────

create index on public.flat_memberships (flat_id);
create index on public.events           (flat_id, start_time);
create index on public.invite_codes     (flat_id, created_at desc);
create index on public.push_subscriptions (user_id);


-- ─── 3. Realtime ──────────────────────────────────────────

alter publication supabase_realtime add table public.events;


-- ─── 4. Row Level Security ────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.flats              enable row level security;
alter table public.flat_memberships   enable row level security;
alter table public.events             enable row level security;
alter table public.invite_codes       enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper used in policies below
create or replace function public.is_flat_member(p_flat_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.flat_memberships
    where flat_id = p_flat_id
      and user_id = auth.uid()
  );
$$;

-- profiles: own row
create policy "profiles: read own"   on public.profiles for select using (id = auth.uid());
create policy "profiles: insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid());

-- profiles: flatmates can read each other
create policy "profiles: read flatmates" on public.profiles for select using (
  exists (
    select 1 from public.flat_memberships fm1
    join public.flat_memberships fm2 on fm1.flat_id = fm2.flat_id
    where fm1.user_id = auth.uid()
      and fm2.user_id = profiles.id
  )
);

-- flats: members only
create policy "flats: read if member"   on public.flats for select using (public.is_flat_member(id));
create policy "flats: update if member" on public.flats for update using (public.is_flat_member(id));

-- flat_memberships: members of the same flat
create policy "memberships: read if member" on public.flat_memberships
  for select using (public.is_flat_member(flat_id));

-- events: full CRUD for flat members
create policy "events: select" on public.events for select using (public.is_flat_member(flat_id));
create policy "events: insert" on public.events for insert with check (public.is_flat_member(flat_id));
create policy "events: update" on public.events for update using (public.is_flat_member(flat_id));
create policy "events: delete" on public.events for delete using (public.is_flat_member(flat_id));

-- invite_codes: members can read
create policy "invite_codes: read if member" on public.invite_codes
  for select using (public.is_flat_member(flat_id));

-- push_subscriptions: own rows only
create policy "push_subs: all own" on public.push_subscriptions
  for all using (user_id = auth.uid());


-- ─── 5. RPC: create_flat_and_join ─────────────────────────

create or replace function public.create_flat_and_join(
  p_flat_name         text,
  p_sprint_cycle_days integer,
  p_tenancy_start     text,
  p_profile_name      text,
  p_profile_color     text
)
returns json
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_flat    public.flats;
  v_code    text;
begin
  -- Upsert profile
  insert into public.profiles (id, name, color)
  values (v_user_id, p_profile_name, p_profile_color)
  on conflict (id) do update set name = excluded.name, color = excluded.color;

  -- Create flat
  insert into public.flats (name, sprint_cycle_days, tenancy_start)
  values (p_flat_name, p_sprint_cycle_days, p_tenancy_start)
  returning * into v_flat;

  -- Join as flatmaster
  insert into public.flat_memberships (user_id, flat_id, role, score)
  values (v_user_id, v_flat.id, 'flatmaster', 0);

  -- Generate 8-char uppercase invite code
  v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  insert into public.invite_codes (code, flat_id) values (v_code, v_flat.id);

  return row_to_json(v_flat);
end;
$$;


-- ─── 6. RPC: join_flat_with_code ──────────────────────────

create or replace function public.join_flat_with_code(
  p_code          text,
  p_profile_name  text,
  p_profile_color text
)
returns json
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_flat    public.flats;
begin
  -- Look up flat from invite code (case-insensitive)
  select f.* into v_flat
  from public.invite_codes ic
  join public.flats f on f.id = ic.flat_id
  where ic.code = upper(p_code);

  if not found then
    raise exception 'Invalid invite code';
  end if;

  -- Upsert profile
  insert into public.profiles (id, name, color)
  values (v_user_id, p_profile_name, p_profile_color)
  on conflict (id) do update set name = excluded.name, color = excluded.color;

  -- Join as resident (no-op if already a member)
  insert into public.flat_memberships (user_id, flat_id, role, score)
  values (v_user_id, v_flat.id, 'resident', 0)
  on conflict (user_id, flat_id) do nothing;

  return row_to_json(v_flat);
end;
$$;
