-- FORCE PUBLIC ACCESS (FULL CRUD)
-- Debugging only: Allows anonymous users (Dashboard/Player) to do EVERYTHING.

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Screens" ON screens;
DROP POLICY IF EXISTS "Public Update Screens" ON screens;
DROP POLICY IF EXISTS "Public Insert Screens" ON screens;
DROP POLICY IF EXISTS "Public Delete Screens" ON screens;

DROP POLICY IF EXISTS "Public Read Playlists" ON playlists;
DROP POLICY IF EXISTS "Public Insert Playlists" ON playlists;
DROP POLICY IF EXISTS "Public Update Playlists" ON playlists;
DROP POLICY IF EXISTS "Public Delete Playlists" ON playlists;

-- 2. SCREENS POLICIES
CREATE POLICY "Public Read Screens" ON screens FOR SELECT TO public USING (true);
CREATE POLICY "Public Insert Screens" ON screens FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public Update Screens" ON screens FOR UPDATE TO public USING (true);
CREATE POLICY "Public Delete Screens" ON screens FOR DELETE TO public USING (true);

-- 3. PLAYLISTS POLICIES
CREATE POLICY "Public Read Playlists" ON playlists FOR SELECT TO public USING (true);
CREATE POLICY "Public Insert Playlists" ON playlists FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public Update Playlists" ON playlists FOR UPDATE TO public USING (true);
CREATE POLICY "Public Delete Playlists" ON playlists FOR DELETE TO public USING (true);
