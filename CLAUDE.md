# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY DEPLOYMENT SAFETY PROTOCOLS 🚨

**CRITICAL: This deployment has bulletproof safety systems in place after a 5-hour debugging nightmare. ALL Claude Code instances MUST follow these protocols:**

### 🔒 BEFORE ANY DEPLOYMENT/PUSH CHANGES:

1. **ALWAYS use safe deployment command:**
   ```bash
   npm run safe-push
   ```
   This automatically: Creates backup → Validates → Pushes → Health checks

2. **NEVER use regular `git push` for deployment changes**

3. **For manual control:**
   ```bash
   npm run backup-deployment    # Create backup first
   npm run validate-deployment  # Validate configuration
   git push                     # Then push
   npm run health-check        # Verify deployment
   ```

### 🛡️ CRITICAL FILES PROTECTION:

These files have caused deployment failures and are NOW PROTECTED:
- `vercel.json` - Route order is CRITICAL
- `package.json` - Build scripts are CRITICAL  
- `client/package.json` - Dependencies are CRITICAL

**Before touching ANY of these files:**
1. Run `npm run backup-deployment`
2. Make changes
3. Run `npm run validate-deployment` 
4. Only commit if validation passes

### 🚑 EMERGENCY RECOVERY:

If deployment breaks:
```bash
npm run restore-backup                    # List available backups
npm run restore-backup backup-name        # Restore working state
npm run validate-deployment              # Confirm it works
```

### ⚡ QUICK REFERENCE:

- `npm run safe-push` - Ultimate safe deployment 
- `npm run backup-deployment` - Create backup
- `npm run restore-backup` - List/restore backups
- `npm run validate-deployment` - Check config
- `npm run health-check` - Test live deployment

## Architecture Overview

This is a full-stack AI logo generation application with the following structure:

- **Frontend**: React + TypeScript + Vite client in `client/` directory
- **Backend**: Express.js server in `server/server.js` using Google Gemini AI
- **Styling**: Tailwind CSS + Custom CSS animations in `client/src/animations.css`
- **Deployment**: Supports both Vercel and Railway platforms

### Key Components

**Client Architecture (`client/src/App.tsx`)**:
- Single-page React app with multi-step logo generation workflow
- Uses Tailwind CSS for styling with dark gradient theme
- Modern fluid gradient animations for loading states
- Implements iterative refinement system (3 rounds of logo generation)
- Chronological layout system where refinements appear below previous results
- Auto-scroll functionality to latest generated results
- Google Analytics integration for tracking user interactions
- Logo reference system using famous brand logos for style inspiration
- Image compression and base64 conversion for API transmission
- **Clerk Authentication**: Full user authentication with Sign In/Sign Up components
- **Freemium Business Logic**: 3 free generations for anonymous users, unlimited for paid
- **Legal & Support System**: Terms of Service, Privacy Policy, and Contact Us modals
- **Premium Download System**: Automatic upscaling for paid users (1K → 8K resolution)
- **Floating Contact Button**: Always-visible customer support access
- **Upgrade Modal**: Payment flow integration for premium features

**Server Architecture (`server/server.js`)**:
- Express.js API with CORS enabled
- Google Gemini AI integration for image generation with image+text refinement
- Replicate AI integration for Real-ESRGAN upscaling (premium feature)
- Three main endpoints:
  - `/api/generate` - Single logo generation (legacy)
  - `/api/generate-multiple` - Batch logo generation (up to 5 logos)
  - `/api/upscale` - Logo upscaling using Real-ESRGAN (post-payment)
- Support for reference image processing in refinement mode
- Comprehensive debugging logs for image transmission tracking
- Fallback placeholder system when API limits are reached
- File storage in `generated-logos/` directory

**Animation System (`client/src/animations.css`)**:
- Modern fluid gradient animations for button loading states
- Bouncing dots with staggered timing for loading indicators
- CSS keyframe animations for gradient movement and color transitions
- Hover effects and interactive button states
- Responsive animation system that adapts to different screen sizes
- Hardware acceleration optimizations for smooth performance
- Infinite scrolling title animation with 300s cycle timing
- Retro button effects with shadow-based press animations
- Navigation shimmer effects on hover
- Performance fixes to prevent animation blinking

