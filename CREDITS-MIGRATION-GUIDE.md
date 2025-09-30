# 🔄 Credits System Migration Guide

## Overview

This guide helps you migrate your existing database from the "generations" terminology to the new "credits" system.

**Changes:**
- 3 free generations → **15 free credits**
- generations_used → **credits_used**
- generations_limit → **credits_limit**

## Prerequisites

- Access to your Vercel Postgres database
- Vercel CLI installed (`npm i -g vercel`)
- Database connection string from Vercel dashboard

## Migration Steps

### Option 1: Using Vercel CLI (Recommended)

```bash
# 1. Navigate to project directory
cd ai-logo-maker

# 2. Connect to your Vercel Postgres database
vercel env pull

# 3. Run the migration script
psql $POSTGRES_URL -f server/lib/migrate-to-credits.sql

# 4. Verify the migration
psql $POSTGRES_URL -c "SELECT clerk_user_id, credits_used, credits_limit, subscription_status FROM users LIMIT 5;"
```

### Option 2: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Postgres** → **Data**
3. Click **Query** tab
4. Copy and paste the contents of `server/lib/migrate-to-credits.sql`
5. Click **Run Query**
6. Verify the results show successful ALTER TABLE commands

### Option 3: Manual Migration

If you prefer to run commands manually:

```sql
-- 1. Rename columns
ALTER TABLE users RENAME COLUMN generations_used TO credits_used;
ALTER TABLE users RENAME COLUMN generations_limit TO credits_limit;

-- 2. Update default
ALTER TABLE users ALTER COLUMN credits_limit SET DEFAULT 15;

-- 3. Update existing free users
UPDATE users
SET credits_limit = 15
WHERE subscription_status = 'free' AND credits_limit = 3;

-- 4. Ensure premium users have unlimited
UPDATE users
SET credits_limit = 999999
WHERE subscription_status = 'premium';

-- 5. Add payment tracking columns (if not exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255);
```

## Verification

After running the migration, verify it worked:

```sql
-- Check column names changed
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('credits_used', 'credits_limit');

-- Check user data
SELECT
  clerk_user_id,
  subscription_status,
  credits_used,
  credits_limit,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Verify free users have 15 credits
SELECT COUNT(*) as free_users_with_15_credits
FROM users
WHERE subscription_status = 'free'
AND credits_limit = 15;

-- Verify premium users have unlimited
SELECT COUNT(*) as premium_users_unlimited
FROM users
WHERE subscription_status = 'premium'
AND credits_limit = 999999;
```

## Expected Results

After migration:
- ✅ All free users should have `credits_limit = 15`
- ✅ All premium users should have `credits_limit = 999999`
- ✅ No users should have `credits_limit = 3` or `credits_limit = 5`
- ✅ Columns `generations_used` and `generations_limit` no longer exist
- ✅ Columns `credits_used` and `credits_limit` exist

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Rename back
ALTER TABLE users RENAME COLUMN credits_used TO generations_used;
ALTER TABLE users RENAME COLUMN credits_limit TO generations_limit;

-- Reset limits
ALTER TABLE users ALTER COLUMN generations_limit SET DEFAULT 3;

UPDATE users
SET generations_limit = 3
WHERE subscription_status = 'free';
```

## Post-Migration

After successful migration:

1. **Deploy the new frontend code** that uses the credits terminology
2. **Test the credit system**:
   - Create a new anonymous user → should have 15 credits
   - Sign up as a new user → should have 15 credits
   - Use credits → count should decrement
   - Upgrade to premium → should show unlimited

3. **Monitor for errors**:
   - Check Vercel logs for any SQL errors
   - Monitor Stripe webhooks for payment processing
   - Watch user sign-ups and credit usage

## Troubleshooting

### Error: "column 'generations_used' does not exist"
- ✅ Migration was successful! The old columns were renamed.
- Deploy the updated code that uses `credits_used` and `credits_limit`

### Error: "column 'credits_used' does not exist"
- ❌ Migration hasn't run yet
- Run the migration script from this guide

### Users still see "3 free tries"
- Check if frontend code is deployed
- Clear browser cache
- Check that localStorage doesn't have old `anonymousGenerationsUsed` key

### Premium users showing limited credits
- Run: `UPDATE users SET credits_limit = 999999 WHERE subscription_status = 'premium';`
- Verify webhook is updating subscription_status correctly

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify database connection string is correct
3. Ensure migration script ran without errors
4. Contact support if problems persist

---

**Migration Created:** 2025-09-30
**Database Version:** PostgreSQL (Vercel)