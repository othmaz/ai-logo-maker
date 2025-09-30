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

### 3. Credits System Testing (CRITICAL - NEW)
- [ ] **Anonymous User Credits**
  - [ ] Visit site without signing in
  - [ ] Verify "15 credits remaining" displayed
  - [ ] Generate first batch of logos (uses 1 credit)
  - [ ] Verify counter shows "14 credits remaining"
  - [ ] Use all 15 credits
  - [ ] Verify upgrade modal appears on 16th attempt
  - [ ] Verify localStorage key `anonymousCreditsUsed` = 15

- [ ] **Free User Credits**
  - [ ] Sign in as new free user
  - [ ] Verify "15 credits remaining" displayed
  - [ ] Generate logos and verify database `credits_used` increments
  - [ ] Use all 15 credits
  - [ ] Verify "0 credits remaining" shown
  - [ ] Verify upgrade modal appears on next attempt
  - [ ] Check database: `credits_limit` should be 15

- [ ] **Premium User Credits**
  - [ ] Sign in as premium user
  - [ ] Verify "Unlimited credits" badge visible
  - [ ] Generate 20+ batches without limits
  - [ ] Verify no upgrade prompts appear
  - [ ] Check database: `credits_limit` should be 999999

- [ ] **Credits Display Throughout App**
  - [ ] Verify credits counter in navbar
  - [ ] Verify credits shown before "Generate" button
  - [ ] Verify hero section shows "15 FREE CREDITS"
  - [ ] Verify About page mentions credits system
  - [ ] Verify upgrade modal shows credits language

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
  - [ ] Verify 1 credit deducted

- [ ] **Batch Refinement Flow (Default)**
  - [ ] Select 1-2 logos by clicking them
  - [ ] Verify selection indicator (blue ring + checkmark)
  - [ ] Provide feedback in textarea
  - [ ] Click "REFINE SELECTED"
  - [ ] Verify 5 refined logos generate
  - [ ] Verify 1 credit deducted
  - [ ] Test 3 rounds of refinement
  - [ ] Verify feedback incorporated in results

- [ ] **Single-Logo Refinement Mode (NEW)**
  - [ ] Generate initial 5 logos
  - [ ] Hover over any logo
  - [ ] Verify ✨ "Refine This" button appears
  - [ ] Click ✨ button on one logo
  - [ ] Verify mode activation banner appears
  - [ ] Verify banner shows focused logo thumbnail
  - [ ] Verify "Iterating on Logo #X" message
  - [ ] Verify ✨ button highlights in cyan
  - [ ] Verify auto-scroll to feedback section
  - [ ] Provide specific feedback
  - [ ] Click "Refine Selected" button
  - [ ] Verify 5 new variations of that specific logo generated
  - [ ] Verify 1 credit deducted
  - [ ] Repeat refinement 2-3 more times
  - [ ] Verify focused logo persists through rounds
  - [ ] Click "Exit Mode" button
  - [ ] Verify return to batch mode
  - [ ] Verify banner disappears

- [ ] **Switching Between Modes**
  - [ ] Start in batch mode
  - [ ] Click ✨ on logo #1 → enters single-logo mode
  - [ ] Refine logo #1 once
  - [ ] Click ✨ on logo #2 → switches focus
  - [ ] Verify banner updates to show logo #2
  - [ ] Verify logo #2 button highlighted
  - [ ] Refine logo #2 once
  - [ ] Click "Exit Mode" → return to batch
  - [ ] Verify can select multiple logos again

- [ ] **Error Handling**
  - [ ] Test with empty business name → verify error
  - [ ] Test with very long input → verify handling
  - [ ] Test with special characters → verify sanitization
  - [ ] Simulate API failure → verify error message
  - [ ] Try to refine in single-logo mode without feedback → verify error
  - [ ] Try to select more than 2 logos in batch mode → verify warning

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