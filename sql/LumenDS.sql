-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.playlists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlists_pkey PRIMARY KEY (id),
  CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  tunnel_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.screens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  name text,
  pairing_code text UNIQUE,
  status text DEFAULT 'offline'::text,
  last_ping timestamp with time zone,
  current_playlist_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT screens_pkey PRIMARY KEY (id),
  CONSTRAINT screens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_screens_playlist FOREIGN KEY (current_playlist_id) REFERENCES public.playlists(id)
);