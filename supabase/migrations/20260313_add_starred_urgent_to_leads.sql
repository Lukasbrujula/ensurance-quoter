-- Add starred and urgent flags to leads for inbox filtering
ALTER TABLE leads ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false;
