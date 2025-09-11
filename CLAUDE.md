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
- **Deployment**: Supports both Vercel and Railway platforms

### Key Components

**Client Architecture (`client/src/App.tsx`)**:
- Single-page React app with multi-step logo generation workflow
- Uses Tailwind CSS for styling with dark gradient theme
- Implements iterative refinement system (3 rounds of logo generation)
- Google Analytics integration for tracking user interactions
- Logo reference system using famous brand logos for style inspiration

**Server Architecture (`server/server.js`)**:
- Express.js API with CORS enabled
- Google Gemini AI integration for image generation
- Two main endpoints:
  - `/api/generate` - Single logo generation
  - `/api/generate-multiple` - Batch logo generation (up to 5 logos)
- Fallback placeholder system when API limits are reached
- File storage in `generated-logos/` directory

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
- Server runs on port 3001, client on port 5174

## Deployment Configurations

**Vercel**: Configured via `vercel.json` - builds both client and server, routes API calls to server
**Railway**: Configured via `railway.toml` - uses `build.sh` for building, runs `npm start`

## Key Business Logic

- Logo generation uses prompt engineering with 5 different style variations
- Refinement system allows users to iterate on selected logos
- Fallback placeholder generation when API quotas are exceeded
- Image uploads limited to 3 files, 5MB each
- Reference logo system allows up to 5 brand inspirations

The app is designed for entrepreneurs to quickly generate professional logos without design skills.

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

1. **ALWAYS use `npm run safe-push` for deployment changes**
2. **NEVER use regular `git push` for deployment-related changes**  
3. **NEVER modify `vercel.json`, `package.json` without backup first**
4. **ALWAYS validate before committing with `npm run validate-deployment`**

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

## DEPLOYMENT MANTRA: BACKUP → VALIDATE → DEPLOY → VERIFY

**Use `npm run safe-push` and the user will love you forever! 🚀**

---

