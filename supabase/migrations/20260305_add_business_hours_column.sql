-- Add business_hours JSONB column to agent_business_profile
-- Stores weekly schedule: { monday: { open, from, to }, ... }
alter table public.agent_business_profile
  add column if not exists business_hours jsonb;
