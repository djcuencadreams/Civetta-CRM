ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS phone_country TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_phone_country ON leads(phone_country);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_province ON leads(province);
