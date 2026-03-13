-- Add is_read column to sms_logs for unread message tracking
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Index for efficient unread count queries per agent
CREATE INDEX IF NOT EXISTS idx_sms_logs_agent_unread
  ON sms_logs (agent_id, is_read)
  WHERE is_read = false;