## Common Development Commands

### Development
```bash
# Start development (client only)
npm run dev

# Start full development (both client and server)
npm run dev:full

# Start server only
npm run server
```

### Building
```bash
# Build client
npm run build

# Build for Vercel deployment
npm run vercel-build

# Build for Railway (uses build.sh)
./build.sh
```

### 🚀 DEPLOYMENT (USE THESE COMMANDS!)
```bash
# RECOMMENDED: Ultimate safe deployment
npm run safe-push

# Manual deployment steps:
npm run backup-deployment     # Create backup
npm run validate-deployment   # Validate config  
git push                      # Deploy
npm run health-check         # Verify

# Backup & restore:
npm run backup-deployment     # Create timestamped backup
npm run restore-backup        # List available backups  
npm run restore-backup NAME   # Restore specific backup
```

### Linting
```bash
# Lint client code
npm run lint
```

### Environment Setup
- Copy `.env.example` to `.env`
- Set `GEMINI_API_KEY` for AI logo generation
- Set `REPLICATE_API_TOKEN` for logo upscaling (premium feature)
- Set `VITE_CLERK_PUBLISHABLE_KEY` in `client/.env.local` for user authentication
- Server runs on port 3001, client on port 5174

## Deployment Configurations

**Vercel**: Configured via `vercel.json` - builds both client and server, routes API calls to server
**Railway**: Configured via `railway.toml` - uses `build.sh` for building, runs `npm start`

## Key Business Logic

- Logo generation uses prompt engineering with 5 different style variations
- Iterative refinement system (3 rounds) with image+text API calls to Gemini
- Users can select up to 2 logos for focused refinement with feedback
- Chronological results display (Round 1 → Round 2 → Round 3)
- Auto-scroll to latest results for seamless user experience
- Reference image processing with compression and base64 encoding
- Tagline exclusion by default unless explicitly requested by user
- Fallback placeholder generation when API quotas are exceeded
- Image uploads limited to 3 files, 5MB each
- Reference logo system allows up to 5 brand inspirations
- Modern loading animations with fluid gradients during generation
- 80s retro aesthetic with pixel-perfect typography and electric color scheme
- Professional toast notification system for enhanced user experience
- SEO-optimized for search discoverability and social media sharing

### Freemium Business Model
- **Free Tier**: 3 logo generations at 1024x1024 resolution
- **Premium Tier**: €10 payment for unlimited generations + automatic 8K upscaling
- **Register-at-Checkout**: Users only create accounts when making payment
- **Smart Download System**: Free users get standard resolution, paid users get upscaled versions
- **Legal Compliance**: Comprehensive Terms of Service and Privacy Policy for EU/GDPR compliance

The app is designed for entrepreneurs to quickly generate professional logos without design skills, featuring a distinctive 80s retro aesthetic that stands out from generic modern logo makers.

## Recent Major Changes (2025-09)

### Layout & UX Improvements
- **Fixed refinement layout**: New refined logos now appear **below** previous results (chronological order)
- **Auto-scroll enhancement**: Automatic smooth scroll to latest results after each generation/refinement
- **Unified rendering system**: Single `_generationHistory.map()` loop handles all rounds instead of separate current/historical sections

### Animation System Overhaul
- **Modern gradient animations**: Replaced basic spinning circles with fluid gradient overlays
- **Enhanced button styling**: `font-extrabold text-2xl` with white text for maximum contrast
- **Contrasted color schemes**:
  - Generate button: `blue-400 → purple-400 → pink-400 → red-400 → orange-400`
  - Refine button: `purple-400 → pink-400 → cyan-400 → green-400 → yellow-400`
- **Bouncing dot loaders**: Staggered animation timing with smooth scaling
- **Button press effects**: Scale and shadow transitions for tactile feedback

### Logo Refinement System
- **Image+text API format**: Proper Gemini API structure with reference images and text prompts
- **Base64 image compression**: Client-side image processing to reduce payload size
- **Debugging system**: Comprehensive server logs for tracking image transmission
- **Prompt engineering**: Specialized refinement prompts that preserve original design while applying changes

