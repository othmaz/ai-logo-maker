# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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