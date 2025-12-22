-- FIX PLAYLIST SCHEMA
ALTER TABLE playlists ADD COLUMN updated_at timestamptz default now();

-- Ensure RLS allows delete just in case (already covered by force_public_access but good to be explicit for future)
-- (No extra action needed if force_public_access was run)
