-- ----------------------------------------------------------------
-- agent_business_profile: global business knowledge base per user
-- Stores business name, free-form knowledge base text, and FAQ
-- entries that apply to ALL AI agents owned by the user.
-- ----------------------------------------------------------------

create table if not exists public.agent_business_profile (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references auth.users(id) on delete cascade,
  business_name text,
  knowledge_base text,
  faq         jsonb default '[]'::jsonb,
  updated_at  timestamptz not null default now(),

  constraint agent_business_profile_agent_id_key unique (agent_id)
);

-- RLS
alter table public.agent_business_profile enable row level security;

create policy "Users can read own business profile"
  on public.agent_business_profile for select
  using (auth.uid() = agent_id);

create policy "Users can insert own business profile"
  on public.agent_business_profile for insert
  with check (auth.uid() = agent_id);

create policy "Users can update own business profile"
  on public.agent_business_profile for update
  using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

create policy "Users can delete own business profile"
  on public.agent_business_profile for delete
  using (auth.uid() = agent_id);
