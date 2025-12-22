-- Enable Storage Extension (usually enabled by default)

-- 1. Create the Bucket
insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do nothing;

-- 2. Enable RLS (Usually enabled by default. Commenting out to avoid permission errors)
-- alter table storage.objects enable row level security;

-- 3. Policy: Public Read Access (For Players/TVs)
-- Any device (even unauthenticated) needs to download the assets
create policy "Public Access via URL"
on storage.objects for select
using ( bucket_id = 'campaign-assets' );

-- 4. Policy: Authenticated Upload (For Dashboard)
create policy "Authenticated Users can upload"
on storage.objects for insert
with check (
  bucket_id = 'campaign-assets' 
  and auth.role() = 'authenticated'
);

-- 5. Policy: Authenticated Update/Delete
create policy "Authenticated Users can update/delete"
on storage.objects for update
using (
  bucket_id = 'campaign-assets' 
  and auth.role() = 'authenticated'
);

create policy "Authenticated Users can delete"
on storage.objects for delete
using (
  bucket_id = 'campaign-assets' 
  and auth.role() = 'authenticated'
);
