# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Free AI Logo Maker** application - a React-based web app that generates professional logos using Google Gemini AI. The project consists of a React frontend with TypeScript and an Express.js backend server that interfaces with the Gemini API for image generation.

## Development Commands

**Frontend (Vite + React):**
```bash
cd logo-maker-app
npm run dev          # Start development server on port 5174
npm run build        # Build for production (runs TypeScript compilation then Vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Backend Server:**
```bash
cd logo-maker-app
npm run server       # Start Express server on port 3001
npm start           # Alias for npm run server
```

**Full Development Setup:**
- Run `npm run server` in one terminal for the backend
- Run `npm run dev` in another terminal for the frontend
- Frontend proxies API calls to backend via Vite proxy config

## Architecture & Key Components

### Frontend Structure (`logo-maker-app/src/`)
- **App.tsx** - Main application component with multi-level UI design
- **main.tsx** - React app entry point
- **index.css** - Tailwind CSS imports and custom animations

### Backend Structure (`logo-maker-app/`)
- **server.js** - Express server handling logo generation API
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

### Frontend Architecture Patterns
- **Multi-Level Scrolling Design**: Hero section (Level 0) → Form section (Level 1) → Results sections (Level 2+)
- **State Management**: Local React state with complex form data structure
- **Progressive Enhancement**: Form builds detailed prompts based on user inputs
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Analytics Integration**: Google Analytics 4 tracking for logo generation events

### Prompt Engineering System
- **Base Prompt Building**: Extracts business name, industry, description
- **Variation Generation**: Creates 5 distinct approaches (wordmark, symbol+text, typography, geometric, lettermark)
- **Reference Integration**: Incorporates selected brand logos and custom images
- **Refinement Logic**: Subsequent rounds refine based on user selections

## Development Guidelines

### Code Style
- **TypeScript**: Strict typing enabled for frontend components
- **ESLint**: Configured with React hooks and TypeScript rules
- **Component Structure**: Functional components with hooks
- **Tailwind CSS**: Utility-first styling with custom animations

### API Error Handling
- Always provide fallback placeholder images when Gemini API fails
- Log errors appropriately for debugging
- Handle quota exceeded (429) errors gracefully

### State Management Patterns
- Form data uses single state object with TypeScript interfaces
- Logo generation history tracked in generationHistory array
- Selection state managed separately from logo data

### Deployment Considerations
- **Railway Deployment**: Backend configured for Railway with domain detection
- **Static File Serving**: Generated logos served from `/images` endpoint
- **CORS**: Enabled for cross-origin requests
- **Environment Variables**: `GEMINI_API_KEY`, `RAILWAY_PUBLIC_DOMAIN`

## Common Development Tasks

### Adding New Logo Reference
Update the `logoReferences` array in `App.tsx` with new brand logos using the Simple Icons CDN pattern.

### Modifying Prompt Generation
Edit the `createPromptVariations()` and `refinePromptFromSelection()` functions in `App.tsx`. These control how user inputs are converted to AI prompts.

### Extending Form Fields
Update the `FormData` interface and corresponding form elements in the Level 1 section of `App.tsx`.

### Backend API Changes
Modify `server.js` for new endpoints or Gemini API integration changes. The server handles both single and multiple logo generation.