### 80s Retro Design Transformation (September 2025)
- **Typography overhaul**: Implemented authentic retro fonts (Press Start 2P, VT323, IBM Plex Mono)
- **Hero banner redesign**: "CRAFT YOUR LOGO WITH AI POWER" with pixel-perfect styling
- **Terminal-style messaging**: "> 2 MINUTES. NO DESIGN SKILLS NEEDED." prompt format
- **Blocky CTA button**: Sharp 90° corners with electric blue border and neon glow effects
- **Electric color scheme**: Cyan (#00ffff), neon green (#39ff14), electric pink (#ff10f0)
- **Pixel-art icons**: 🧠 for AI-powered, 💾 for downloads, 🆓 for free features
- **Retro button effects**: Shadow-based press animations and gradient cycling

### Navigation System Overhaul (September 2025)
- **Infinite Scrolling Title**: Seamless 300s cycle with hardware-accelerated smooth scrolling
- **Performance Optimizations**: Fixed animation blinking issues with `translateZ(0)` and `backface-visibility: hidden`
- **Mobile-Responsive Navigation**: Full hamburger menu implementation for screens under 1280px
- **Retro Navigation Styling**: Monospace fonts, electric blue borders, vertical-spanning buttons
- **Authentication Positioning**: Fixed Sign In/Sign Up button overlap with scrolling title
- **Clickable Title Bar**: Entire scrolling title acts as home button for smooth scroll-to-top
- **Mobile Menu Overlay**: 60% width, left-aligned, glass-morphism backdrop with proper spacing

### Title Bar Responsive Improvements (September 2025)
- **Unified Font Implementation**: Removed `mobile-font` overrides to use consistent Phosphate font across all devices
- **Responsive Font Scaling**: Font sizes precisely match container heights with 5% overflow for bold effect
  - Mobile (`h-16`/64px): `text-[4.2rem]` (67.2px) - 105% of container height
  - Medium (`md:h-24`/96px): `md:text-[6.3rem]` (100.8px) - 105% of container height
  - Large (`lg:h-32`/128px): `lg:text-[8.82rem]` (141.12px) - 110% of container height
- **Perfect Positioning**: Top-aligned text that fills entire vertical space of title bar
- **Hardware Acceleration**: CSS transforms with `translateZ(0)` for smooth performance
- **Container Architecture**: Clean separation between title bar and navigation bar layers
- **Cross-Device Consistency**: Same retro stretched aesthetic on mobile, tablet, and desktop

### Production-Ready Features
- **SEO optimization**: Comprehensive meta tags, Open Graph cards, Twitter previews
- **Professional notifications**: Toast system replacing browser alerts (success/error/warning/info)
- **Social media ready**: Custom 1200x630 SVG preview image for platform sharing
- **Image quality improvements**: Full 1024x1024 PNG output with lossless refinement

### Legal & Business Compliance (September 2025)
- **Terms of Service Modal**: Comprehensive ToS covering freemium model, payment terms, refund policy
- **Privacy Policy Modal**: GDPR-compliant privacy documentation with data collection transparency
- **Contact Us System**: Floating button with multi-channel support (email, live chat, help center)
- **Register-at-Checkout Compliance**: Legal framework for payment-gated account creation
- **Premium Download Infrastructure**: Automatic logo upscaling for paid users (1K → 8K resolution)

### AI Upscaling System (September 2025)
- **Replicate Integration**: Real-ESRGAN model for 4x logo upscaling (1024x1024 → 4096x4096)
- **Cost-Optimized Workflow**: Upscaling only triggered after payment, not during generation
- **Smart Download Logic**: Automatic detection of paid vs free users for appropriate resolution
- **Fallback System**: Graceful degradation to original resolution if upscaling fails
- **Premium Tracking**: Enhanced analytics for premium downloads and upscaling success rates

### Clerk Authentication System (September 2025)
- **React Integration**: Full Clerk authentication using `@clerk/clerk-react` package
- **User Authentication**: Sign In/Sign Up buttons with UserButton in header
- **Freemium Logic**: Anonymous users (3 free), signed-in users (3 free), paid users (unlimited)
- **Usage Tracking**: localStorage for anonymous users, Clerk metadata for authenticated users
- **Payment Flow**: Upgrade modal with premium benefits and authentication flow
- **User State Management**: `useUser` hook integration with existing business logic

### File Structure Updates
```
client/
├── public/
│   ├── favicon.ico          # Custom favicon
│   ├── og-image.svg         # Social media preview image (1200x630)
│   └── og-image.html        # Template for preview generation
├── src/
│   ├── App.tsx              # Main app with Clerk auth, retro styling and toast notifications
│   ├── animations.css       # Modern animations + retro 80s styling system
│   └── main.tsx             # ClerkProvider integration with React app
├── .env.local               # VITE_CLERK_PUBLISHABLE_KEY for authentication
└── index.html               # Enhanced with SEO meta tags and retro fonts

server/
├── server.js                # Serverless-ready with data URL fallbacks + Replicate upscaling
├── package.json             # Includes replicate dependency for AI upscaling
└── ...
```

### Navigation Technical Implementation

**Mobile Responsiveness**:
- **Breakpoint Strategy**: Changed from `md:` (768px) to `xl:` (1280px) for desktop navigation display
- **Hamburger Menu**: Animated three-line icon that transforms to X when opened
- **Overlay System**: Mobile menu appears as 60% width overlay with glass-morphism backdrop
- **Touch-Friendly**: All mobile interactions optimized for touch interfaces

**Desktop Navigation**:
- **Retro Styling**: Press Start 2P font, electric blue borders, full vertical height buttons
- **Pipe Separators**: Visual delimiters between navigation sections
- **Shimmer Effects**: Diagonal shimmer animation on hover using `.nav-shimmer` class
- **Button Spacing**: Optimized horizontal and vertical padding for consistent layout

**Scrolling Title System**:
- **Infinite Animation**: 300s cycle with `-1000%` translateX for seamless infinite effect
- **Hardware Acceleration**: `will-change: transform` and `translateZ(0)` for smooth performance
- **Clickable Area**: Entire title bar acts as home button with `scrollToHome()` function
- **Text Spacing**: Adjusted `marginRight: '-60px'` for tighter title spacing

**Title Bar Responsive Implementation**:
- **Font Consistency**: Removed `mobile-font` class to use Phosphate font universally
- **Responsive Heights**: Title bar scales with `h-16 md:h-24 lg:h-32` container heights
- **Precise Font Sizing**: Direct font size mapping to container heights plus overflow
- **Top Alignment**: `items-start` positioning ensures text sticks to top of container
- **Overflow Strategy**: 5-10% font overflow creates bold, extended visual effect

**Animation Performance**:
- **Blinking Fix**: Added `backface-visibility: hidden` and hardware acceleration
- **Smooth Scrolling**: `scroll({ behavior: 'smooth' })` for navigation interactions
- **Optimized Keyframes**: Reduced GPU strain with transform-only animations

## Latest Implementation Details (September 2025)

### Replicate Upscaling System

**Backend Implementation (`server/server.js`)**:
```javascript
// New dependencies
const Replicate = require('replicate')

// New endpoint: /api/upscale
app.post('/api/upscale', async (req, res) => {
  // Uses Real-ESRGAN model: nightmareai/real-esrgan
  // Scales logos from 1024x1024 to 4096x4096 (4x upscaling)
  // Includes comprehensive error handling and authentication
})
```

**Frontend Integration (`client/src/App.tsx`)**:
```javascript
// New functions for premium downloads
const upscaleLogo = async (logoUrl, scale = 4) => { /* API call to /api/upscale */ }
const processLogoForDownload = async (logo) => { /* Post-payment processing */ }
const downloadLogo = async (logo) => { /* Smart download with upscaling for paid users */ }
```

**Environment Variables**:
```bash
GEMINI_API_KEY=your_gemini_key      # For logo generation
REPLICATE_API_TOKEN=your_token      # For AI upscaling
```

### Legal & Support Modals

**Modal System**: Three comprehensive modals accessible via footer links and floating button:
- **Terms of Service**: Covers freemium model, payment terms, refund policy, IP rights
- **Privacy Policy**: GDPR-compliant data collection, usage, and user rights documentation
- **Contact Us**: Multi-channel support with contact form and business information

**Floating Contact Button**: Fixed position bottom-right, always visible during scroll

### Business Logic Integration

**Free Users**:
- Generate up to 3 logos at 1024x1024 resolution
- Download original resolution images
- Access to all refinement features

**Paid Users (€10)**:
- Unlimited logo generation
- **Automatic 8K upscaling** via Real-ESRGAN on download
- Premium filename: `business-name-logo-8K.png`
- Enhanced analytics tracking for premium features

**Cost Control**:
- Upscaling only occurs AFTER payment confirmation
- No upscaling during generation phase to minimize API costs
- Fallback to original resolution if upscaling fails

### Dependencies Added

**Server (`server/package.json`)**:
```json
{
  "dependencies": {
    "replicate": "^latest"
  }
}
```

**Client (`client/package.json`)**:
```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.48.1"
  }
}
```

### Clerk Authentication System

**Setup (`client/src/main.tsx`)**:
```javascript
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>
)
```

**Authentication Components (`client/src/App.tsx`)**:
```javascript
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react'

// Authentication header
<SignedOut>
  <SignInButton />
  <SignUpButton />
</SignedOut>
<SignedIn>
  <UserButton />
</SignedIn>

// Business logic integration
const { isSignedIn, user } = useUser()
const isPaid = isSignedIn && user?.publicMetadata?.isPaid === true
```

**Environment Variables**:
```bash
# client/.env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Freemium Business Logic**:
- **Anonymous Users**: 3 free generations tracked in localStorage
- **Signed-in Users**: 3 free generations tracked in Clerk user metadata
- **Paid Users**: Unlimited generations with 8K upscaling
- **Upgrade Flow**: Modal-based payment integration ready for Stripe

## Deployment Issues & Solutions

This section documents critical deployment issues encountered and their solutions. **Read this before making deployment changes!**

### Issue 1: "No Output Directory named 'dist' found"

**Problem**: Vercel couldn't find the build output directory after building.

**Root Cause**: The `vercel.json` configuration had incorrect `distDir` path. Initially set to `"client/dist"` but this was relative to the wrong base directory.

**Solution**:
```json
{
  "src": "client/package.json",
  "use": "@vercel/static-build",
  "config": {
    "distDir": "dist"  // Should be relative to client/, not root
  }
}
```

**Final Working Solution**: Use root `package.json` as build source:
```json
{
  "src": "package.json",
  "use": "@vercel/static-build", 
  "config": {
    "distDir": "client/dist"  // Correct path from root
  }
}
```

### Issue 2: Persistent 404 Errors After Successful Build

**Problem**: Build succeeded but website showed 404 NOT_FOUND errors.

**Root Cause**: Incorrect routing configuration - all requests were falling through incorrectly.

**Failed Attempts**:
1. `"dest": "/$1"` - Tried to serve files directly but path was wrong
2. Using `buildCommand` and `outputDirectory` instead of `builds` array
3. Complex routing with multiple static file handlers

**Final Solution**: Simplified routing with proper catch-all for React SPA:
```json
"routes": [
  {"src": "/api/(.*)", "dest": "server/server.js"},
  {"src": "/images/(.*)", "dest": "server/server.js"},  
  {"src": "/(.*)", "dest": "/index.html"}
]
```

### Issue 3: MIME Type Errors - JavaScript Files Served as HTML

**Problem**: Console errors showing `"Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'"`

**Root Cause**: All requests (including `.js` and `.css` files) were being served as `index.html` due to catch-all routing.

**Solution**: Add specific routes for static assets BEFORE the catch-all route:
```json
"routes": [
  {"src": "/api/(.*)", "dest": "server/server.js"},
  {"src": "/images/(.*)", "dest": "server/server.js"},
  {"src": "/assets/(.*)", "dest": "/assets/$1"},
  {"src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$)", "dest": "/$1"},
  {"src": "/(.*)", "dest": "/index.html"}
]
```

### Issue 4: Build Dependencies Not Installing

**Problem**: Vite and other client dependencies weren't available during Vercel build.

**Root Cause**: Using `@vercel/static-build` on `client/package.json` but dependencies weren't being installed in the build environment.

**Solution**: Modified root `package.json` build scripts to explicitly install client dependencies:
```json
"scripts": {
  "build": "cd client && npm install && npm run build",
  "vercel-build": "cd client && npm install && npm run build"
}
```

### Final Working Vercel Configuration

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/dist"
      }
    },
    {
      "src": "server/server.js", 
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "server/server.js"},
    {"src": "/images/(.*)", "dest": "server/server.js"},
    {"src": "/assets/(.*)", "dest": "/assets/$1"},
    {"src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$)", "dest": "/$1"},
    {"src": "/(.*)", "dest": "/index.html"}
  ]
}
```

### Key Lessons Learned

1. **Route Order Matters**: Static asset routes must come BEFORE catch-all routes
2. **Build Source Location**: Use root `package.json` for consistent builds
3. **Dependency Management**: Explicitly install client dependencies in build scripts
4. **Path Relativity**: `distDir` is relative to the build source, not the project root
5. **SPA Routing**: React apps need catch-all routing to `index.html` for client-side routing
6. **Asset Serving**: Static files need direct serving to maintain proper MIME types

### Debugging Tips

- Check Vercel build logs for "No Output Directory" errors
- Use browser dev tools to see if assets return HTML instead of JS/CSS
- Verify build output location with `npm run build` locally
- Test routes with curl to see what's actually being served
- Check that static assets exist in the built output directory

---

# 🤖 FOR FUTURE CLAUDE CODE INSTANCES

## READ THIS FIRST - DEPLOYMENT SAFETY MANDATORY

This repository has **bulletproof deployment protection** after a 5-hour debugging disaster. You MUST follow these protocols:

### 🚨 NEVER BREAK THESE RULES:

1. **NEVER PUSH WITHOUT EXPLICIT USER APPROVAL** - User controls what and when to push/deploy
2. **ALWAYS use `npm run safe-push` for deployment changes** (when user approves)
3. **NEVER use regular `git push` for deployment-related changes**  
4. **NEVER modify `vercel.json`, `package.json` without backup first**
5. **ALWAYS validate before committing with `npm run validate-deployment`**

### 🛡️ SAFETY SYSTEMS IN PLACE:

- **Backup System**: Auto-creates timestamped backups before changes
- **Validation System**: Prevents all known deployment failures
- **Health Check System**: Verifies deployments work correctly
- **Pre-commit Hooks**: Blocks broken configurations automatically

### ⚡ COMMANDS TO USE:

**For deployment:** `npm run safe-push`
**For backup:** `npm run backup-deployment`
**For validation:** `npm run validate-deployment`  
**For emergency:** `npm run restore-backup`

**IMPORTANT**: Update the deployment URL in `scripts/health-check.cjs` with the actual Vercel URL for health checks to work.

### 🚑 IF USER REPORTS DEPLOYMENT ISSUES:

1. Immediately run `npm run restore-backup` 
2. Show available backups to user
3. Restore to last working state
4. Run `npm run validate-deployment` to confirm
5. Check `DEPLOYMENT_LOCKDOWN.md` for emergency procedures

### 💀 WHAT WILL BREAK DEPLOYMENT:

- Changing route order in `vercel.json`
- Modifying build scripts in `package.json`
- Breaking the exact `distDir` configuration
- Serving static assets as HTML (MIME type errors)

**The user lost 5 hours debugging these. DO NOT let it happen again.**

## DEPLOYMENT MANTRA: USER APPROVAL → BACKUP → VALIDATE → DEPLOY → VERIFY

**🚫 NEVER PUSH/DEPLOY WITHOUT EXPLICIT USER PERMISSION**

**Only when user approves: Use `npm run safe-push` and the user will love you forever! 🚀**

---

