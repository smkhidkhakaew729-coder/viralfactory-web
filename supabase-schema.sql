-- ViralFactory AI Database Schema
-- วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  topic text,
  script text,
  storyboard jsonb,
  characters jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  platform text,
  content text,
  scheduled_at timestamptz,
  posted_at timestamptz,
  status text default 'draft',
  fb_post_id text,
  created_at timestamptz default now()
);

create table if not exists public.affiliate_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  platform text,
  clicks int default 0,
  earnings numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  content text,
  platform text,
  scheduled_at timestamptz,
  status text default 'planned',
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.projects enable row level security;
alter table public.posts enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.calendar_events enable row level security;

-- Policies (each user sees only their own data)
create policy "users can manage own projects" on public.projects for all using (auth.uid() = user_id);
create policy "users can manage own posts" on public.posts for all using (auth.uid() = user_id);
create policy "users can manage own affiliate_links" on public.affiliate_links for all using (auth.uid() = user_id);
create policy "users can manage own calendar_events" on public.calendar_events for all using (auth.uid() = user_id);
