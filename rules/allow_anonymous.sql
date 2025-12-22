-- ALLOW ANONYMOUS SCREENS/PLAYLISTS
-- Since we are testing without a Login Flow yet, we need to allow rows without a user_id.

ALTER TABLE screens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE playlists ALTER COLUMN user_id DROP NOT NULL;
