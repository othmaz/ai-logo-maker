# 🧪 Pre-Launch Testing Checklist

## Critical Path Testing (MUST COMPLETE BEFORE LAUNCH)

### 1. Payment Flow Testing (CRITICAL)
- [ ] **Unauthenticated User → Sign Up → Payment**
  - [ ] Start generation as anonymous user
  - [ ] Reach 3-generation limit
  - [ ] Click "SIGN UP & GET PREMIUM"
  - [ ] Complete Clerk sign-up
  - [ ] Verify ToS checkbox appears
  - [ ] Accept ToS and click "UPGRADE NOW - €9.99"
  - [ ] Complete Stripe payment with test card: `4242 4242 4242 4242`
  - [ ] Verify redirect to success page
  - [ ] Verify premium status appears immediately
  - [ ] Verify unlimited generations available
  - [ ] Verify Stripe webhook processed payment

- [ ] **Authenticated Free User → Payment**
  - [ ] Sign in as free user
  - [ ] Use 3 free generations
  - [ ] Click upgrade button
  - [ ] Verify ToS checkbox appears
  - [ ] Accept ToS and complete payment
  - [ ] Verify premium activation

- [ ] **Payment Failures**
  - [ ] Test declined card: `4000 0000 0000 0002`
  - [ ] Verify error message shown
  - [ ] Verify user remains on payment page
  - [ ] Verify no premium status granted
  - [ ] Test insufficient funds: `4000 0000 0000 9995`
  - [ ] Verify proper error handling

- [ ] **Stripe Webhook Verification**
  - [ ] Check webhook endpoint is configured in Stripe dashboard
  - [ ] Make test payment
  - [ ] Verify webhook received in Stripe dashboard
  - [ ] Verify database updated with premium status
  - [ ] Verify payment_date and stripe_payment_id saved

### 2. Premium Feature Testing (CRITICAL)
- [ ] **Download Modal Access**
  - [ ] As free user: verify only standard download available
  - [ ] As premium user: verify all formats available
  - [ ] Verify golden border on disabled formats for free users

- [ ] **8K Upscaling**
  - [ ] Generate logo as premium user
  - [ ] Select "PNG (8K, High-Resolution)" in download modal
  - [ ] Verify upscaling process completes
  - [ ] Verify downloaded file is high resolution
  - [ ] Verify error handling if upscaling fails

- [ ] **Background Removal**
  - [ ] Select "PNG (Background Removed)" format
  - [ ] Verify processing completes
  - [ ] Verify downloaded PNG has transparent background
  - [ ] Open in image editor to confirm transparency

- [ ] **SVG Vectorization**
  - [ ] Select "SVG (Vector, Scalable)" format
  - [ ] Verify SVG file downloads
  - [ ] Open in browser/vector editor to verify scalability
  - [ ] Verify vector quality is acceptable

- [ ] **Additional Formats**
  - [ ] Select "Favicon" format
  - [ ] Verify 32x32 PNG downloads
  - [ ] Select "Profile Picture" format
  - [ ] Verify 512x512 circular PNG downloads

### 3. Usage Limit Enforcement (CRITICAL)
- [ ] **Anonymous User Limits**
  - [ ] Generate 3 logos without signing in
  - [ ] Verify localStorage tracking increments
  - [ ] On 4th attempt, verify upgrade modal appears
  - [ ] Clear localStorage and verify reset to 3 generations

- [ ] **Free User Limits**
  - [ ] Sign in as new free user
  - [ ] Generate 3 logos
  - [ ] Verify database tracking increments
  - [ ] On 4th attempt, verify upgrade modal appears
  - [ ] Verify usage counter shows "0 remaining"

- [ ] **Premium User Access**
  - [ ] Sign in as premium user
  - [ ] Verify "PREMIUM" badge visible in navbar
  - [ ] Generate 10+ logos without limits
  - [ ] Verify no upgrade prompts appear

### 4. Authentication Flow (HIGH PRIORITY)
- [ ] **Sign Up**
  - [ ] Test email/password sign-up
  - [ ] Test Google OAuth sign-up
  - [ ] Verify Clerk styling matches retro theme
  - [ ] Verify redirect after sign-up

- [ ] **Sign In**
  - [ ] Test email/password sign-in
  - [ ] Test Google OAuth sign-in
  - [ ] Verify session persistence
  - [ ] Test "Remember me" functionality

- [ ] **User Profile**
  - [ ] Click user avatar in navbar
  - [ ] Verify profile modal opens
  - [ ] Update email address
  - [ ] Update password
  - [ ] Verify changes saved

### 5. Core Logo Generation (HIGH PRIORITY)
- [ ] **Basic Generation**
  - [ ] Fill in business name
  - [ ] Add industry and description
  - [ ] Select colors
  - [ ] Choose logo type (wordmark/pictorial)
  - [ ] Click "GENERATE LOGOS"
  - [ ] Verify 5 logos generate successfully
  - [ ] Verify all logos match specifications

- [ ] **Refinement Flow**
  - [ ] Select logos and provide feedback
  - [ ] Click "REFINE SELECTED"
  - [ ] Verify refined logos generate
  - [ ] Test 3 rounds of refinement
  - [ ] Verify feedback incorporated

- [ ] **Error Handling**
  - [ ] Test with empty business name → verify error
  - [ ] Test with very long input → verify handling
  - [ ] Test with special characters → verify sanitization
  - [ ] Simulate API failure → verify error message

