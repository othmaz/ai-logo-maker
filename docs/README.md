# Craft Your Logo - AI Logo Maker

AI-powered logo generation platform with iterative refinement, premium downloads, and multi-format export.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Express API    │────▶│  External APIs  │
│  (Vite + TS)    │     │  (Node.js)      │     │  (Gemini, etc)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Clerk Auth     │     │  Vercel Postgres│
│  Stripe Payments│     │  Vercel Blob    │
└─────────────────┘     └─────────────────┘
```

## Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Clerk** (authentication)
- **Stripe React** (payments)

### Backend
- **Express.js** (API server)
- **Google Gemini 2.5 Flash** (AI image generation)
- **Replicate** (4K/8K upscaling)
- **Sharp** + **Potrace** (image processing, SVG conversion)
- **FreeConvert** (format conversion)

### Infrastructure
- **Vercel** (hosting + serverless functions)
- **Neon Postgres** (database via Vercel)
- **Vercel Blob** (file storage)
- **Resend** (transactional emails)

## Features

### Core Flow
1. **Anonymous Generation**: 15 free credits (5 logos per generation)
2. **Iterative Refinement**: Select favorites + feedback → refined generations
3. **Auth & Persistence**: Sign up to save logos to personal collection
4. **Premium Upgrade**: €9.99 for unlimited generations + high-res downloads
5. **Multi-format Export**: PNG (8K), SVG, favicon, profile pic, background removal

### Free Tier
- 15 credits (3 rounds of 5 logos each)
- Standard resolution (1024x1024)
- Save logos to collection (requires sign up)

### Premium Tier
- Unlimited generations
- 8K upscaling via Replicate
- Vector SVG export
- Transparent background removal
- Favicon package
- Commercial rights

## Local Development Setup

### Prerequisites
- Node.js v18+
- npm

### 1. Install Dependencies

```bash
# Root (for build scripts)
npm install

# Client
cd client && npm install

# Server
cd server && npm install
```

### 2. Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual keys from:
# - https://aistudio.google.com/app/apikey (Gemini)
# - https://dashboard.clerk.com (Auth)
# - https://dashboard.stripe.com/apikeys (Payments)
# - https://neon.tech or Vercel dashboard (Database)
# - https://replicate.com/account/api-tokens (Upscaling)
# - https://www.freeconvert.com/api (Format conversion)
# - https://resend.com/api-keys (Email)
```

### 3. Database Setup

```bash
cd server
node lib/initDB.js
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend
cd server
node server.js
# Runs on http://localhost:3001

# Terminal 2 - Frontend
cd client
npm run dev
# Runs on http://localhost:5173
```

### 5. Stripe Webhook (for local payment testing)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (auth, db, modal)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── .env               # Client env vars (VITE_*)
│   └── index.html         # Entry HTML
│
├── server/                # Express API
│   ├── server.js          # Main server bootstrap
│   ├── routes/            # Route modules
│   │   ├── generation.js
│   │   ├── users.js
│   │   ├── payments.js
│   │   ├── logos.js
│   │   └── analytics.js
│   ├── lib/               # Shared utilities
│   │   ├── db.js          # Database connection
│   │   ├── migrate.js     # Data migration
│   │   └── schema.sql     # DB schema
│   └── .env               # Server env vars
│
├── scripts/               # Build/deployment scripts
├── docs/                  # Documentation
└── .env.example           # All required env vars
```

## API Endpoints

### Generation
- `POST /api/generate-multiple` - Generate logos (requires credits or premium)
- `POST /api/upscale` - Upscale image to 4K/8K (premium only)

### Users
- `POST /api/users/sync` - Sync Clerk user to DB
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/subscription` - Update subscription status
- `POST /api/users/migrate` - Migrate anonymous data

### Logos
- `GET /api/logos/saved` - List saved logos
- `POST /api/logos/save` - Save a logo
- `DELETE /api/logos/:id` - Delete saved logo
- `POST /api/logos/:id/upscale` - Upscale specific logo
- `POST /api/logos/:id/vectorize` - Convert to SVG
- `POST /api/logos/:id/remove-background` - Remove background

### Payments
- `POST /api/create-payment-intent-with-user` - Create Stripe payment
- `GET /api/verify-payment/:id` - Verify payment status
- `POST /api/stripe/webhook` - Stripe webhook handler

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

The `vercel.json` configures:
- Static build for client
- Serverless function for API
- Rewrite rules for SPA routing

### Validation Before Deploy

```bash
npm run validate-deployment
```

## Business Model

| Feature | Free | Premium (€9.99) |
|---------|------|-----------------|
| Generations | 15 credits | Unlimited |
| Resolution | 1024x1024 | Up to 8K |
| Refinement | 3 rounds | Unlimited |
| Save Collection | ✅ | ✅ |
| PNG HD Download | ❌ | ✅ |
| PNG 8K Download | ❌ | ✅ |
| SVG Vector | ❌ | ✅ |
| Background Remove | ❌ | ✅ |
| Favicon Pack | ❌ | ✅ |
| Commercial Rights | ❌ | ✅ |

## License

MIT - See LICENSE file for details.
