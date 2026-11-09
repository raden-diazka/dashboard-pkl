-- Skema database Dashboard PKL untuk Supabase.
-- Jalankan seluruh isi file ini di Supabase: menu SQL Editor → New query → Run.
-- Aman dijalankan ulang: semua objek memakai IF NOT EXISTS / OR REPLACE.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  school text not null default '',
  class_name text not null default '',
  company text not null default '',
  department text not null default '',
  supervisor text not null default '',
  supervisor_title text not null default 'Pembimbing Lapangan',
  start_date date,
  end_date date,
  target_hours integer not null default 480,
  last_export_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  start_time text not null default '08:00',
  end_time text not null default '16:00',
  activity text not null default '',
  result text not null default '',
  obstacle text not null default '',
  category text not null default 'pekerjaan'
    check (category in ('pekerjaan', 'belajar', 'lainnya')),
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, date desc);

create table if not exists public.attendance (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'libur')),
  note text,
  primary key (user_id, date)
);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due date,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at desc);

-- Setiap pengguna hanya boleh membaca dan mengubah barisnya sendiri.
alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;
alter table public.attendance enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "profiles milik sendiri" on public.profiles;
create policy "profiles milik sendiri" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "journal milik sendiri" on public.journal_entries;
create policy "journal milik sendiri" on public.journal_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "attendance milik sendiri" on public.attendance;
create policy "attendance milik sendiri" on public.attendance
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks milik sendiri" on public.tasks;
create policy "tasks milik sendiri" on public.tasks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
