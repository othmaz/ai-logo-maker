import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import AppRouter from './AppRouter'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

// Retro 80s theme for Clerk authentication
const clerkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: '#00ffff', // Electric cyan
    colorBackground: '#1f2937', // Match website dark background
    colorInputBackground: '#374151', // Darker gray for inputs
    colorInputText: '#ffffff', // White text
    colorText: '#ffffff', // White text
    colorTextSecondary: '#00ffff', // Cyan secondary text
    colorTextOnPrimaryBackground: '#000000', // Black text on cyan
    colorDanger: '#ff10f0', // Electric pink for errors
    colorSuccess: '#39ff14', // Neon green for success
    colorWarning: '#ffff00', // Electric yellow for warnings
    borderRadius: '0px', // Sharp corners like retro buttons
    fontFamily: '"VT323", "Press Start 2P", monospace', // Retro monospace
    spacingUnit: '1rem',
  },
  elements: {
    rootBox: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)', // Semi-transparent dark
      backdropFilter: 'blur(10px)', // Glass effect
    },
    card: {
      backgroundColor: '#1f2937',
      border: '2px solid #00ffff',
      boxShadow: '4px 4px 0px #000000, 0 0 30px rgba(0, 255, 255, 0.4)',
      borderRadius: '0px', // Sharp retro corners
    },
    headerTitle: {
      color: '#00ffff',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '1.2rem',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
    },
    headerSubtitle: {
      color: '#e5e7eb',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    formButtonPrimary: {
      backgroundColor: '#00ffff',
      color: '#000000',
      border: '2px solid #00ffff',
      fontFamily: '"Press Start 2P", monospace',
      textTransform: 'uppercase',
      fontSize: '1rem',
      borderRadius: '0px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px #000000, 0 0 20px rgba(0, 255, 255, 0.3)',
      transition: 'all 0.1s ease',
      '&:hover': {
        backgroundColor: '#39ff14',
        borderColor: '#39ff14',
        color: '#000000',
        boxShadow: '2px 2px 0px #000000, 0 0 30px rgba(57, 255, 20, 0.5)',
        transform: 'translate(2px, 2px)',
      },
      '&:active': {
        transform: 'translate(4px, 4px)',
        boxShadow: '0px 0px 0px #000000, 0 0 15px rgba(0, 255, 255, 0.5)',
      },
    },
    formFieldInput: {
      backgroundColor: '#374151',
      borderColor: '#00ffff',
      color: '#ffffff',
      borderRadius: '0px',
      border: '2px solid #00ffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
      '&:focus': {
        borderColor: '#39ff14',
        boxShadow: '0 0 15px rgba(57, 255, 20, 0.4)',
        backgroundColor: '#374151',
      },
    },
    formFieldLabel: {
      color: '#00ffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    identityPreviewText: {
      color: '#00ffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.1rem',
    },
    identityPreviewEditButton: {
      color: '#00ffff',
    },
    footerActionText: {
      color: '#e5e7eb',
      fontFamily: '"VT323", monospace',
      fontSize: '1.1rem',
    },
    footerActionLink: {
      color: '#00ffff',
      fontSize: '1.1rem',
    },
    socialButtonsBlockButton: {
      border: '2px solid #8b5cf6',
      backgroundColor: '#1f2937',
      color: '#ffffff',
      borderRadius: '0px',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
      '&:hover': {
        borderColor: '#a855f7',
        backgroundColor: '#8b5cf6',
        boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
      },
    },
    dividerLine: {
      backgroundColor: '#00ffff',
      height: '2px',
    },
    dividerText: {
      color: '#00ffff',
      fontFamily: '"VT323", monospace',
      textTransform: 'uppercase',
    },
    userButtonPopoverCard: {
      backgroundColor: '#1f2937',
      border: '2px solid #22d3ee',
      boxShadow: '4px 4px 0px #000000, 0 0 20px rgba(34, 211, 238, 0.3)',
    },
    userButtonPopoverActionButton: {
      color: '#ffffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    userButtonPopoverActionButtonText: {
      color: '#ffffff',
      fontSize: '1.2rem',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#22d3ee',
    },
    userButtonPopoverFooter: {
      backgroundColor: '#1f2937',
      borderTop: '1px solid #22d3ee',
    },
    userButtonAvatarBox: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: '2px solid #22d3ee',
      boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)',
    },
    userButtonAvatarImage: {
      borderRadius: '50%',
    },
    userButtonTrigger: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '0',
      borderRadius: '50%',
      '&:hover': {
        backgroundColor: 'transparent',
      },
      '&:focus': {
        backgroundColor: 'transparent',
        boxShadow: '0 0 0 2px #22d3ee',
      },
    },
    // User Profile Management Pages
    userProfileModal: {
      backgroundColor: '#1f2937',
      border: '2px solid #22d3ee',
      boxShadow: '4px 4px 0px #000000, 0 0 30px rgba(34, 211, 238, 0.3)',
    },
    userProfileSection: {
      backgroundColor: '#1f2937',
    },
    userProfileSectionTitle: {
      color: '#22d3ee',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '1.3rem',
      textTransform: 'uppercase',
      letterSpacing: '2px',
    },
    userProfileSectionDescription: {
      color: '#e5e7eb',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    userProfileFieldLabel: {
      color: '#22d3ee',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
      textTransform: 'uppercase',
    },
    userProfileFieldInput: {
      backgroundColor: '#374151',
      borderColor: '#22d3ee',
      color: '#ffffff',
      borderRadius: '0px',
      border: '2px solid #22d3ee',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    userProfileButton: {
      backgroundColor: '#22d3ee',
      color: '#000000',
      border: '2px solid #22d3ee',
      fontFamily: '"Press Start 2P", monospace',
      textTransform: 'uppercase',
      fontSize: '1rem',
      borderRadius: '0px',
      '&:hover': {
        backgroundColor: '#39ff14',
        borderColor: '#39ff14',
      },
    },
    userProfileText: {
      color: '#ffffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    userProfileSecondaryText: {
      color: '#e5e7eb',
      fontFamily: '"VT323", monospace',
      fontSize: '1.1rem',
    },
    navbar: {
      backgroundColor: '#1f2937',
    },
    navbarTitle: {
      color: '#22d3ee',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '1.4rem',
      textTransform: 'uppercase',
    },
    navbarButton: {
      color: '#22d3ee',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    // Specific profile page elements that were still small
    profileSection: {
      backgroundColor: '#1f2937',
    },
    profileSectionTitle: {
      color: '#22d3ee',
      fontFamily: '"VT323", monospace',
      fontSize: '1.4rem',
      textTransform: 'uppercase',
    },
    profileSectionContent: {
      color: '#ffffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.3rem',
    },
    profileEmailAddress: {
      color: '#e5e7eb',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    profileConnectionTitle: {
      color: '#22d3ee',
      fontFamily: '"VT323", monospace',
      fontSize: '1.3rem',
    },
    profileConnectionText: {
      color: '#ffffff',
      fontFamily: '"VT323", monospace',
      fontSize: '1.2rem',
    },
    profileBadge: {
      color: '#39ff14',
      fontFamily: '"VT323", monospace',
      fontSize: '1.1rem',
    },
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
        <SpeedInsights />
        <Analytics />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
