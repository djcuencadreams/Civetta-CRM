CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  source VARCHAR(50) NOT NULL DEFAULT 'website',
  notes TEXT,
  converted_to_customer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_contact TIMESTAMP,
  next_follow_up TIMESTAMP,
  customer_lifecycle_stage VARCHAR(50),
  converted_customer_id INTEGER REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  type VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);