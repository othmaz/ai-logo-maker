import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

// Retro 80s theme for Clerk authentication
const clerkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: '#00ffff', // Cyan
    colorBackground: '#1a1a1a', // Dark background
    colorInputBackground: '#2a2a2a', // Dark input background
    colorInputText: '#ffffff', // White text
    colorText: '#ffffff', // White text
    colorTextSecondary: '#00ffff', // Cyan secondary text
    colorDanger: '#ff10f0', // Electric pink for errors
    colorSuccess: '#39ff14', // Neon green for success
    colorWarning: '#ffff00', // Neon yellow for warnings
    borderRadius: '0.5rem', // Rounded corners
    fontFamily: '"Courier New", "Press Start 2P", monospace', // Retro font
  },
  elements: {
    rootBox: {
      backgroundColor: '#1a1a1a',
    },
    card: {
      backgroundColor: '#2a2a2a',
      border: '2px solid #00ffff',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
    },
    headerTitle: {
      color: '#00ffff',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '1.5rem',
      textTransform: 'uppercase',
    },
    headerSubtitle: {
      color: '#ffffff',
    },
    formButtonPrimary: {
      backgroundColor: '#00ffff',
      color: '#000000',
      border: '2px solid #00ffff',
      fontFamily: '"Press Start 2P", monospace',
      textTransform: 'uppercase',
      fontSize: '0.8rem',
      '&:hover': {
        backgroundColor: '#39ff14',
        borderColor: '#39ff14',
        boxShadow: '0 0 15px rgba(57, 255, 20, 0.5)',
      },
    },
    formFieldInput: {
      backgroundColor: '#2a2a2a',
      borderColor: '#00ffff',
      color: '#ffffff',
      '&:focus': {
        borderColor: '#39ff14',
        boxShadow: '0 0 10px rgba(57, 255, 20, 0.3)',
      },
    },
    identityPreviewText: {
      color: '#00ffff',
    },
    identityPreviewEditButton: {
      color: '#00ffff',
    },
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <App />
      <SpeedInsights />
      <Analytics />
    </ClerkProvider>
  </StrictMode>,
)
