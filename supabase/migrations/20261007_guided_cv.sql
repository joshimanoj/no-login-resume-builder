-- Guided CV builder: saved drafts and Curie review submissions. Tables use the
-- "two_" prefix this project already uses for the resume builder.
-- Additive only: creates two new tables and their access rules. Existing tables
-- (including two_resume_builder_downloads) are not changed.

-- One saved CV per signed-in student.
create table if not exists public.two_guided_cvs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,                       -- the CV (ResumeData)
  template   text  not null default 'resumake-classic',
  answers    jsonb not null default '{}'::jsonb,   -- yes/no answers that shape the flow
  prompts    jsonb not null default '{}'::jsonb,   -- "Tell me about it" boxes
  improved   jsonb not null default '[]'::jsonb,   -- sections marked improved since the last review
  updated_at timestamptz not null default now()
);

-- Each attempt submitted to Curie, with the CV exactly as submitted and the review.
create table if not exists public.two_guided_cv_submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  attempt          int  not null check (attempt between 1 and 10),
  snapshot         jsonb not null,
  status           text not null default 'reviewing'
                     check (status in ('reviewing', 'accepted', 'rejected', 'error')),
  review           jsonb,                          -- verdict, stars, overall and section feedback
  curie_trigger_id uuid,                           -- set once the real CURIE API is connected
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  unique (user_id, attempt)
);

create index if not exists two_guided_cv_submissions_user_idx on public.two_guided_cv_submissions (user_id, attempt desc);

alter table public.two_guided_cvs enable row level security;
alter table public.two_guided_cv_submissions enable row level security;

-- Students read and write only their own CV.
create policy "Students read their own CV" on public.two_guided_cvs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students create their own CV" on public.two_guided_cvs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Students update their own CV" on public.two_guided_cvs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Students read their own submissions and can submit, but only as "reviewing" with no review.
-- There is deliberately no update policy: only the server (service role) writes reviews,
-- so a student cannot mark her own CV as accepted.
create policy "Students read their own submissions" on public.two_guided_cv_submissions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students submit for review" on public.two_guided_cv_submissions
  for insert to authenticated with check ((select auth.uid()) = user_id and status = 'reviewing' and review is null and reviewed_at is null);
