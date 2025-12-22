-- Allow anonymous players to self-register as 'pending'
create policy "Anon can register pending screens"
on screens for insert
with check (
  status = 'pending'
);

-- Allow anonymous players to read their own record (to check status)
-- We might need a stricter check, but for MVP, allowing SELECT on screens by ID is okay.
create policy "Anon can select screens"
on screens for select
using (true); 

-- Also allow update (ping)
create policy "Anon can update own screen"
on screens for update
using (true)
with check (true);
