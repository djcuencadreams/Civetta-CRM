
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP,
ADD COLUMN IF NOT EXISTS customer_lifecycle_stage VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
