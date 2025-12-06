-- Create the avatars bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Allow public read access to avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload avatars
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );

-- Policy: Allow users to update their own avatars (or any avatar for now, simplifying for MVP)
create policy "Authenticated users can update avatars"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'avatars' );
