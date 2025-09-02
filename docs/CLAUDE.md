# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Free AI Logo Maker** application - a React-based web app that generates professional logos using Google Gemini AI. The project consists of a React frontend with TypeScript and an Express.js backend server that interfaces with the Gemini API for image generation.

## Quick Setup & Running Instructions

**One-Command Setup (Recommended for Claude):**
```bash
# Install dependencies (if not already installed)
npm install

# Create environment file
cp .env.example .env

# Start both servers (backend in background, frontend in foreground)
npm run server &
npm run dev
```

**Frontend (Vite + React):**
```bash
npm run dev          # Start development server on port 5174 (localhost only)
npm run dev -- --host  # Start with network access (required for AI assistant access)
npm run build        # Build for production (runs TypeScript compilation then Vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Backend Server:**
```bash
npm run server       # Start Express server on port 3001
npm start           # Alias for npm run server
```

**Full Development Setup:**
- Run `npm run server` in one terminal for the backend
- Run `npm run dev -- --host` in another terminal for the frontend (required for AI assistant access)
- Frontend proxies API calls to backend via Vite proxy config in vite.config.ts:10-14

**Hot Module Replacement (HMR) Configuration:**
- HMR is configured to use `localhost` for WebSocket connections while allowing network access
- This prevents WebSocket "pending" issues while maintaining AI assistant accessibility
- Configuration in `vite.config.ts:10-12`:
  ```javascript
  hmr: {
    host: 'localhost'  // WebSocket uses localhost while server uses 0.0.0.0
  }
  ```

**Access Points:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:3001
- API endpoints: http://localhost:3001/api/generate-logo

**Expected Output When Running:**
- Backend: "Server running at http://localhost:3001"
- Frontend: "VITE v7.1.4 ready in XXX ms" with localhost URL

**Troubleshooting:**

**WebSocket/HMR Issues:**
- If WebSocket shows "pending" state: Ensure `npm run dev -- --host` is used with proper HMR config
- If HMR not working: Check vite.config.ts has correct `hmr: { host: 'localhost' }` configuration
- If AI assistant cannot access: Use `npm run dev -- --host` and verify network URL appears

**Connection Issues:**
- If ports are busy: Check if other processes are using ports 3001 or 5174
- If backend fails: Ensure Node.js v18+ is installed
- If frontend fails: Check if dependencies are installed (`npm install`)
- If API calls fail: Verify backend is running and check proxy config in vite.config.ts

**Folder Structure Issues:**
- If encountering duplicate files: The project has been cleaned up to use root `src/` directory only
- Removed duplicate `logo-maker-app/` folder structure to prevent confusion
- All active development files are in the root directory structure

**WebSocket Debugging:**
- Open browser DevTools → Network tab → look for WebSocket connections
- Check Messages tab for HMR updates: `{"type":"update",...}` indicates working HMR
- `{"type":"ping"}` messages indicate stable WebSocket connection

## Architecture & Key Components

### Project Structure (Current Directory: `ai-logo-maker/`)

**Frontend Structure (`src/`)**
- **App.tsx** - Main application component with multi-level UI design and complex state management
- **main.tsx** - React app entry point
- **index.css** - Tailwind CSS imports and custom animations

**Backend Structure (root directory)**
- **server.js** - Express server handling logo generation API with Gemini integration
- **package.json** - Unified dependencies for both frontend and backend

### Key Features
1. **Multi-Round Logo Generation**: Users can generate 5 logos, select favorites, and refine them through multiple rounds
2. **Logo Reference System**: Users can select from famous brand logos (Apple, Google, Nike, etc.) as style inspiration
3. **Custom Image Upload**: Users can upload up to 3 reference images
4. **Smart Prompt Building**: Complex prompt generation system that creates 5 different logo variations per round
5. **Background Options**: Users can choose transparent or colored backgrounds
6. **Direct Download**: Generated logos can be downloaded as PNG files

### API Integration
- **Google Gemini API**: Uses `gemini-2.5-flash-image-preview` model for logo generation
- **Fallback System**: Enhanced placeholder generation when API quota is exceeded
- **Environment Variables**: `GEMINI_API_KEY` required for production, falls back to placeholders in development
- **Proxy Configuration**: Frontend proxies API calls to backend via Vite config (vite.config.ts:10-14)

### Frontend Architecture Patterns
- **Multi-Level Scrolling Design**: Hero section (Level 0) → Form section (Level 1) → Results sections (Level 2+)
- **State Management**: Local React state with complex form data structure using TypeScript interfaces
- **Progressive Enhancement**: Form builds detailed prompts based on user inputs
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Analytics Integration**: Google Analytics 4 tracking for logo generation events via @vercel/analytics

### Prompt Engineering System
- **Base Prompt Building**: Extracts business name, industry, description
- **Variation Generation**: Creates 5 distinct approaches (wordmark, symbol+text, typography, geometric, lettermark)
- **Reference Integration**: Incorporates selected brand logos and custom images
- **Refinement Logic**: Subsequent rounds refine based on user selections

## Development Guidelines

### Code Style
- **TypeScript**: Strict typing enabled for frontend components with comprehensive interfaces
- **ESLint**: Configured with React hooks and TypeScript rules (eslint.config.js)
- **Component Structure**: Functional components with hooks
- **Tailwind CSS**: Utility-first styling with custom animations

### API Error Handling
- Always provide fallback placeholder images when Gemini API fails (server.js:28-31)
- Log errors appropriately for debugging
- Handle quota exceeded (429) errors gracefully

### State Management Patterns
- Form data uses single state object with TypeScript interfaces (App.tsx:10-20)
- Logo generation history tracked in generationHistory array
- Selection state managed separately from logo data

### Deployment Considerations
- **Railway Deployment**: Backend configured for Railway with domain detection
- **Static File Serving**: Generated logos served from `/images` endpoint (server.js:23)
- **CORS**: Enabled for cross-origin requests (server.js:13)
- **Environment Variables**: `GEMINI_API_KEY`, `RAILWAY_PUBLIC_DOMAIN`
- **Vercel Integration**: Includes @vercel/analytics and @vercel/speed-insights

## Common Development Tasks

### Adding New Logo Reference
Update the `logoReferences` array in `App.tsx:44+` with new brand logos using the Simple Icons CDN pattern.

### Modifying Prompt Generation
Edit the `createPromptVariations()` and `refinePromptFromSelection()` functions in `App.tsx`. These control how user inputs are converted to AI prompts.

### Extending Form Fields
Update the `FormData` interface (App.tsx:10-20) and corresponding form elements in the Level 1 section of `App.tsx`.

### Backend API Changes
Modify `server.js` for new endpoints or Gemini API integration changes. The server handles both single and multiple logo generation.

### Testing
- Currently no formal test suite implemented
- Manual testing recommended via development servers
- Consider adding Playwright tests for UI interactions

## Environment Setup
1. Copy `.env.example` to `.env` in the root directory
2. Add `GEMINI_API_KEY=your_key_here` for production use
3. Backend falls back to placeholder images if no API key is set

## Port Configuration
- Frontend: 5174 (configured in vite.config.ts:8)
- Backend: 3001 (configured in server.js:11)
- Proxy: Frontend proxies `/api` calls to backend (vite.config.ts:10-14)

## Project Structure Clarification
- **Current Directory**: `ai-logo-maker/` (this is the working directory)
- **Root Directory**: Contains all active development files (package.json, server.js, vite.config.ts)
- **src/**: React frontend source code (App.tsx, main.tsx, index.css)
- **Removed**: Duplicate `logo-maker-app/` folder structure to prevent confusion
- **Single Source**: All development uses this unified directory structure