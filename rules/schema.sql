-- Enable UUIDs
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
  id uuid references auth.users not null primary key,
  tunnel_url text,
  updated_at timestamptz default now()
);

-- SCREENS
create table screens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text,
  pairing_code text unique,
  status text default 'offline',
  last_ping timestamptz,
  current_playlist_id uuid, -- FK added later
  created_at timestamptz default now()
);

-- PLAYLISTS
create table playlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  items jsonb default '[]'::jsonb, -- [{ "id": "1", "type": "video", "path": "promo.mp4", "duration": 10 }]
  created_at timestamptz default now()
);

-- RLS (Row Level Security)
alter table profiles enable row level security;
alter table screens enable row level security;
alter table playlists enable row level security;

-- POLICIES
create policy "Users can see own profiles" on profiles for select using (auth.uid() = id);
create policy "Users can update own profiles" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profiles" on profiles for insert with check (auth.uid() = id);

create policy "Users can manage screens" on screens for all using (auth.uid() = user_id);
create policy "Users can manage playlists" on playlists for all using (auth.uid() = user_id);
