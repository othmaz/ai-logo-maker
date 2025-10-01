-- Migration: Rename generations columns to credits
-- Changes the terminology from "3 free generations" to "15 free credits"
-- Run this migration on your database before deploying credits system

-- Check and rename columns if they exist, or create them if they don't
DO $$
BEGIN
  -- Check if generations_used exists, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'generations_used'
  ) THEN
    ALTER TABLE users RENAME COLUMN generations_used TO credits_used;
  END IF;

  -- Check if generations_limit exists, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'generations_limit'
  ) THEN
    ALTER TABLE users RENAME COLUMN generations_limit TO credits_limit;
  END IF;

  -- Add credits_used if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE users ADD COLUMN credits_used INTEGER DEFAULT 0;
  END IF;

  -- Add credits_limit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits_limit'
  ) THEN
    ALTER TABLE users ADD COLUMN credits_limit INTEGER DEFAULT 15;
  END IF;
END $$;

-- Update default credits limit
ALTER TABLE users ALTER COLUMN credits_limit SET DEFAULT 15;

-- Update existing free users to have 15 credit limit
UPDATE users
SET credits_limit = 15
WHERE subscription_status = 'free' AND (credits_limit = 3 OR credits_limit IS NULL);

-- Premium users keep unlimited
UPDATE users
SET credits_limit = 999999
WHERE subscription_status = 'premium';

-- Add payment tracking columns if they don't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255);

-- Update schema comments
COMMENT ON COLUMN users.credits_used IS 'Number of logo generation credits used';
COMMENT ON COLUMN users.credits_limit IS 'Maximum credits allowed (15 for free, 999999 for premium)';