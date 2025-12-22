-- Migration: Add Orientation Support
ALTER TABLE public.screens ADD COLUMN orientation INTEGER DEFAULT 0;

-- Allow Public/Anon to read this column (RLS policy 'Public Read Screens' usually covers 'SELECT *', so this is automatic if using *)
-- If specific columns were listed in RLS (rare), we'd need to update, but usually SELECT * covers it.
