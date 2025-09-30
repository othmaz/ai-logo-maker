-- Database Schema for AI Logo Maker
-- Run this script to create all necessary tables

-- Users table (integrate with Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  subscription_status VARCHAR(50) DEFAULT 'free',
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 15
);

-- Saved logos table
CREATE TABLE IF NOT EXISTS saved_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_user_id VARCHAR(255), -- For quick lookups
  logo_url TEXT NOT NULL,
  logo_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE,
  file_format VARCHAR(10) DEFAULT 'png'
);

-- Generation history table
CREATE TABLE IF NOT EXISTS generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_user_id VARCHAR(255),
  session_id VARCHAR(255), -- For anonymous users
  prompt TEXT NOT NULL,
  logos_generated INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'generate', 'save', 'download', 'delete'
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Additional data (prompt length, file size, etc.)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_logos_clerk_user_id ON saved_logos(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_logos_user_id ON saved_logos(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_clerk_user_id ON generation_history(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_clerk_user_id ON usage_analytics(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_action ON usage_analytics(action);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created_at ON usage_analytics(created_at);