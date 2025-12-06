-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Public info for users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PEOPLE (Family/Friends)
create table public.people (
  id uuid default uuid_generate_v4() primary key,
  created_by uuid references public.profiles(id) not null,
  name text not null,
  relation text,
  avatar_url text,
  theme_color text default 'bg-stone-100',
  birthday date,
  sharing_preference text default 'ASK_EVERY_TIME' check (sharing_preference in ('ALWAYS_SHARE', 'ASK_EVERY_TIME')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.people enable row level security;


-- 3. PERSON_SHARES (Collaborators)
create table public.person_shares (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  user_email text, -- For invites before they join
  user_id uuid references public.profiles(id), -- Nullable until they accept/join
  role text default 'EDITOR' check (role in ('EDITOR', 'VIEWER')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.person_shares enable row level security;


-- 4. HEALTH RECORDS
create table public.health_records (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  title text not null,
  date date not null,
  type text default 'OTHER',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.health_records enable row level security;


-- 5. TODOS
create table public.todos (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  title text not null,
  due_date date,
  is_completed boolean default false,
  priority text default 'MEDIUM',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.todos enable row level security;


-- 6. NOTES
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  title text,
  content text,
  tags text[],
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.notes enable row level security;


-- --- RLS POLICIES ---

-- Helper function to check access
create or replace function public.has_access_to_person(target_person_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.people
    where id = target_person_id and created_by = auth.uid()
  ) or exists (
    select 1 from public.person_shares
    where person_id = target_person_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;


-- PEOPLE Policies
create policy "Users can view people they created or are shared with."
  on public.people for select
  using ( has_access_to_person(id) );

create policy "Users can create people."
  on public.people for insert
  with check ( auth.uid() = created_by );

create policy "Creators and Editors can update people."
  on public.people for update
  using ( 
    created_by = auth.uid() or 
    exists (select 1 from public.person_shares where person_id = id and user_id = auth.uid() and role = 'EDITOR')
  );

create policy "Only creators can delete people."
  on public.people for delete
  using ( created_by = auth.uid() );


-- SHARES Policies
create policy "Users can view shares for people they have access to."
  on public.person_shares for select
  using ( has_access_to_person(person_id) );

create policy "Creators can manage shares."
  on public.person_shares for all
  using ( 
    exists (select 1 from public.people where id = person_id and created_by = auth.uid())
  );


-- SUB-RESOURCES (Health, Todos, Notes) Policies
-- (Repeating similar logic for each for simplicity, though could be optimized)

-- Health
create policy "View health records if access to person."
  on public.health_records for select
  using ( has_access_to_person(person_id) );

create policy "Add health records if access to person."
  on public.health_records for insert
  with check ( has_access_to_person(person_id) );

create policy "Update health records if access to person."
  on public.health_records for update
  using ( has_access_to_person(person_id) );

create policy "Delete health records if access to person."
  on public.health_records for delete
  using ( has_access_to_person(person_id) );

-- Todos
create policy "View todos if access to person."
  on public.todos for select
  using ( has_access_to_person(person_id) );

create policy "Add todos if access to person."
  on public.todos for insert
  with check ( has_access_to_person(person_id) );

create policy "Update todos if access to person."
  on public.todos for update
  using ( has_access_to_person(person_id) );

create policy "Delete todos if access to person."
  on public.todos for delete
  using ( has_access_to_person(person_id) );

-- Notes
create policy "View notes if access to person."
  on public.notes for select
  using ( has_access_to_person(person_id) );

create policy "Add notes if access to person."
  on public.notes for insert
  with check ( has_access_to_person(person_id) );

create policy "Update notes if access to person."
  on public.notes for update
  using ( has_access_to_person(person_id) );

create policy "Delete notes if access to person."
  on public.notes for delete
  using ( has_access_to_person(person_id) );
