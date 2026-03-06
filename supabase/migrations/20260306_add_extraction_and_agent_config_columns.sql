-- Add extraction columns to call_logs for OpenAI post-call data extraction
-- Add agent configuration columns to ai_agents for Spanish handoff, tone, custom fields, call forwarding

-- =============================================================================
-- call_logs: extraction + caller metadata
-- =============================================================================

-- Structured data extracted from transcript by OpenAI (name, DOB, state, coverage, etc.)
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Extraction pipeline status: pending | processing | completed | failed
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending';

-- Which model performed the extraction (e.g. 'gpt-4o-mini')
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS extraction_model TEXT;

-- Caller identity from Telnyx SIP headers or extraction
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS caller_name TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS caller_phone TEXT;

-- Full structured transcript (role + content array) vs plain transcript_text
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcript_data JSONB;

-- =============================================================================
-- ai_agents: configuration extensions
-- =============================================================================

-- Agent-defined custom fields to collect during calls (beyond default collect_fields)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS custom_collect_fields JSONB DEFAULT '[]';

-- Whether this agent has Spanish handoff enabled
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS spanish_enabled BOOLEAN DEFAULT false;

-- Tone preset: professional | friendly | casual | empathetic
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS tone_preset TEXT DEFAULT 'professional';

-- Number to forward calls to (e.g. agent's cell for live transfer)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS call_forward_number TEXT;
