-- ═══════════════════════════════════════════════════════════════
-- CYBERTWIN Database Schema
-- Continuous Identity Verification & Cognitive Attack Narrative Reconstruction
-- 
-- Run this in your Supabase SQL Editor to initialize the database.
-- Privacy guarantee: No message content, no keystrokes, only metrics.
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Behavior Baseline (Digital Twin) ─────────────────────────
-- Stores the rolling behavioral baseline per user.
-- Updated incrementally using exponential moving average.
CREATE TABLE IF NOT EXISTS behavior_baseline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  avg_typing_speed DECIMAL(10,2) DEFAULT 0,
  avg_click_interval DECIMAL(10,2) DEFAULT 0,
  avg_mouse_speed DECIMAL(10,4) DEFAULT 0,
  avg_read_time DECIMAL(10,2) DEFAULT 0,
  avg_navigation_entropy DECIMAL(10,4) DEFAULT 0,
  login_time_pattern JSONB DEFAULT '{"preferred_hours": [], "timezone": "UTC"}'::jsonb,
  session_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Session Behavior (Time Series) ──────────────────────────
-- Each row is one behavioral snapshot from a user session.
-- Aggregated metrics only — never raw input.
CREATE TABLE IF NOT EXISTS session_behavior (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  typing_speed DECIMAL(10,2),
  click_interval DECIMAL(10,2),
  mouse_speed DECIMAL(10,4),
  navigation_depth INTEGER,
  read_time DECIMAL(10,2),
  hover_hesitation DECIMAL(10,2),
  reopen_count INTEGER DEFAULT 0,
  navigation_entropy DECIMAL(10,4),
  interaction_order_hash VARCHAR(64),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Risk Events ─────────────────────────────────────────────
-- Logged whenever risk score exceeds warning threshold.
-- Contains the human-readable attack narrative.
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  risk_score INTEGER,
  decision VARCHAR(20) CHECK (decision IN ('allow', 'warn', 'block')),
  narrative_reason TEXT,
  deviations JSONB,
  narrative_stages JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes for Performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_session_behavior_user_id ON session_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_session_behavior_timestamp ON session_behavior(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_behavior_session_id ON session_behavior(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_session_id ON risk_events(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_user_id ON risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_timestamp ON risk_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_behavior_baseline_user_id ON behavior_baseline(user_id);

-- ─── Row Level Security ───────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;

-- Service role policies (backend uses service key)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON behavior_baseline FOR ALL USING (true);
CREATE POLICY "Service role full access" ON session_behavior FOR ALL USING (true);
CREATE POLICY "Service role full access" ON risk_events FOR ALL USING (true);

-- ─── Insert Demo User ────────────────────────────────────────
-- Password: demo123 (bcrypt hash)
INSERT INTO users (id, email, password_hash, name) 
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'analyst@cybertwin.io',
  '$2a$12$LQv3c1yqBo9SkvXS7QTJPOoce3n9Z1L4tHzZgRqfFPQ7HXKsFyxyi',
  'Security Analyst'
) ON CONFLICT (email) DO NOTHING;

-- Insert demo baseline
INSERT INTO behavior_baseline (user_id, avg_typing_speed, avg_click_interval, avg_mouse_speed, avg_read_time, avg_navigation_entropy, session_count)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  220, 450, 2.1, 3500, 0.35, 50
) ON CONFLICT (user_id) DO NOTHING;
