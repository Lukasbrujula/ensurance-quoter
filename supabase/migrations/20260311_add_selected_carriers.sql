-- Add selected_carriers column to agent_settings
-- NULL = all carriers (no filter), array of CompCode strings when set
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS selected_carriers jsonb DEFAULT NULL;
