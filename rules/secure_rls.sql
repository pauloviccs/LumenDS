-- Enable RLS on tables
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- 1. CLEANUP EXISTING POLICIES (To avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON public.screens;
DROP POLICY IF EXISTS "Allow anonymous access" ON public.screens;
DROP POLICY IF EXISTS "Public for screens" ON public.screens;
DROP POLICY IF EXISTS "Public Access" ON public.playlists;
DROP POLICY IF EXISTS "Allow anonymous access" ON public.playlists;

-- CLEANUP NEW POLICIES (In case re-running)
DROP POLICY IF EXISTS "Public Read Playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users Create Playlists" ON public.playlists;
DROP POLICY IF EXISTS "Owners Update Playlists" ON public.playlists;
DROP POLICY IF EXISTS "Owners Delete Playlists" ON public.playlists;

DROP POLICY IF EXISTS "Public Read Screens" ON public.screens;
DROP POLICY IF EXISTS "Users Create Screens" ON public.screens;
DROP POLICY IF EXISTS "Owners Update Screens" ON public.screens;
DROP POLICY IF EXISTS "Owners Delete Screens" ON public.screens;

-- 2. PLAYLISTS POLICIES
-- Allow anyone to READ playlists (Player needs this to download content)
CREATE POLICY "Public Read Playlists" 
ON public.playlists FOR SELECT 
TO public 
USING (true);

-- Allow AUTHENTICATED users to INSERT their own playlists
CREATE POLICY "Users Create Playlists" 
ON public.playlists FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow OWNERS to UPDATE their own playlists
CREATE POLICY "Owners Update Playlists" 
ON public.playlists FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow OWNERS to DELETE their own playlists
CREATE POLICY "Owners Delete Playlists" 
ON public.playlists FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);


-- 3. SCREENS POLICIES
-- Allow anyone to READ screens (Player needs to check pairing code)
CREATE POLICY "Public Read Screens" 
ON public.screens FOR SELECT 
TO public 
USING (true);

-- Allow AUTHENTICATED users to INSERT screens (Pairing)
CREATE POLICY "Users Create Screens" 
ON public.screens FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow OWNERS to UPDATE their own screens (Name, Playlist)
CREATE POLICY "Owners Update Screens" 
ON public.screens FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow OWNERS to DELETE their own screens
CREATE POLICY "Owners Delete Screens" 
ON public.screens FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);


-- 4. SECURE PLAYER PING (RPC)
-- Since RLS blocks anonymous updates, we use this function for the Player to say "I'm alive".
-- It runs with "SECURITY DEFINER" (Admin privileges) but only does one very specific thing.

CREATE OR REPLACE FUNCTION ping_screen(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.screens
  SET status = 'online', 
      last_ping = now()
  WHERE pairing_code = p_code;
END;
$$;

-- Grant execute permission to anon/public
GRANT EXECUTE ON FUNCTION ping_screen(text) TO public;
GRANT EXECUTE ON FUNCTION ping_screen(text) TO anon;
GRANT EXECUTE ON FUNCTION ping_screen(text) TO authenticated;
