# Database Schema - LumenDS

## Tables

### `screens`
Represents a physical TV/Player.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `created_at` | timestamptz | Date registered |
| `name` | text | Friendly name (e.g. "Reception TV") |
| `pairing_code` | text | 6-digit code for setup (Unique) |
| `status` | text | 'online' \| 'offline' |
| `last_ping` | timestamptz | For heartbeat monitoring |
| `playlist_id` | uuid | FK to `playlists.id` (Current content) |
| `user_id` | uuid | Owner (Auth ID) |

### `playlists`
An ordered collection of content.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `name` | text | e.g. "Summer Sale" |
| `items` | jsonb | Array of asset objects: `[{ url, duration, type }]` |
| `user_id` | uuid | Owner |

### `profiles` (Extends Auth)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | PK, references auth.users |
| `tunnel_url` | text | Current active tunnel URL (e.g. https://xyz.trycloudflare.com) |

## SQL Init

```sql
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
```
