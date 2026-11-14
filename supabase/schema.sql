-- ProposalPilot cloud sync: freelancer profiles and proposal history.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Every row belongs to the signed-in user; Row Level Security blocks everyone else.

create table if not exists public.freelancer_profiles (
  id uuid primary key,                          -- same id as in the extension
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  data jsonb not null,                          -- name, headline, skills, rate, highlights...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_history (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid references public.freelancer_profiles (id) on delete set null,
  profile_label text,
  job_title text not null check (char_length(job_title) <= 300),
  platform text not null,
  proposal text not null check (char_length(proposal) <= 8000),
  price_amount numeric not null default 0,
  price_currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create index if not exists freelancer_profiles_user_idx
  on public.freelancer_profiles (user_id);
create index if not exists proposal_history_user_created_idx
  on public.proposal_history (user_id, created_at desc);

alter table public.freelancer_profiles enable row level security;
alter table public.proposal_history enable row level security;

-- Each user can only see and change their own rows.
drop policy if exists "own profiles" on public.freelancer_profiles;
create policy "own profiles" on public.freelancer_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own history" on public.proposal_history;
create policy "own history" on public.proposal_history
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Keep at most 300 drafts per user (oldest removed first).
create or replace function public.trim_proposal_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.proposal_history
  where user_id = new.user_id
    and id in (
      select id from public.proposal_history
      where user_id = new.user_id
      order by created_at desc
      offset 300
    );
  return null;
end;
$$;

drop trigger if exists trim_proposal_history on public.proposal_history;
create trigger trim_proposal_history
  after insert on public.proposal_history
  for each row execute function public.trim_proposal_history();
