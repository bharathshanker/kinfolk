-- 7. FINANCIAL RECORDS
create table public.financial_records (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.people(id) on delete cascade not null,
  title text not null,
  amount numeric not null,
  type text default 'EXPENSE' check (type in ('OWED', 'LENT', 'GIFT', 'EXPENSE')),
  date date not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.financial_records enable row level security;

-- Finance Policies (Same as others)
create policy "View finance records if access to person."
  on public.financial_records for select
  using ( has_access_to_person(person_id) );

create policy "Add finance records if access to person."
  on public.financial_records for insert
  with check ( has_access_to_person(person_id) );

create policy "Update finance records if access to person."
  on public.financial_records for update
  using ( has_access_to_person(person_id) );

create policy "Delete finance records if access to person."
  on public.financial_records for delete
  using ( has_access_to_person(person_id) );
