# Free AI Logo Maker

A simple React application that generates logos using AI. This is a testing version designed to validate the concept and user experience.

## Features

- Single page application with form-based logo generation
- Collects business details for better logo generation
- Style and color preferences
- Direct logo download
- Easy regeneration of new logos

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd logo-maker-app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### Running the Application

The application requires both the React frontend and the Express backend to be running:

1. Start the backend server (in one terminal):
   ```bash
   npm run server
   ```
   This starts the API server on http://localhost:3001

2. Start the frontend development server (in another terminal):
   ```bash
   npm run dev
   ```
   This starts the React app on http://localhost:5173

3. Open your browser and navigate to http://localhost:5173

## How It Works

1. **Form Input**: User fills out business details including:
   - Business name (required)
   - Industry selection
   - Business description
   - Style preference (modern, minimalist, vintage, etc.)
   - Color preferences

2. **Logo Generation**: Click "Generate Logo" to create a logo based on the provided information

3. **Download**: Generated logos can be downloaded directly as PNG files

4. **Regeneration**: Users can generate multiple versions until they find one they like

## Project Structure

```
src/
  App.tsx          # Main React component with form and logo display
  index.css        # Tailwind CSS imports
  main.tsx         # React app entry point

server.js          # Express API server
.env.example       # Environment variables template
```

## API Integration

The application uses **Google Gemini 2.5 Flash Image Preview** for actual AI logo generation! This provides:

- **Real AI-generated logos** based on business details
- **High-quality text rendering** perfect for logo text
- **Professional design capabilities** with style control
- **Automatic SynthID watermarking** for generated content

The integration uses the latest `@google/genai` SDK with the `gemini-2.5-flash-image-preview` model for optimal logo generation.

## Development

- Built with React 19 + TypeScript
- Styled with Tailwind CSS
- Backend API with Express.js
- Vite for fast development and building

## Next Steps

This is a testing version to validate:
- User experience and interface
- Logo generation prompts effectiveness
- User engagement and feedback

Once validated, consider adding:
- Payment integration
- User accounts
- Logo history
- Advanced customization options
- Multiple file format exports
