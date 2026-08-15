-- Photo Booth Ecosystem — Supabase schema (Revision 2)
-- Run in Supabase SQL editor, or via `supabase db push` from a migration file.

create extension if not exists "pgcrypto";

-- ============================================================
-- operators
-- ============================================================
create table operators (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar not null unique,
  display_name varchar,
  role varchar not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- templates
-- ============================================================
create table templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references operators(id) on delete cascade,
  name varchar not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- events
-- ============================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  slug varchar not null unique,
  name varchar not null,
  owner_id uuid not null references operators(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  is_active boolean not null default true,
  gallery_expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- printers
-- ============================================================
create table printers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name varchar not null,
  daemon_hostname varchar not null,
  status varchar not null default 'offline'
    check (status in ('online','offline','error','paper_low','ink_low')),
  is_backup boolean not null default false,
  last_heartbeat_at timestamptz
);

-- ============================================================
-- sessions
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  session_code varchar not null,
  status varchar not null default 'capturing'
    check (status in ('capturing','processing','completed','failed')),
  raw_photos text[] not null default '{}',
  composite_url text,
  enhanced_url text,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_sessions_event on sessions(event_id);
create index idx_sessions_code on sessions(session_code);

-- ============================================================
-- print_jobs
-- ============================================================
create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  printer_id uuid references printers(id) on delete set null,
  image_url text not null,
  copies integer not null default 1,
  status varchar not null default 'queued'
    check (status in ('queued','printing','printed','failed')),
  retry_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  printed_at timestamptz
);
create index idx_print_jobs_event on print_jobs(event_id);
create index idx_print_jobs_status on print_jobs(status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table operators enable row level security;
alter table templates enable row level security;
alter table events enable row level security;
alter table printers enable row level security;
alter table sessions enable row level security;
alter table print_jobs enable row level security;

-- Operators: can only see/edit their own row
create policy "operators_self" on operators
  for select using (id = auth.uid());
create policy "operators_self_update" on operators
  for update using (id = auth.uid());

-- Templates: owner-scoped
create policy "templates_owner_all" on templates
  for all using (owner_id = auth.uid());

-- Events: owner-scoped for write; public read for active events (kiosk/gallery need this)
create policy "events_owner_write" on events
  for all using (owner_id = auth.uid());
create policy "events_public_read_active" on events
  for select using (is_active = true);

-- Printers: scoped via parent event's owner
create policy "printers_owner_all" on printers
  for all using (
    event_id in (select id from events where owner_id = auth.uid())
  );

-- Sessions: public insert/select (guest kiosk flow uses anon auth + session_code as the
-- de facto secret), owner has full access via event ownership
create policy "sessions_public_insert" on sessions
  for insert with check (true);
create policy "sessions_public_select" on sessions
  for select using (true);
create policy "sessions_owner_all" on sessions
  for all using (
    event_id in (select id from events where owner_id = auth.uid())
  );

-- Print jobs: owner-scoped only (never exposed to guest client directly)
create policy "print_jobs_owner_all" on print_jobs
  for all using (
    event_id in (select id from events where owner_id = auth.uid())
  );

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table print_jobs;
alter publication supabase_realtime add table printers;
