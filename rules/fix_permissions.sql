-- FIX 1: Add Foreign Key Relationship (Was missing in original schema)
-- This allows appropriate joining: screens.current_playlist_id -> playlists.id
ALTER TABLE screens 
  ADD CONSTRAINT fk_screens_playlist 
  FOREIGN KEY (current_playlist_id) 
  REFERENCES playlists (id) 
  ON DELETE SET NULL;

-- FIX 2: Allow Player (Anonymous) to READ Screens and Playlists
-- For MVP, we allow public read. In production, we'd secure this with a shared secret or function.
CREATE POLICY "Public Read Screens" 
ON screens FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Public Read Playlists" 
ON playlists FOR SELECT 
TO anon 
USING (true);

-- FIX 3: Allow Player to Update Ping/Status
-- We allow anonymous users to update screens (to report status 'online').
CREATE POLICY "Public Update Screens" 
ON screens FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);
