-- Resume Builder account storage for the shared Supabase project.
-- Run this once in the Supabase SQL editor. Safe to run again.
-- Does not change two_resume_builder_downloads or any other app's tables.
--
-- two_resume_builder_resumes  = the current CV for a signed-in user
-- two_resume_builder_versions = snapshots, newest 10 kept per CV

create table if not exists public.two_resume_builder_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled CV',
  template_id text not null,
  resume_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.two_resume_builder_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.two_resume_builder_resumes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id text not null,
  resume_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.two_resume_builder_resumes alter column user_id set default auth.uid();
alter table public.two_resume_builder_versions alter column user_id set default auth.uid();

create index if not exists two_resume_builder_resumes_user_updated
  on public.two_resume_builder_resumes (user_id, updated_at desc);

create index if not exists two_resume_builder_versions_resume_created
  on public.two_resume_builder_versions (resume_id, created_at desc);

alter table public.two_resume_builder_resumes enable row level security;
alter table public.two_resume_builder_versions enable row level security;

create or replace function public.two_resume_builder_set_owner()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace function public.two_resume_builder_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.two_resume_builder_guard_version()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (
    select 1
    from public.two_resume_builder_resumes as resume
    where resume.id = new.resume_id
      and resume.user_id = auth.uid()
  ) then
    raise exception 'Resume not found';
  end if;
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace function public.two_resume_builder_trim_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.two_resume_builder_versions
  where id in (
    select id
    from public.two_resume_builder_versions
    where resume_id = new.resume_id
    order by created_at desc, id desc
    offset 10
  );
  return new;
end;
$$;

drop trigger if exists two_resume_builder_resumes_set_owner on public.two_resume_builder_resumes;
create trigger two_resume_builder_resumes_set_owner
  before insert on public.two_resume_builder_resumes
  for each row execute function public.two_resume_builder_set_owner();

drop trigger if exists two_resume_builder_resumes_touch on public.two_resume_builder_resumes;
create trigger two_resume_builder_resumes_touch
  before update on public.two_resume_builder_resumes
  for each row execute function public.two_resume_builder_touch_updated_at();

drop trigger if exists two_resume_builder_versions_guard on public.two_resume_builder_versions;
create trigger two_resume_builder_versions_guard
  before insert on public.two_resume_builder_versions
  for each row execute function public.two_resume_builder_guard_version();

drop trigger if exists two_resume_builder_versions_trim on public.two_resume_builder_versions;
create trigger two_resume_builder_versions_trim
  after insert on public.two_resume_builder_versions
  for each row execute function public.two_resume_builder_trim_versions();

revoke all on function public.two_resume_builder_set_owner() from public, anon, authenticated;
revoke all on function public.two_resume_builder_touch_updated_at() from public, anon, authenticated;
revoke all on function public.two_resume_builder_guard_version() from public, anon, authenticated;
revoke all on function public.two_resume_builder_trim_versions() from public, anon, authenticated;

drop policy if exists two_resume_builder_resumes_select on public.two_resume_builder_resumes;
drop policy if exists two_resume_builder_resumes_insert on public.two_resume_builder_resumes;
drop policy if exists two_resume_builder_resumes_update on public.two_resume_builder_resumes;
drop policy if exists two_resume_builder_resumes_delete on public.two_resume_builder_resumes;
drop policy if exists two_resume_builder_versions_select on public.two_resume_builder_versions;
drop policy if exists two_resume_builder_versions_insert on public.two_resume_builder_versions;
drop policy if exists two_resume_builder_versions_delete on public.two_resume_builder_versions;

create policy two_resume_builder_resumes_select
  on public.two_resume_builder_resumes for select to authenticated
  using (user_id = auth.uid());

create policy two_resume_builder_resumes_insert
  on public.two_resume_builder_resumes for insert to authenticated
  with check (user_id = auth.uid());

create policy two_resume_builder_resumes_update
  on public.two_resume_builder_resumes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy two_resume_builder_resumes_delete
  on public.two_resume_builder_resumes for delete to authenticated
  using (user_id = auth.uid());

create policy two_resume_builder_versions_select
  on public.two_resume_builder_versions for select to authenticated
  using (user_id = auth.uid());

create policy two_resume_builder_versions_insert
  on public.two_resume_builder_versions for insert to authenticated
  with check (user_id = auth.uid());

create policy two_resume_builder_versions_delete
  on public.two_resume_builder_versions for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.two_resume_builder_resumes from anon;
revoke all on table public.two_resume_builder_versions from anon;
grant select, insert, update, delete on table public.two_resume_builder_resumes to authenticated;
grant select, insert, delete on table public.two_resume_builder_versions to authenticated;
