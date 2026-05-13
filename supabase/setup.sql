-- Supabase SQL Setup for MoC Dashboard
-- Run this in your Supabase SQL Editor to create the required tables

-- Table for storing digest configuration
CREATE TABLE IF NOT EXISTS digest_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing digest data (articles, risks, opportunities)
CREATE TABLE IF NOT EXISTS digest_data (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing schedule information
CREATE TABLE IF NOT EXISTS digest_schedule (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_run_at TIMESTAMPTZ,
  scheduled_time TEXT DEFAULT '08:00',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE digest_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (for shared access)
-- Adjust these policies based on your security requirements

-- Config table policies
CREATE POLICY "Allow all access to digest_config" ON digest_config
  FOR ALL USING (true) WITH CHECK (true);

-- Data table policies
CREATE POLICY "Allow all access to digest_data" ON digest_data
  FOR ALL USING (true) WITH CHECK (true);

-- Schedule table policies
CREATE POLICY "Allow all access to digest_schedule" ON digest_schedule
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for the tables (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE digest_config;
ALTER PUBLICATION supabase_realtime ADD TABLE digest_data;
ALTER PUBLICATION supabase_realtime ADD TABLE digest_schedule;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_digest_data_generated_at ON digest_data(generated_at);
CREATE INDEX IF NOT EXISTS idx_digest_schedule_last_run ON digest_schedule(last_run_at);
