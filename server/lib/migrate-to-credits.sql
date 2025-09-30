-- Migration: Rename generations columns to credits
-- Changes the terminology from "3 free generations" to "15 free credits"
-- Run this migration on your database before deploying credits system

-- Rename columns in users table
ALTER TABLE users
  RENAME COLUMN generations_used TO credits_used;

ALTER TABLE users
  RENAME COLUMN generations_limit TO credits_limit;

-- Update default credits limit from 3 to 15 for free users
ALTER TABLE users
  ALTER COLUMN credits_limit SET DEFAULT 15;

-- Update existing free users to have 15 credit limit
UPDATE users
SET credits_limit = 15
WHERE subscription_status = 'free' AND credits_limit = 3;

-- Premium users keep unlimited (represented as large number)
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
COMMENT ON COLUMN users.subscription_status IS 'User subscription level: free or premium';