### 6. Cross-Browser Testing (MEDIUM PRIORITY)
- [ ] **Chrome (Latest)**
  - [ ] Full payment flow
  - [ ] Logo generation
  - [ ] Download functionality
  - [ ] UI rendering

- [ ] **Firefox (Latest)**
  - [ ] Full payment flow
  - [ ] Logo generation
  - [ ] Download functionality
  - [ ] UI rendering

- [ ] **Safari (Latest)**
  - [ ] Full payment flow
  - [ ] Logo generation
  - [ ] Download functionality
  - [ ] UI rendering

- [ ] **Edge (Latest)**
  - [ ] Full payment flow
  - [ ] Logo generation
  - [ ] Download functionality
  - [ ] UI rendering

### 7. Mobile Device Testing (MEDIUM PRIORITY)
- [ ] **iPhone (iOS)**
  - [ ] Responsive design
  - [ ] Touch interactions
  - [ ] Payment flow
  - [ ] Logo generation
  - [ ] File downloads

- [ ] **Android Phone**
  - [ ] Responsive design
  - [ ] Touch interactions
  - [ ] Payment flow
  - [ ] Logo generation
  - [ ] File downloads

- [ ] **Tablet (iPad)**
  - [ ] Landscape orientation
  - [ ] Portrait orientation
  - [ ] All core features

### 8. Legal & Compliance (CRITICAL)
- [ ] **Terms of Service**
  - [ ] ToS checkbox appears before payment
  - [ ] ToS link opens modal correctly
  - [ ] Content is readable and complete
  - [ ] Cannot proceed without accepting

- [ ] **Privacy Policy**
  - [ ] Link accessible in footer
  - [ ] Link accessible in payment flow
  - [ ] Content is complete
  - [ ] Mentions data collection practices

- [ ] **Contact Information**
  - [ ] About page accessible
  - [ ] Support email visible
  - [ ] Email link works (mailto:support@ailogomaker.com)

### 9. Performance Testing (MEDIUM PRIORITY)
- [ ] **Page Load Times**
  - [ ] Homepage loads < 3 seconds
  - [ ] Dashboard loads < 2 seconds
  - [ ] Logo generation < 30 seconds

- [ ] **Concurrent Users**
  - [ ] Test 5 simultaneous generations
  - [ ] Test 10 simultaneous generations
  - [ ] Verify no crashes or slowdowns

### 10. Security Testing (HIGH PRIORITY)
- [ ] **Environment Variables**
  - [ ] Verify no API keys in client code
  - [ ] Verify .env not committed to git
  - [ ] Verify Vercel env vars configured

- [ ] **API Endpoints**
  - [ ] Verify authentication required for premium features
  - [ ] Test unauthorized access attempts
  - [ ] Verify CORS properly configured

- [ ] **Payment Security**
  - [ ] Verify PCI compliance (Stripe handles this)
  - [ ] Verify no payment data stored locally
  - [ ] Verify HTTPS enforced in production

## Pre-Launch Deployment Checklist

### Vercel Configuration
- [ ] Environment variables set:
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY`
  - [ ] `CLERK_SECRET_KEY`
  - [ ] `GOOGLE_AI_API_KEY`
  - [ ] `REPLICATE_API_KEY`
  - [ ] `POSTGRES_URL`

- [ ] Stripe Webhook Configuration
  - [ ] Webhook endpoint added: `https://yourdomain.com/api/stripe/webhook`
  - [ ] Events enabled: `payment_intent.succeeded`, `payment_intent.payment_failed`
  - [ ] Webhook secret copied to Vercel env vars

- [ ] Domain Configuration
  - [ ] Custom domain configured
  - [ ] SSL certificate active
  - [ ] DNS records propagated

### Database Setup
- [ ] Tables created and migrated
- [ ] Indexes optimized for queries
- [ ] Backup strategy in place

### Monitoring Setup
- [ ] Error tracking configured (if using Sentry)
- [ ] Analytics enabled (if using Vercel Analytics)
- [ ] Uptime monitoring configured

## Launch Day Checklist

### 1 Hour Before Launch
- [ ] Run full test suite one final time
- [ ] Verify production environment variables
- [ ] Test production payment flow with small amount
- [ ] Clear any test data from database
- [ ] Verify backup systems operational

### At Launch
- [ ] Deploy to production
- [ ] Monitor error logs closely
- [ ] Monitor Stripe webhook events
- [ ] Monitor database queries
- [ ] Be ready to rollback if critical issues

### 1 Hour After Launch
- [ ] Complete first real user transaction test
- [ ] Verify webhook processing working
- [ ] Check error rates
- [ ] Monitor user sign-ups
- [ ] Monitor payment conversions

## Testing Notes

### Test Stripe Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- CVC: Any 3 digits
- Expiry: Any future date
- ZIP: Any 5 digits

### Test User Accounts
Create test accounts for each scenario:
1. New anonymous user
2. Free authenticated user (0 generations used)
3. Free authenticated user (3 generations used)
4. Premium authenticated user

### Critical Bugs (Show Stoppers)
- Payment not processing
- Webhooks not firing
- Premium features not accessible after payment
- Logo generation completely broken
- Security vulnerabilities

### Non-Critical Bugs (Can Launch With)
- Minor UI glitches
- Non-essential features broken
- Performance issues with specific edge cases

---

**Last Updated:** 2025-09-30
**Status:** Ready for Testing
**Estimated Testing Time:** 8-12 hours for comprehensive testing