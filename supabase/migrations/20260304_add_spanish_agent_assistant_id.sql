-- Add spanish_agent_assistant_id to ai_agents table
-- Stores the Telnyx assistant ID for the Spanish-language specialist agent
-- Used by the handoff tool to transfer callers who prefer Spanish
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS spanish_agent_assistant_id text;
