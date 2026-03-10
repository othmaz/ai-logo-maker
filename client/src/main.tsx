/**
 * ENTRYPOINT (ACTIVE)
 *
 * This file boots the production app via AppRouter.
 * See docs/CODEBASE-STATUS.md for active-vs-legacy map.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// import { SpeedInsights } from '@vercel/speed-insights/react'
// import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import AppRouter from './AppRouter'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Silence verbose client debug logs in production unless explicitly re-enabled.
if (import.meta.env.PROD) {
  const forceLogs = import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true'
  if (!forceLogs) {
    console.log = () => undefined
    console.info = () => undefined
    console.debug = () => undefined
  }
}
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

// Retro 80s theme for Clerk authentication
const clerkAppearance = {
  variables: {
    colorPrimary: '#6366f1',
    colorBackground: '#050508',
    colorInputBackground: 'rgba(5,5,8,0.72)',
    colorInputText: '#ffffff',
    colorText: '#e5e7eb',
    colorTextSecondary: '#9ca3af',
    colorTextOnPrimaryBackground: '#ffffff',
    colorDanger: '#f87171',
    colorSuccess: '#6ee7b7',
    colorWarning: '#fcd34d',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '1rem',
  },
  elements: {
    rootBox: { backgroundColor: 'transparent' },
    card: {
      backgroundColor: 'rgba(5,5,8,0.88)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      borderRadius: '20px',
    },
    headerTitle: { color: '#ffffff', fontWeight: '800', letterSpacing: '-0.02em' },
    headerSubtitle: { color: '#9ca3af' },
    formButtonPrimary: {
      backgroundColor: 'rgba(99,102,241,0.2)',
      border: '1px solid rgba(99,102,241,0.5)',
      color: '#a5b4fc',
      borderRadius: '12px',
      fontWeight: '700',
      letterSpacing: '0.05em',
      boxShadow: 'none',
    },
    formFieldInput: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(255,255,255,0.08)',
      color: '#ffffff',
      borderRadius: '12px',
    },
    formFieldLabel: { color: '#9ca3af', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' },
    footerActionLink: { color: '#a5b4fc' },
    footerActionText: { color: '#6b7280' },
    socialButtonsBlockButton: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#e5e7eb',
      borderRadius: '12px',
    },
    dividerLine: { backgroundColor: 'rgba(255,255,255,0.06)' },
    dividerText: { color: '#6b7280' },
    identityPreviewText: { color: '#9ca3af' },
    userButtonPopoverCard: {
      backgroundColor: 'rgba(5,5,8,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    },
    userButtonPopoverActionButton: { color: '#e5e7eb', borderRadius: '8px' },
    userButtonPopoverActionButtonText: { color: '#e5e7eb' },
    userButtonPopoverActionButtonIcon: { color: '#6366f1' },
    userButtonAvatarBox: { borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
    userButtonTrigger: { backgroundColor: 'transparent', border: 'none', padding: '0' },
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <BrowserRouter>
        <AppRouter />
        {/* Analytics disabled - enable in Vercel dashboard first, then uncomment */}
        {/* {import.meta.env.PROD && (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        )} */}
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
