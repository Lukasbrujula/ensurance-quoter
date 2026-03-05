-- Add knowledge_base text column to ai_agents table
-- Stores free-form text (FAQs, business info, pricing) injected into the AI prompt
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS knowledge_base text;
