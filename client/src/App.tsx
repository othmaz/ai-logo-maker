import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
} from '@stripe/react-stripe-js';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignIn,
  SignUp,
  UserButton,
  useUser
} from '@clerk/clerk-react'
import './animations.css'
import CheckoutForm from './CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface Modal {
  type: 'tos' | 'privacy' | 'contact' | 'upgrade' | 'confirm' | null
}

interface ConfirmationModal {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

interface FormData {
  businessName: string
  industry: string
  description: string
  logoType: 'wordmark' | 'pictorial'
  style: string
  colors: string
  aestheticDirections: string
  uploadedImages: File[]
  hasBackground: boolean
}

interface LogoReference {
  id: string
  name: string
  description: string
  category: string
  imageUrl: string
}

interface Logo {
  id: string
  url: string
  prompt: string
  selected?: boolean
  number?: number
}

interface GenerationRound {
  round: number
  logos: Logo[]
  selectedLogos: Logo[]
}

// Collection of famous logos as references
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logoReferences: LogoReference[] = [
  // Modern Wordmarks
  { id: 'google', name: 'Google', description: 'Clean, colorful wordmark', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/google.svg' },
  { id: 'netflix', name: 'Netflix', description: 'Bold red wordmark', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/netflix.svg' },
  { id: 'spotify', name: 'Spotify', description: 'Green wordmark with curves', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/spotify.svg' },
  { id: 'airbnb', name: 'Airbnb', description: 'Pink wordmark, friendly', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/airbnb.svg' },
  
  // Minimal Symbols
  { id: 'apple', name: 'Apple', description: 'Minimalist apple symbol', category: 'symbol', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/apple.svg' },
  { id: 'nike', name: 'Nike', description: 'Simple swoosh', category: 'symbol', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/nike.svg' },
  { id: 'twitter', name: 'Twitter/X', description: 'Single letter X', category: 'symbol', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/x.svg' },
  { id: 'instagram', name: 'Instagram', description: 'Camera icon, gradient', category: 'symbol', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/instagram.svg' },
  
  // Geometric/Modern
  { id: 'mastercard', name: 'Mastercard', description: 'Two circles, red/yellow', category: 'geometric', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/mastercard.svg' },
  { id: 'microsoft', name: 'Microsoft', description: 'Four colored squares', category: 'geometric', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/microsoft.svg' },
  { id: 'slack', name: 'Slack', description: 'Colorful hashtag shape', category: 'geometric', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/slack.svg' },
  
  // Lettermarks
  { id: 'ibm', name: 'IBM', description: 'Blue striped letters', category: 'lettermark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/ibm.svg' },
  { id: 'hp', name: 'HP', description: 'Simple blue letters', category: 'lettermark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/hp.svg' },
  { id: 'cnn', name: 'CNN', description: 'Bold red letters', category: 'lettermark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/cnn.svg' },
  
  // Tech/Startup Style
  { id: 'stripe', name: 'Stripe', description: 'Clean wordmark', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/stripe.svg' },
  { id: 'uber', name: 'Uber', description: 'Simple black wordmark', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/uber.svg' },
  { id: 'dropbox', name: 'Dropbox', description: 'Blue box symbol', category: 'symbol', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/dropbox.svg' },
  
  // Creative/Design
  { id: 'adobe', name: 'Adobe', description: 'Red A in circle', category: 'lettermark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/adobe.svg' },
  { id: 'figma', name: 'Figma', description: 'Colorful geometric shapes', category: 'geometric', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/figma.svg' },
  { id: 'behance', name: 'Behance', description: 'Blue wordmark', category: 'wordmark', imageUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/behance.svg' }
]

const buildBasePrompt = (formData: FormData): string => {
  const { businessName, industry, description } = formData
  
  // Very minimal base prompt - just the essentials
  let prompt = `Create a logo for "${businessName}".`
  
  if (industry && description) {
    prompt += ` ${description}.`
  } else if (description) {
    prompt += ` ${description}.`
  } else if (industry) {
    prompt += ` A ${industry} business.`
  }
  
  return prompt
}

const createPromptVariations = (basePrompt: string, formData: FormData): string[] => {
  const { colors, hasBackground, aestheticDirections, uploadedImages, logoType } = formData
  const logoInspiration = ''
  
  // Custom image references
  const customImageInspiration = uploadedImages.length > 0
    ? `The user has provided ${uploadedImages.length} custom reference image${uploadedImages.length > 1 ? 's' : ''} showing their preferred design style. ` 
    : ''
  
  // Background instruction
  const backgroundStyle = hasBackground 
    ? 'Include a subtle solid color or gentle gradient background. Keep the background very minimal and not distracting. ' 
    : 'IMPORTANT: Use completely WHITE background (#FFFFFF) with no gradients, no patterns, no textures. '
  
  // Aesthetic directions from user
  const aestheticStyle = aestheticDirections 
    ? `Additional style notes: ${aestheticDirections}. `
    : ''
  
  // Logo type instruction
  const logoTypeInstruction = logoType === 'wordmark' 
    ? 'FOCUS ON WORDMARK: Create text-based logos with beautiful typography, custom letterforms, and minimal or no symbols. The company name should be the primary design element. ' 
    : 'FOCUS ON PICTORIAL: Create icon-based or symbol-based logos with minimal text. Design a memorable symbol, icon, or pictorial mark that represents the business. Keep text secondary or minimal. '
  
  // Create 5 completely different approaches - focus on clean, modern styles
  const noTaglineInstruction = 'IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements. '

  const variations = [
    // Variation 1: Modern Brand Wordmark
    `${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}${logoInspiration}Create a clean, modern wordmark like contemporary big brands. Use a sophisticated, custom typeface with perfect letter spacing. Simple, elegant typography. ${backgroundStyle}${colors ? `Consider ${colors} but prioritize readability and elegance.` : 'Use minimal colors - could be black on white or single accent color.'} ${noTaglineInstruction}`,

    // Variation 2: Minimal Symbol + Text
    `${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}${logoInspiration}Design a simple geometric symbol paired with clean typography. Minimal iconic element with the wordmark. ${backgroundStyle}${colors ? `Use ${colors} sparingly and strategically.` : 'Keep colors minimal and purposeful.'} ${noTaglineInstruction}`,

    // Variation 3: Pure Typography Focus
    `${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}${logoInspiration}Focus entirely on beautiful, modern typography. No symbols or icons - just perfectly crafted lettering. ${backgroundStyle}${colors ? `Incorporate ${colors} in the text treatment.` : 'Use sophisticated color choices.'} ${noTaglineInstruction}`,

    // Variation 4: Geometric Minimalism
    `${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}${logoInspiration}Use very simple geometric shapes - circles, squares, triangles. Clean, mathematical precision. ${backgroundStyle}${colors ? `Work ${colors} into the geometric elements.` : 'Use bold but minimal color palette.'} ${noTaglineInstruction}`,

    // Variation 5: Lettermark/Monogram
    `${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}${logoInspiration}Create a sophisticated lettermark or monogram using initials. Contemporary and refined. ${backgroundStyle}${colors ? `Use ${colors} in the lettermark design.` : 'Choose premium, professional colors.'} ${noTaglineInstruction}`
  ]
  
  return variations
}

const refinePromptFromSelection = (_selectedLogos: Logo[], formData: FormData, feedback?: string): string[] => {
  const basePrompt = buildBasePrompt(formData)
  const { colors, hasBackground, aestheticDirections, logoType } = formData

  // User feedback integration
  const feedbackText = feedback && feedback.trim()
    ? `User refinement request: ${feedback.trim()}. `
    : ''

  // Logo type instruction for refinement
  const logoTypeInstruction = logoType === 'wordmark'
    ? 'MAINTAIN WORDMARK FOCUS: This must remain a text-based logo with typography as the primary element. '
    : 'MAINTAIN PICTORIAL FOCUS: This must remain an icon/symbol-based logo. '

  // Background instruction - CRITICAL
  const backgroundStyle = hasBackground
    ? 'Keep subtle background if present. '
    : 'CRITICAL: Background must be completely WHITE (#FFFFFF) with NO gradients, NO colors, NO patterns. '

  // Aesthetic directions
  const aestheticStyle = aestheticDirections
    ? `Style requirements: ${aestheticDirections}. `
    : ''

  // Color requirements
  const colorInstruction = colors
    ? `Color palette: ${colors}. `
    : 'Use appropriate professional colors. '

  // Reference image context
  const referenceContext = 'REFINEMENT MODE: A reference image has been provided showing the selected logo. Study this image carefully and use it as the exact design foundation. '

  // Create focused refinement prompts
  const refinementPrompts = [
    `${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}${colorInstruction}${aestheticStyle}${feedbackText}Keep the EXACT same layout, typography, composition, and design structure from the reference image while applying only the requested modifications.`,

    `${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}${colorInstruction}${aestheticStyle}${feedbackText}Preserve all core design elements from the reference image and apply the user's changes without altering the fundamental structure.`,

    `${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}${colorInstruction}${aestheticStyle}${feedbackText}Use the reference image as the base design and implement the requested changes while maintaining the same visual approach.`,

    `${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}${colorInstruction}${aestheticStyle}${feedbackText}Keep the design foundation from the reference image intact and apply the specific modifications requested by the user.`,

    `${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}${colorInstruction}${aestheticStyle}${feedbackText}Maintain the visual identity from the reference image while incorporating the user's refinement instructions.`
  ]

  return refinementPrompts
}

function App() {
  const { isSignedIn, user, isLoaded } = useUser()

  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    industry: '',
    description: '',
    logoType: 'wordmark',
    style: 'modern',
    colors: '',
    aestheticDirections: '',
    uploadedImages: [],
    hasBackground: false
  })
  const [logos, setLogos] = useState<Logo[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [_generationHistory, setGenerationHistory] = useState<GenerationRound[]>([])
  const [selectedLogos, setSelectedLogos] = useState<Logo[]>([])
  const [userFeedback, setUserFeedback] = useState<string>('')
  const [savedLogos, setSavedLogos] = useState<Logo[]>([])
  const [logoCounter, setLogoCounter] = useState(1) // Global logo counter
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [usage, setUsage] = useState({ remaining: 3, total: 3, used: 0 })
  const [debugUsageOverride, setDebugUsageOverride] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [activeModal, setActiveModal] = useState<Modal['type']>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChatButton, setShowChatButton] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Check if user has paid (based on Clerk user metadata or subscription)
  const isPaid = isSignedIn && user?.publicMetadata?.isPaid === true

  // Scroll to top function for title bar home button
  const scrollToHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Toast notification function
  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString()
    const newToast: Toast = { id, message, type }
    setToasts(prev => [...prev, newToast])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Upscale logo using Replicate (for post-payment use)
  const upscaleLogo = async (logoUrl: string, scale: number = 4): Promise<string> => {
    try {
      console.log('🔍 Starting logo upscaling for:', logoUrl)
      showToast('Upscaling your logo to higher resolution...', 'info')

      // Use relative URL for production, localhost for development
      const apiUrl = import.meta.env.DEV
        ? 'http://localhost:3001/api/upscale'
        : '/api/upscale'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: logoUrl,
          scale: scale
        })
      })

      console.log('📨 Upscale response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Upscaling completed:', data)

      showToast('Logo successfully upscaled to higher resolution!', 'success')
      return data.upscaledUrl

    } catch (error) {
      console.error('❌ Upscaling error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast('Failed to upscale logo: ' + errorMessage, 'error')
      throw error
    }
  }

  // Handle payment upgrade process
  const handlePaymentUpgrade = async () => {
    try {
      showToast('Redirecting to payment...', 'info')

      // Create PaymentIntent as soon as the page loads
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Payment error:', error)
      showToast('Payment failed. Please try again.', 'error')
    }
  }

  // Process logo for download after payment (includes upscaling)
  const processLogoForDownload = async (logo: Logo): Promise<string> => {
    try {
      console.log('💳 Processing logo for paid download:', logo.id)

      // Show processing notification
      showToast('Processing your premium logo...', 'info')

      // Upscale the logo to 8K resolution
      const upscaledUrl = await upscaleLogo(logo.url, 4)

      // Track the premium download event
      try {
        if (typeof window !== 'undefined' && window.gtag) {
          console.log('🔍 Sending GA4 event: premium_logo_download')
          window.gtag('event', 'premium_logo_download', {
            business_name: formData.businessName,
            logo_id: logo.id,
            original_url: logo.url,
            upscaled_url: upscaledUrl
          })
        }
      } catch (trackingError) {
        console.error('GA4 tracking error:', trackingError)
      }

      return upscaledUrl
    } catch (error) {
      console.error('❌ Error processing logo for download:', error)
      showToast('Error processing logo. Using original resolution.', 'warning')
      // Fallback to original logo if upscaling fails
      return logo.url
    }
  }

  // Load saved logos from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedLogos')
    if (saved) {
      try {
        setSavedLogos(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading saved logos:', error)
      }
    }
  }, [])

  // Check usage limits when authentication or user state changes
  useEffect(() => {
    checkUsageLimit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user, isPaid])

  // Handle payment success
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const paymentIntent = urlParams.get('payment_intent')
      const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret')

      if (paymentIntent && paymentIntentClientSecret && isSignedIn && user) {
        try {
          console.log('🎉 Payment success detected, updating user metadata...')

          // Update user metadata to mark as paid
          // WORKAROUND: Clerk's User.update expects unsafeMetadata for updates if publicMetadata isn't directly typed as writable.
          // We're nesting publicMetadata inside unsafeMetadata for the update call.
          await user.update({
            unsafeMetadata: {
              publicMetadata: {
                ...(user.publicMetadata as any), // Cast to any to allow spread of potentially untyped publicMetadata
                isPaid: true,
                paymentDate: new Date().toISOString(),
                paymentIntent: paymentIntent
              }
            }
          })

          console.log('✅ User marked as paid successfully')

          // Show payment success page
          setShowPaymentSuccess(true)

          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)

          // Refresh usage limits
          checkUsageLimit()

        } catch (error) {
          console.error('❌ Error updating user metadata:', error)
          showToast('Payment processed but there was an error updating your account. Please contact support.', 'error')
        }
      }
    }

    handlePaymentSuccess()
  }, [isSignedIn, user])

  // Setup debug utilities
  useEffect(() => {
    // DEBUG: Function to manually test usage limits (call from browser console)
    (window as any).debugUsageLimits = {
      setAnonymousUsage: (count: number) => {
        localStorage.setItem('anonymousGenerationsUsed', count.toString());
        console.log(`Set anonymous usage to ${count}, call debugUsageLimits.recheckUsage() to update state`);
      },
      setSignedInUsage: (count: number) => {
        console.log(`🔧 Setting signed-in user usage to ${count} (this simulates having generated ${count} logos)`);
        setDebugUsageOverride(count);
        // Force immediate usage calculation with the new value
        const remaining = Math.max(0, 3 - count);
        setUsage({ remaining, total: 3, used: count });
        console.log('🔧 DEBUG: Forced usage update - userGenerations =', count, ', remaining =', remaining);
      },
      recheckUsage: () => {
        checkUsageLimit();
      },
      resetUsage: () => {
        localStorage.removeItem('anonymousGenerationsUsed');
        setDebugUsageOverride(null);
        checkUsageLimit();
        console.log('Reset usage to 0');
      },
      showCurrentState: () => {
        const stored = localStorage.getItem('anonymousGenerationsUsed');
        console.log('Current localStorage:', stored);
        console.log('Current usage state:', usage);
        console.log('Current isPaid:', isPaid);
        console.log('Current isSignedIn:', isSignedIn);
      },
      testUpgradeModal: () => {
        console.log('Manually triggering upgrade modal...');
        setActiveModal('upgrade');
      },
      hideModal: () => {
        console.log('Hiding modal...');
        setActiveModal(null);
      },
      getDebugInfo: () => {
        console.log('🔍 CURRENT DEBUG STATE:');
        console.log(`   isSignedIn: ${isSignedIn}`);
        console.log(`   isPaid: ${isPaid}`);
        console.log(`   usage.used: ${usage.used}`);
        console.log(`   usage.total: ${usage.total}`);
        console.log(`   remaining: ${usage.remaining}`);
        console.log(`   anonymous localStorage: ${localStorage.getItem('anonymousGenerationsUsed') || '0'}`);
        return { isSignedIn, isPaid, usage, anonymousUsage: localStorage.getItem('anonymousGenerationsUsed') };
      }
    };
  }, [usage, isPaid, isSignedIn, debugUsageOverride]);

  // Function to check usage limits based on authentication and payment status
  const checkUsageLimit = async () => {
    console.log('=== checkUsageLimit() CALLED ===');
    console.log('📊 Current auth state - isSignedIn:', isSignedIn, ', isPaid:', isPaid);
    console.log('📊 Current usage state before update:', usage);

    if (!isSignedIn) {
      // Anonymous users get 3 free generations
      const usedGenerations = parseInt(localStorage.getItem('anonymousGenerationsUsed') || '0')
      const remaining = Math.max(0, 3 - usedGenerations)
      setUsage({ remaining, total: 3, used: usedGenerations })
      console.log('👤 Anonymous user usage: usedGenerations =', usedGenerations, ', remaining =', remaining);
    } else if (isPaid) {
      // Paid users have unlimited usage
      setUsage({ remaining: 999, total: 999, used: 0 })
      console.log('💎 Paid user - unlimited usage');
    } else {
      // Signed in but not paid users get 3 free generations
      console.log('🔧 DEBUG: debugUsageOverride state value:', debugUsageOverride);
      console.log('🔧 DEBUG: user?.publicMetadata?.generationsUsed:', user?.publicMetadata?.generationsUsed);
      const userGenerations = debugUsageOverride !== null ? debugUsageOverride : parseInt(user?.publicMetadata?.generationsUsed as string || '0')
      const remaining = Math.max(0, 3 - userGenerations)
      setUsage({ remaining, total: 3, used: userGenerations })
      console.log('👤 Signed-in free user usage: userGenerations =', userGenerations, ', remaining =', remaining);
      if (debugUsageOverride !== null) {
        console.log('🔧 DEBUG: Using override usage value:', debugUsageOverride);
      }
    }

    console.log('=== checkUsageLimit() COMPLETED ===');
  }

  // Check if a logo is already saved
  const isLogoSaved = (logoUrl: string) => {
    return savedLogos.some(savedLogo => savedLogo.url === logoUrl)
  }

  // Save logo to localStorage
  const saveLogo = (logo: Logo) => {
    // Check if logo is already saved
    if (isLogoSaved(logo.url)) {
      showToast('Logo is already in your collection!', 'info')
      return
    }

    const newSavedLogos = [...savedLogos, { ...logo, id: `saved-${Date.now()}-${Math.random()}` }]
    setSavedLogos(newSavedLogos)
    localStorage.setItem('savedLogos', JSON.stringify(newSavedLogos))
    showToast('Logo saved to your collection!', 'success')
  }

  // Remove logo from localStorage
  const removeSavedLogo = (logoId: string) => {
    const newSavedLogos = savedLogos.filter(logo => logo.id !== logoId)
    setSavedLogos(newSavedLogos)
    localStorage.setItem('savedLogos', JSON.stringify(newSavedLogos))
  }

  // Show confirmation modal
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {} })
      },
      onCancel: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {} })
      }
    })
  }

  // Handle scroll-based header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past initial offset
        setIsHeaderVisible(false)
        setShowChatButton(true)  // Show chat button when scrolling down
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsHeaderVisible(true)
        setShowChatButton(false)  // Hide chat button when scrolling up
      }

      setLastScrollY(currentScrollY)
    }

    // Throttle scroll events for better performance
    let ticking = false
    const throttledScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledScrollHandler, { passive: true })
    
    return () => window.removeEventListener('scroll', throttledScrollHandler)
  }, [lastScrollY])

  const generateLogos = async (isInitial: boolean = true) => {
    if (!formData.businessName) return

    // Check usage limits first (unless user is paid)
    console.log('=== USAGE LIMIT CHECK START ===');
    console.log('DEBUG: generateLogos - isSignedIn:', isSignedIn);
    console.log('DEBUG: generateLogos - isPaid:', isPaid);
    console.log('DEBUG: generateLogos - usage.remaining:', usage.remaining);
    console.log('DEBUG: generateLogos - usage.used:', usage.used);
    console.log('DEBUG: generateLogos - usage.total:', usage.total);

    // Check localStorage directly for anonymous users
    if (!isSignedIn) {
      const storedUsed = localStorage.getItem('anonymousGenerationsUsed');
      console.log('DEBUG: localStorage anonymousGenerationsUsed:', storedUsed);
    }

    if (!isPaid && usage.remaining <= 0) {
      console.log('🚨 CRITICAL: Usage limit reached - setting activeModal to upgrade');
      console.log('DEBUG: Current activeModal before setting:', activeModal);
      setActiveModal('upgrade');
      console.log('DEBUG: setActiveModal("upgrade") called');
      return
    }

    console.log('✅ Usage limit check passed - proceeding with generation');
    console.log('=== USAGE LIMIT CHECK END ===');
    
    setLoading(true)
    console.log('🎨 Starting logo generation...')
    
    // Track logo generation attempt with GA4
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        console.log('🔍 Sending GA4 event: logo_generation_started')
        window.gtag('event', 'logo_generation_started', {
          business_name: formData.businessName,
          industry: formData.industry || 'unspecified',
          style: formData.style,
          has_description: !!formData.description,
          has_colors: !!formData.colors,
          round: currentRound + 1
        })
      } else {
        console.log('⚠️ GA4 gtag not available')
      }
    } catch (error) {
      console.error('GA4 tracking error:', error)
    }
    
    // Generate prompts based on whether it's initial or refinement
    let prompts: string[]
    if (isInitial || currentRound === 0) {
      const basePrompt = buildBasePrompt(formData)
      prompts = createPromptVariations(basePrompt, formData)
    } else {
      prompts = refinePromptFromSelection(selectedLogos, formData, userFeedback)
      console.log('🔄 REFINEMENT MODE - Selected logos:', selectedLogos.length)
      console.log('💬 User feedback:', userFeedback || 'No feedback provided')
    }

    console.log('📝 Built prompts:', prompts.map((prompt, index) => `${index + 1}. ${prompt.substring(0, 150)}...`))
    
    try {
      console.log('🚀 Sending request to server for AI logo generation...')

      // Prepare reference images for refinement
      let referenceImages: Array<{data: string, mimeType: string}> = []
      if (!isInitial && currentRound > 0 && selectedLogos.length > 0) {
        console.log('📸 Preparing reference images for refinement...')

        // Convert selected logo URLs to compressed base64 image data
        const imagePromises = selectedLogos.map(async (logo) => {
          try {
            console.log(`🔄 Converting logo to compressed base64: ${logo.url}`)
            const imageResponse = await fetch(logo.url)
            const blob = await imageResponse.blob()

            return new Promise<{data: string, mimeType: string}>((resolve) => {
              const img = new Image()
              img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                // Keep original resolution for better quality (max 1024x1024)
                const maxSize = 1024
                let { width, height } = img

                // Only resize if larger than 1024x1024
                if (width > maxSize || height > maxSize) {
                  const ratio = Math.min(maxSize / width, maxSize / height)
                  width *= ratio
                  height *= ratio
                }

                canvas.width = width
                canvas.height = height

                // Draw with crisp edges (disable smoothing for logos)
                ctx!.imageSmoothingEnabled = false
                ctx!.drawImage(img, 0, 0, width, height)

                // Use PNG format with high quality (no compression loss)
                const compressedDataUrl = canvas.toDataURL('image/png')
                const base64Data = compressedDataUrl.split(',')[1]

                console.log(`✅ Compressed logo from ${blob.size} bytes to ~${base64Data.length * 0.75} bytes`)

                resolve({
                  data: base64Data,
                  mimeType: 'image/jpeg'
                })
              }

              const reader = new FileReader()
              reader.onload = () => {
                img.src = reader.result as string
              }
              reader.readAsDataURL(blob)
            })
          } catch (error) {
            console.warn(`⚠️ Failed to convert logo ${logo.url} to base64:`, error)
            return null
          }
        })

        const imageResults = await Promise.all(imagePromises)
        referenceImages = imageResults.filter(img => img !== null)
        console.log(`✅ Prepared ${referenceImages.length} reference images`)
        console.log('🖼️ Selected logos being sent as references:', selectedLogos.map(logo => ({
          id: logo.id,
          url: logo.url,
          prompt: logo.prompt.substring(0, 100) + '...'
        })))
        console.log('📦 Reference images payload sizes:', referenceImages.map(img => `${Math.round(img.data.length * 0.75 / 1024)}KB`))
      }

      // Use relative URL for production, localhost for development
      const apiUrl = import.meta.env.DEV
        ? 'http://localhost:3001/api/generate-multiple'
        : '/api/generate-multiple'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined
        })
      })
      
      console.log('📨 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Response data from Gemini API:', data)
      
      if (data.logos && data.logos.length > 0) {
        const newLogos: Logo[] = data.logos.map((logoUrl: string, index: number) => ({
          id: `logo-${currentRound}-${index}-${Date.now()}`,
          url: logoUrl,
          prompt: prompts[index],
          selected: false,
          number: logoCounter + index // Assign sequential number
        }))
        
        setLogos(newLogos)
        setSelectedLogos([])
        setUserFeedback('') // Clear feedback for next round
        setLogoCounter(prev => prev + data.logos.length) // Increment counter
        console.log('🖼️ AI-generated logos set:', newLogos)
      
      // Save to history
      const newRound: GenerationRound = {
        round: currentRound + 1,
        logos: newLogos,
        selectedLogos: []
      }
      setGenerationHistory(prev => [...prev, newRound])
      setCurrentRound(prev => prev + 1)
      
      // Track successful logo generation with GA4
      try {
        if (typeof window !== 'undefined' && window.gtag) {
          console.log('🔍 Sending GA4 event: logos_generated')
          window.gtag('event', 'logos_generated', {
            business_name: formData.businessName,
            industry: formData.industry || 'unspecified',
            style: formData.style,
            count: newLogos.length,
            round: currentRound,
            user_type: isSignedIn ? (isPaid ? 'paid' : 'free_user') : 'anonymous'
          })
        }
      } catch (error) {
        console.error('GA4 logos_generated tracking error:', error)
      }

      // Update usage tracking for non-paid users (count both initial generations and refinements)
      if (!isPaid) {
        console.log('=== UPDATING USAGE TRACKING ===');
        if (!isSignedIn) {
          // Update anonymous user usage in localStorage
          const currentUsed = parseInt(localStorage.getItem('anonymousGenerationsUsed') || '0')
          const newUsed = currentUsed + 1
          localStorage.setItem('anonymousGenerationsUsed', newUsed.toString())
          const newRemaining = Math.max(0, 3 - newUsed);
          setUsage(prev => ({ ...prev, used: newUsed, remaining: newRemaining }))
          console.log('🔢 Anonymous user - updated usage: currentUsed =', currentUsed, '→ newUsed =', newUsed, ', remaining =', newRemaining);

          // Check if this puts us over the limit for next time
          if (newRemaining <= 0) {
            console.log('⚠️  CRITICAL: This was the last free generation for anonymous user!');
          }
        } else {
          // Update Clerk user metadata to properly track generations used
          try {
            const currentGenerations = parseInt(user?.publicMetadata?.generationsUsed as string || '0');
            const newGenerations = currentGenerations + 1;

            console.log('🔄 Updating user metadata: currentGenerations =', currentGenerations, '→ newGenerations =', newGenerations);

            // Update Clerk user metadata
            // WORKAROUND: Clerk's User.update expects unsafeMetadata for updates if publicMetadata isn't directly typed as writable.
            // We're nesting publicMetadata inside unsafeMetadata for the update call.
            await user.update({
              unsafeMetadata: {
                publicMetadata: {
                  ...(user.publicMetadata as any), // Cast to any to allow spread of potentially untyped publicMetadata
                  generationsUsed: newGenerations
                }
              }
            });

            const newRemaining = Math.max(0, 3 - newGenerations);
            setUsage(prev => ({ ...prev, used: newGenerations, remaining: newRemaining }));
            console.log('✅ Signed-in user metadata updated: userGenerations =', newGenerations, ', remaining =', newRemaining);

            // Check if this puts us over the limit for next time
            if (newRemaining <= 0) {
              console.log('⚠️  CRITICAL: This was the last free generation for signed-in user!');
            }
          } catch (error) {
            console.error('❌ Failed to update user metadata:', error);
            showToast('Error tracking usage. Please refresh and try again.', 'error');
          }
        }
      }
      } else {
        console.error('❌ No logos received from Gemini API')
        showToast('No logos were generated. Please try again or check if the server is running.', 'error')
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      showToast('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    } finally {
      setLoading(false)
      console.log('🏁 Logo generation finished')
    }
  }

  const selectLogo = (logoId: string) => {
    setLogos(prevLogos => 
      prevLogos.map(logo => 
        logo.id === logoId 
          ? { ...logo, selected: !logo.selected }
          : logo
      )
    )
    
    const updatedSelectedLogos = logos.filter(logo => 
      logo.id === logoId ? !logo.selected : logo.selected
    )
    setSelectedLogos(updatedSelectedLogos)
  }

  const proceedToRefinement = async () => {
    if (selectedLogos.length > 2) {
      showToast('Please select maximum 2 logos to refine (or provide feedback without selecting any)', 'warning')
      return
    }

    if (!userFeedback.trim()) {
      showToast('Please provide feedback about what you like or dislike in the current logos to help generate better ones', 'info')
      return
    }

    await handleRefinement()
  }



  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      const totalFiles = formData.uploadedImages.length + newFiles.length
      
      if (totalFiles > 3) {
        showToast('Maximum 3 images allowed', 'warning')
        return
      }
      
      // Validate file types and sizes
      const validFiles = newFiles.filter(file => {
        const isValidType = file.type.startsWith('image/')
        const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB limit
        
        if (!isValidType) {
          showToast(`${file.name} is not a valid image file`, 'error')
          return false
        }
        if (!isValidSize) {
          showToast(`${file.name} is too large. Maximum size is 5MB`, 'error')
          return false
        }
        return true
      })
      
      setFormData(prev => ({
        ...prev,
        uploadedImages: [...prev.uploadedImages, ...validFiles]
      }))
    }
  }

  const removeUploadedImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uploadedImages: prev.uploadedImages.filter((_, i) => i !== index)
    }))
  }

  const downloadLogo = async (logo: Logo) => {
    const link = document.createElement('a')
    link.download = `${formData.businessName}-logo-premium.png`

    try {
      let downloadUrl = logo.url

      // If user has paid, process the logo with upscaling
      if (isPaid) {
        console.log('💳 User has paid - processing premium download')
        downloadUrl = await processLogoForDownload(logo)
        link.download = `${formData.businessName}-logo-8K.png`
      } else {
        console.log('🆓 Free download - using original resolution')
      }

      // For data URLs, ensure we're downloading the full quality image
      if (downloadUrl.startsWith('data:')) {
        // Data URL - download directly with full quality
        link.href = downloadUrl
      } else {
        // HTTP URL - fetch and ensure quality
        link.href = downloadUrl
      }

      link.click()

      // Track logo download - this is a conversion!
      try {
        if (typeof window !== 'undefined' && window.gtag) {
          console.log('🔍 Sending GA4 event: logo_downloaded')
          window.gtag('event', 'logo_downloaded', {
            business_name: formData.businessName,
            industry: formData.industry || 'unspecified',
            style: formData.style,
            round: currentRound,
            is_premium: isPaid,
            is_upscaled: isPaid
          })
        } else {
          console.log('⚠️ GA4 gtag not available for logo_downloaded')
        }
      } catch (error) {
        console.error('GA4 logo_downloaded tracking error:', error)
      }
    } catch (error) {
      console.error('❌ Error in downloadLogo:', error)
      showToast('Download failed. Please try again.', 'error')
    }
  }

  // Add scroll function for smooth transitions
  const scrollToLevel = (levelId: string) => {
    const element = document.getElementById(levelId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Auto-scroll when logos are generated
  const handleLogoGeneration = async (isInitial: boolean = true) => {
    const nextRound = currentRound + 1 // Calculate target round before state update

    // Reset counter if generating new set (not refinement)
    if (isInitial) {
      setLogoCounter(1)
    }

    await generateLogos(isInitial)
    // Scroll to results after generation - use the pre-calculated round
    setTimeout(() => {
      const targetLevel = `level-${nextRound + 1}` // +1 because level IDs start from 1
      scrollToLevel(targetLevel)
    }, 500)
  }

  // Handle refinement with auto-scroll
  const handleRefinement = async () => {
    const nextRound = currentRound + 1
    await generateLogos(false)
    // Scroll to the newest results
    setTimeout(() => {
      const targetLevel = `level-${nextRound + 1}`
      scrollToLevel(targetLevel)
    }, 500)
  }

  // Show payment success page if payment was successful
  if (showPaymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Scrolling Title Bar */}
        <button
          onClick={() => setShowPaymentSuccess(false)}
          className={`fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50 h-16 md:h-24 lg:h-32 transition-transform duration-300 cursor-pointer ${
            isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="relative overflow-hidden h-full">
            <div className="flex animate-scroll whitespace-nowrap h-full stable-font">
              {/* First set of titles */}
              <div className="flex items-start space-x-0 mr-0 h-full">
                {[...Array(50)].map((_, i) => (
                  <h1 key={`first-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                    FREE AI LOGO MAKER
                  </h1>
                ))}
              </div>
              {/* Second set for seamless loop */}
              <div className="flex items-start space-x-0 mr-0 h-full">
                {[...Array(50)].map((_, i) => (
                  <h1 key={`second-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                    FREE AI LOGO MAKER
                  </h1>
                ))}
              </div>
            </div>
          </div>
        </button>

        {/* Navigation Band */}
        <div className={`fixed left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 z-[60] h-12 md:h-14 transition-all duration-300 ${isHeaderVisible ? 'top-16 md:top-24 lg:top-32' : 'top-0'}`}>
          <div className="w-full h-full relative">
            {/* Desktop Navigation */}
            <div className="hidden xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-center">
              <div className="flex items-center h-full">
                {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item, index) => (
                  <div key={item} className="flex items-center h-full">
                    <button
                      onClick={() => {
                        if (item === 'Dashboard') setShowDashboard(true);
                        else if (item === 'Home') setShowPaymentSuccess(false);
                      }}
                      className="nav-shimmer flex items-center justify-center h-full px-4 md:px-6 text-base md:text-lg lg:text-xl retro-mono font-bold text-gray-300 hover:text-cyan-400 transition-colors duration-200 uppercase"
                    >
                      {item}
                    </button>
                    {index < 4 && (
                      <span className="mx-3 md:mx-4 text-gray-600 text-base md:text-lg font-bold">|</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile & Tablet Hamburger Menu */}
            <div className="xl:hidden absolute left-4 top-0 h-full flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex flex-col justify-center items-center w-8 h-8 space-y-1"
              >
                <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-300 transition duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </button>
            </div>

            {/* Authentication Buttons */}
            <div className="absolute right-4 top-0 h-full flex items-center gap-2">
              <div className="flex items-center gap-2">
                {!isSignedIn ? (
                  <>
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                      SIGN IN
                    </button>
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                      SIGN UP
                    </button>
                  </>
                ) : (
                  <div className="w-8 h-8 bg-gray-600/20 rounded-full border-2 border-gray-600/30 pointer-events-none"></div>
                )}
              </div>
              {isLoaded && (
                <div className="absolute inset-0 flex items-center gap-2">
                  <SignedOut>
                    <SignInButton mode="redirect">
                      <button className="px-2 md:px-4 py-1 md:py-2 bg-cyan-400 text-black font-bold rounded-lg hover:bg-green-400 transition-all duration-200 border-2 border-cyan-400 hover:border-green-400 hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] retro-mono text-xs">
                        SIGN IN
                      </button>
                    </SignInButton>
                    <SignUpButton mode="redirect">
                      <button className="px-2 md:px-4 py-1 md:py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-pink-500 transition-all duration-200 border-2 border-purple-500 hover:border-pink-500 hover:shadow-[0_0_15px_rgba(255,16,240,0.5)] retro-mono text-xs">
                        SIGN UP
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 mt-4 w-[60%] bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg z-[70] xl:hidden" style={{top: 'calc(4rem + 3.5rem + 1rem)'}}>
            <div className="flex flex-col">
              {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (item === 'Dashboard') setShowDashboard(true);
                    else if (item === 'Home') setShowPaymentSuccess(false);
                  }}
                  className="nav-shimmer flex items-center justify-center py-4 px-6 text-lg retro-mono font-bold text-gray-300 hover:text-cyan-400 hover:bg-gray-700/30 transition-colors duration-200 uppercase border-b border-gray-600/30 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[60] xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Payment Success Content */}
        <div className="min-h-screen pt-32 md:pt-40 lg:pt-48 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Success Header */}
            <div className="mb-8 pt-12">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl mb-6 text-white">
                PAYMENT SUCCESSFUL! <span style={{color: '#fde047', filter: 'none'}}>🎉</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 font-mono">
                Welcome to Premium! You now have unlimited logo generation.
              </p>
            </div>

            {/* Premium Benefits */}
            <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8 mb-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-cyan-400 mb-8 font-mono text-center">YOUR PREMIUM BENEFITS:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="text-4xl mb-3">🚀</div>
                  <span className="text-gray-300 font-mono text-sm">Unlimited Generation</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <span className="text-gray-300 font-mono text-sm">8K High Resolution</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <span className="text-gray-300 font-mono text-sm">Priority Support</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-4xl mb-3">💼</div>
                  <span className="text-gray-300 font-mono text-sm">Commercial Rights</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="relative px-8 py-4 rounded-2xl font-extrabold text-xl transition-all duration-300 transform overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center justify-center">
                  <span className="mr-3 text-2xl">🎨</span>
                  <span className="text-white font-extrabold">START CREATING LOGOS</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowPaymentSuccess(false)
                  setShowDashboard(true)
                }}
                className="relative px-8 py-4 rounded-2xl font-extrabold text-xl transition-all duration-300 transform overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600 border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center justify-center">
                  <span className="mr-3 text-2xl">📊</span>
                  <span className="text-white font-extrabold">VIEW DASHBOARD</span>
                </div>
              </button>
            </div>

            {/* Receipt Info */}
            <div className="mt-8 text-gray-400 font-mono text-sm">
              <p>Receipt sent to your email • €9.99 charged successfully</p>
              <p>Need help? Contact support anytime</p>
            </div>
          </div>
        </div>

        {/* Support Chat Button */}
        <button
          onClick={() => setActiveModal('contact')}
          className={`fixed right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-110 group ${
            showChatButton ? 'bottom-6 translate-y-0' : 'bottom-0 translate-y-20'
          }`}
          title="Contact Us"
        >
          <span className="text-sm md:text-2xl group-hover:scale-110 transition-transform">💬</span>
        </button>
      </div>
    )
  }

  // Show dashboard - accessible to all users but requires authentication
  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Scrolling Title Bar */}
        <button
          onClick={() => setShowDashboard(false)}
          className={`fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50 h-16 md:h-24 lg:h-32 transition-transform duration-300 cursor-pointer ${
            isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="relative overflow-hidden h-full">
            <div className="flex animate-scroll whitespace-nowrap h-full stable-font">
              {/* First set of titles */}
              <div className="flex items-start space-x-0 mr-0 h-full">
                {[...Array(50)].map((_, i) => (
                  <h1 key={`first-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                    FREE AI LOGO MAKER
                  </h1>
                ))}
              </div>
              {/* Second set for seamless loop */}
              <div className="flex items-start space-x-0 mr-0 h-full">
                {[...Array(50)].map((_, i) => (
                  <h1 key={`second-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                    FREE AI LOGO MAKER
                  </h1>
                ))}
              </div>
            </div>
          </div>
        </button>

        {/* Navigation Band */}
        <div className={`fixed left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 z-[60] h-12 md:h-14 transition-all duration-300 ${isHeaderVisible ? 'top-16 md:top-24 lg:top-32' : 'top-0'}`}>
          <div className="w-full h-full relative">
            {/* Desktop Navigation */}
            <div className="hidden xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-center">
              <div className="flex items-center h-full">
                {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item, index) => (
                  <div key={item} className="flex items-center h-full">
                    <button
                      onClick={() => {
                        if (item === 'Home') setShowDashboard(false);
                      }}
                      className={`nav-shimmer flex items-center justify-center h-full px-4 md:px-6 text-base md:text-lg lg:text-xl retro-mono font-bold transition-colors duration-200 uppercase ${
                        item === 'Dashboard' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'
                      }`}
                    >
                      {item}
                    </button>
                    {index < 4 && (
                      <span className="mx-3 md:mx-4 text-gray-600 text-base md:text-lg font-bold">|</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile & Tablet Hamburger Menu */}
            <div className="xl:hidden absolute left-4 top-0 h-full flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex flex-col justify-center items-center w-8 h-8 space-y-1"
              >
                <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-300 transition duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </button>
            </div>

            {/* Authentication Buttons */}
            <div className="absolute right-4 top-0 h-full flex items-center gap-2">
              {isPaid && (
                <span className="text-green-400 font-mono text-sm mr-2">✨ PREMIUM</span>
              )}
              <div className="flex items-center gap-2">
                {!isSignedIn ? (
                  <>
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                      SIGN IN
                    </button>
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                      SIGN UP
                    </button>
                  </>
                ) : (
                  <div className="w-8 h-8 bg-gray-600/20 rounded-full border-2 border-gray-600/30 pointer-events-none"></div>
                )}
              </div>
              {isLoaded && (
                <div className="absolute inset-0 flex items-center gap-2">
                  {isPaid && (
                    <span className="text-green-400 font-mono text-sm mr-2">✨ PREMIUM</span>
                  )}
                  <SignedOut>
                    <SignInButton mode="redirect">
                      <button className="px-2 md:px-4 py-1 md:py-2 bg-cyan-400 text-black font-bold rounded-lg hover:bg-green-400 transition-all duration-200 border-2 border-cyan-400 hover:border-green-400 hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] retro-mono text-xs">
                        SIGN IN
                      </button>
                    </SignInButton>
                    <SignUpButton mode="redirect">
                      <button className="px-2 md:px-4 py-1 md:py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-pink-500 transition-all duration-200 border-2 border-purple-500 hover:border-pink-500 hover:shadow-[0_0_15px_rgba(255,16,240,0.5)] retro-mono text-xs">
                        SIGN UP
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 mt-4 w-[60%] bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg z-[70] xl:hidden" style={{top: 'calc(4rem + 3.5rem + 1rem)'}}>
            <div className="flex flex-col">
              {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (item === 'Home') setShowDashboard(false);
                  }}
                  className={`nav-shimmer flex items-center justify-center py-4 px-6 text-lg retro-mono font-bold transition-colors duration-200 uppercase border-b border-gray-600/30 last:border-b-0 first:rounded-t-lg last:rounded-b-lg ${
                    item === 'Dashboard' ? 'text-cyan-400 bg-gray-700/30' : 'text-gray-300 hover:text-cyan-400 hover:bg-gray-700/30'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[60] xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Support Chat Button */}
        <button
          onClick={() => setActiveModal('contact')}
          className={`fixed right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-110 group ${
            showChatButton ? 'bottom-6 translate-y-0' : 'bottom-0 translate-y-20'
          }`}
          title="Contact Us"
        >
          <span className="text-sm md:text-2xl group-hover:scale-110 transition-transform">💬</span>
        </button>

        {/* Dashboard Content */}
        <div className="pt-32 md:pt-40 lg:pt-48 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            {!isSignedIn ? (
              /* Authentication Required Screen */
              <div className="text-center">
                <div className="mb-8">
                  <div className="mx-auto w-24 h-24 bg-cyan-500 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-mono">
                    SIGN IN REQUIRED
                  </h1>
                  <p className="text-xl text-gray-300 mb-8 font-mono">
                    Create an account or sign in to access your dashboard
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8 mb-8 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-cyan-400 mb-6 font-mono">DASHBOARD FEATURES:</h2>
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-300 font-mono">Usage Statistics</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-300 font-mono">Logo Collection</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-300 font-mono">Account Management</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-300 font-mono">Premium Benefits</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isLoaded && (
                    <>
                      <SignInButton mode="redirect">
                        <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 font-mono text-lg">
                          SIGN IN
                        </button>
                      </SignInButton>
                      <SignUpButton mode="redirect">
                        <button className="px-8 py-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all duration-200 font-mono text-lg border border-gray-600">
                          CREATE ACCOUNT
                        </button>
                      </SignUpButton>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Authenticated Dashboard Content */
              <>
            {/* Dashboard Header */}
            <div className="text-center mb-12 pt-12">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 text-white">
                YOUR DASHBOARD
              </h1>
              <p className="text-xl text-gray-300 font-mono">
                Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Account Status */}
              <div className="bg-gray-800/50 rounded-2xl border border-green-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-400 font-mono">PREMIUM ACTIVE</h3>
                </div>
                <p className="text-gray-300 font-mono">Unlimited logo generation</p>
                <p className="text-gray-400 font-mono text-sm mt-2">
                  Purchased: {user?.publicMetadata?.paymentDate ?
                    new Date(user.publicMetadata.paymentDate as string).toLocaleDateString() :
                    'Recently'
                  }
                </p>
              </div>

              {/* Generation Count */}
              <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-cyan-400 font-mono">LOGOS CREATED</h3>
                </div>
                <p className="text-3xl font-bold text-white font-mono">
                  {(user?.publicMetadata?.generationsUsed as number) || 0}
                </p>
                <p className="text-gray-400 font-mono text-sm">Since upgrade</p>
              </div>

              {/* Saved Logos */}
              <div className="bg-gray-800/50 rounded-2xl border border-purple-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-purple-400 font-mono">SAVED LOGOS</h3>
                </div>
                <p className="text-3xl font-bold text-white font-mono">{savedLogos.length}</p>
                <p className="text-gray-400 font-mono text-sm">In your collection</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Create New Logo */}
              <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8">
                <h3 className="text-2xl font-bold text-cyan-400 font-mono mb-4">CREATE NEW LOGO</h3>
                <p className="text-gray-300 font-mono mb-6">Generate unlimited rounds of professional logos with AI power</p>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 font-mono text-lg"
                >
                  START CREATING
                </button>
              </div>

              {/* View Saved Collection */}
              <div className="bg-gray-800/50 rounded-2xl border border-purple-400/30 p-8">
                <h3 className="text-2xl font-bold text-purple-400 font-mono mb-4">SAVED COLLECTION</h3>
                <p className="text-gray-300 font-mono mb-6">Access your saved logos and download in high quality</p>
                <button
                  onClick={() => {
                    setShowDashboard(false)
                    // Scroll to saved logos section
                    setTimeout(() => {
                      const element = document.querySelector('[data-saved-logos]')
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
                      }
                    }, 100)
                  }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-mono text-lg"
                >
                  VIEW COLLECTION ({savedLogos.length})
                </button>
              </div>
            </div>

            {/* Premium Benefits Reminder */}
            <div className="bg-gray-800/50 rounded-2xl border border-green-400/30 p-8 text-center">
              <h3 className="text-2xl font-bold text-green-400 font-mono mb-4">PREMIUM BENEFITS ACTIVE</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-gray-300">
                  <div className="text-2xl mb-2">🚀</div>
                  <p className="font-mono text-sm">Unlimited Generation</p>
                </div>
                <div className="text-gray-300">
                  <div className="text-2xl mb-2">✨</div>
                  <p className="font-mono text-sm">8K High Resolution</p>
                </div>
                <div className="text-gray-300">
                  <div className="text-2xl mb-2">⚡</div>
                  <p className="font-mono text-sm">Priority Support</p>
                </div>
                <div className="text-gray-300">
                  <div className="text-2xl mb-2">💼</div>
                  <p className="font-mono text-sm">Commercial Rights</p>
                </div>
              </div>
            </div>

            {/* Saved Logos Section */}
            {savedLogos.length > 0 && (
              <div className="mt-12 bg-gray-800/30 rounded-2xl border border-gray-600/30 p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white font-mono mb-4">YOUR SAVED COLLECTION</h3>
                  <p className="text-gray-300 font-mono">
                    {savedLogos.length} logo{savedLogos.length > 1 ? 's' : ''} saved to your collection
                  </p>
                </div>

                {/* Logo Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {savedLogos.map((logo) => (
                    <div
                      key={logo.id}
                      className="relative cursor-pointer transition-all duration-300 transform hover:scale-105 group"
                    >
                      <div className="bg-gray-700/50 rounded-xl border border-gray-600/50 hover:border-cyan-400/50 transition-colors duration-200 overflow-hidden">
                        <img
                          src={logo.url}
                          alt={`Saved Logo ${logo.id}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>

                      {/* Remove button */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            showConfirmation(
                              'Remove Logo',
                              'Are you sure you want to remove this logo from your collection? This action cannot be undone.',
                              () => removeSavedLogo(logo.id)
                            )
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-xs"
                          title="Remove from collection"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowDashboard(false)
                      // Scroll to saved logos section on main page
                      setTimeout(() => {
                        const element = document.querySelector('[data-saved-logos]')
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' })
                        }
                      }, 100)
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-mono mr-4"
                  >
                    VIEW FULL GALLERY
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear your entire logo collection?')) {
                        setSavedLogos([])
                        localStorage.removeItem('savedLogos')
                      }
                    }}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors font-mono"
                  >
                    CLEAR ALL
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">


      {/* Sticky Top Title Band - clickable home button */}
      <button
        onClick={scrollToHome}
        className={`fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50 h-16 md:h-24 lg:h-32 transition-transform duration-300 cursor-pointer ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="relative overflow-hidden h-full">
          <div className="flex animate-scroll whitespace-nowrap h-full stable-font">
            {/* First set of titles */}
            <div className="flex items-start space-x-0 mr-0 h-full">
              {[...Array(50)].map((_, i) => (
                <h1 key={`first-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                  FREE AI LOGO MAKER
                </h1>
              ))}
            </div>
            {/* Second set for seamless loop */}
            <div className="flex items-start space-x-0 mr-0 h-full">
              {[...Array(50)].map((_, i) => (
                <h1 key={`second-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{marginRight: '-27.5px', lineHeight: '4rem'}}>
                  FREE AI LOGO MAKER
                </h1>
              ))}
            </div>
          </div>
        </div>
      </button>

      {/* Navigation Band - always visible below title band */}
      <div className={`fixed left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 z-[60] h-12 md:h-14 transition-all duration-300 ${
        isHeaderVisible ? 'top-16 md:top-24 lg:top-32' : 'top-0'
      }`}>
        <div className="w-full h-full relative">
          {/* Desktop Navigation - hidden on mobile and tablets */}
          <div className="hidden xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-center">
            <div className="flex items-center h-full">
              {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item, index) => (
                <div key={item} className="flex items-center h-full">
                  <button
                    onClick={() => item === 'Dashboard' ? setShowDashboard(true) : undefined}
                    className="nav-shimmer flex items-center justify-center h-full px-4 md:px-6 text-base md:text-lg lg:text-xl retro-mono font-bold text-gray-300 hover:text-cyan-400 transition-colors duration-200 uppercase"
                  >
                    {item}
                  </button>
                  {index < 4 && (
                    <span className="mx-3 md:mx-4 text-gray-600 text-base md:text-lg font-bold">|</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile & Tablet Hamburger Menu */}
          <div className="xl:hidden absolute left-4 top-0 h-full flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex flex-col justify-center items-center w-8 h-8 space-y-1"
            >
              <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-gray-300 transition duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          </div>

          {/* Authentication Buttons - responsive sizing */}
          <div className="absolute right-4 top-0 h-full flex items-center gap-2">
            {/* Static placeholder buttons (always visible) */}
            <div className="flex items-center gap-2">
              {!isSignedIn ? (
                /* Show sign in/up placeholders for signed out state */
                <>
                  <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                    SIGN IN
                  </button>
                  <button className="px-2 md:px-4 py-1 md:py-2 bg-gray-600/20 text-gray-500 font-bold rounded-lg border-2 border-gray-600/30 retro-mono text-xs pointer-events-none">
                    SIGN UP
                  </button>
                </>
              ) : (
                /* Show user button placeholder for signed in state */
                <div className="w-8 h-8 bg-gray-600/20 rounded-full border-2 border-gray-600/30 pointer-events-none"></div>
              )}
            </div>

            {/* Real Clerk buttons (appear on top when loaded) */}
            {isLoaded && (
              <div className="absolute inset-0 flex items-center gap-2">
                <SignedOut>
                  <SignInButton mode="redirect">
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-cyan-400 text-black font-bold rounded-lg hover:bg-green-400 transition-all duration-200 border-2 border-cyan-400 hover:border-green-400 hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] retro-mono text-xs">
                      SIGN IN
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button className="px-2 md:px-4 py-1 md:py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-pink-500 transition-all duration-200 border-2 border-purple-500 hover:border-pink-500 hover:shadow-[0_0_15px_rgba(255,16,240,0.5)] retro-mono text-xs">
                      SIGN UP
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            )}
          </div>
        </div>

        {/* Mobile & Tablet Menu - positioned relative to nav bar */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 mt-4 w-[60%] bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg z-[70] xl:hidden">
            <div className="flex flex-col">
              {['Home', 'Dashboard', 'Pricing', 'API', 'About'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (item === 'Dashboard') setShowDashboard(true);
                  }}
                  className="nav-shimmer flex items-center justify-center py-4 px-6 text-lg retro-mono font-bold text-gray-300 hover:text-cyan-400 hover:bg-gray-700/30 transition-colors duration-200 uppercase border-b border-gray-600/30 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[60] xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
      </div>

      {/* Level 0: Hero Section */}
      <div id="level-0" className="h-screen relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        
        {/* Main hero content - centered */}
        <div className="flex-1 flex items-center justify-center py-12 md:py-8">
          <div className="relative max-w-6xl mx-auto px-4 text-center mt-8 md:mt-12">
            <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 max-w-5xl mx-auto leading-tight text-white">
              CRAFT YOUR LOGO<br />
              <span className="text-glow animated-text-gradient">WITH AI POWER</span>
            </h1>
            <p className="retro-body text-base md:text-lg lg:text-xl text-cyan-400 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed">
              &gt; 2 MINUTES. NO DESIGN SKILLS NEEDED.
            </p>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-10 text-xs md:text-sm lg:text-base hero-features mb-12 md:mb-16">
              <div className="flex items-center group">
                <div className="w-15 h-15 mr-3 text-cyan-400 flex items-center justify-center pixel-icon text-2xl group-hover:text-white transition-colors">🍌</div>
                <span className="retro-mono text-gray-300 group-hover:text-cyan-400 transition-colors">POWERED BY GOOGLE GEMINI AI</span>
              </div>
              <div className="flex items-center group">
                <div className="w-15 h-15 mr-3 text-green-400 flex items-center justify-center pixel-icon text-2xl group-hover:text-white transition-colors">🎨</div>
                <span className="retro-mono text-gray-300 group-hover:text-green-400 transition-colors">8K PNG & SVG FILES</span>
              </div>
              <div className="flex items-center group">
                <div className="w-15 h-15 mr-3 text-purple-400 flex items-center justify-center pixel-icon text-2xl group-hover:text-white transition-colors">🆓</div>
                <span className="retro-mono text-gray-300 group-hover:text-purple-400 transition-colors">100% FREE TO USE</span>
              </div>
            </div>

          </div>
        </div>

        {/* Retro CTA button positioned dynamically at 15% from bottom */}
        <div className="absolute bottom-[15%] left-0 right-0 flex justify-center z-40">
          <button
            onClick={() => scrollToLevel('level-1')}
            className="group animate-bounce hover:animate-none retro-button relative overflow-hidden bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-red-400 to-orange-400 bg-[length:400%_100%] px-4 py-2 md:px-8 md:py-4 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-red-400 to-orange-400 bg-[length:400%_100%] animate-[gradient_2s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative z-10 retro-title text-xs md:text-sm">
              START ↓
            </span>
          </button>
        </div>
      </div>

      {/* Level 1: Form Section */}
      <div id="level-1" className="min-h-screen flex items-center justify-center py-20">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="bg-gray-800/90 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-gray-700/50">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-white mb-4">Step 1: Tell Us About Your Business</h2>
              <p className="text-xl text-gray-300">The more details you provide, the better your logos will be</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Business Name *</label>
                  <input 
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Enter your business name"
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white placeholder-gray-400 text-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Industry</label>
                  <select 
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white text-lg"
                  >
                    <option value="">Select your industry</option>
                    <option value="restaurant">🍽️ Restaurant & Food</option>
                    <option value="tech">💻 Technology</option>
                    <option value="retail">🛍️ Retail & E-commerce</option>
                    <option value="consulting">📊 Consulting & Services</option>
                    <option value="healthcare">🏥 Healthcare & Medical</option>
                    <option value="creative">🎨 Creative & Design</option>
                    <option value="fitness">💪 Fitness & Wellness</option>
                    <option value="education">📚 Education & Training</option>
                    <option value="finance">💰 Finance & Banking</option>
                    <option value="other">🔧 Other</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Business Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell us what your business does (helps create better logos)"
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl h-32 focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white placeholder-gray-400 resize-none text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Logo Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, logoType: 'wordmark'})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                        formData.logoType === 'wordmark'
                          ? 'border-white bg-gray-600 text-white'
                          : 'border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-2">🔤</div>
                      <div className="font-medium">Wordmark</div>
                      <div className="text-sm opacity-75">Text-based logo</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, logoType: 'pictorial'})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                        formData.logoType === 'pictorial'
                          ? 'border-white bg-gray-600 text-white'
                          : 'border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-2">🎨</div>
                      <div className="font-medium">Pictorial</div>
                      <div className="text-sm opacity-75">Icon/Symbol logo</div>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Logo Style</label>
                  <select 
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white text-lg"
                  >
                    <option value="modern">✨ Modern & Clean</option>
                    <option value="minimalist">🎯 Minimalist & Simple</option>
                    <option value="vintage">🏛️ Vintage & Classic</option>
                    <option value="playful">🎪 Playful & Fun</option>
                    <option value="professional">💼 Professional & Corporate</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Color Preferences</label>
                  <input 
                    value={formData.colors}
                    onChange={(e) => setFormData({...formData, colors: e.target.value})}
                    placeholder="e.g., blue and white, green, purple"
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white placeholder-gray-400 text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Aesthetic Directions</label>
                  <textarea 
                    value={formData.aestheticDirections}
                    onChange={(e) => setFormData({...formData, aestheticDirections: e.target.value})}
                    placeholder="e.g., futuristic, organic curves, bold and edgy, elegant serif"
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl h-32 focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white placeholder-gray-400 resize-none text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-200">Background Style</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, hasBackground: false})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                        !formData.hasBackground
                          ? 'border-white bg-gray-600 text-white'
                          : 'border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-2">⚪</div>
                      <div className="font-medium">No Background</div>
                      <div className="text-sm opacity-75">Transparent/White</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, hasBackground: true})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                        formData.hasBackground
                          ? 'border-white bg-gray-600 text-white'
                          : 'border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-2">🎨</div>
                      <div className="font-medium">With Background</div>
                      <div className="text-sm opacity-75">Colors/Patterns</div>
                    </button>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleLogoGeneration(true)}
                    disabled={!formData.businessName || loading}
                    className={`relative w-full p-6 rounded-2xl font-extrabold text-2xl transition-all duration-300 transform overflow-hidden ${
                      !formData.businessName || loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-red-400 to-orange-400 bg-[length:400%_100%] animate-[gradient_2s_ease-in-out_infinite]"></div>
                    )}
                    <div className="relative z-10">
                      {loading ? (
                        <div className="flex items-center justify-center text-white">
                          <div className="mr-4">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:-0.32s]"></div>
                              <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:-0.16s]"></div>
                              <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite]"></div>
                            </div>
                          </div>
                          <span className="text-white font-extrabold">Creating Your 5 Logos...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-white">
                          <span className="mr-3 text-3xl">🎨</span>
                          <span className="text-white font-extrabold">Generate 5 AI Logos</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Image Upload Section */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20 mt-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">📸 Step 2: Upload Reference Images (Optional)</h3>
                <p className="text-lg text-gray-600">Upload up to 3 images of logos or designs that inspire you (max 5MB each)</p>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-center gap-4">
                  <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 border-dashed rounded-lg p-6 transition-colors duration-200">
                    <div className="text-center">
                      <div className="text-3xl mb-3">📁</div>
                      <div className="text-lg font-medium text-blue-700 mb-1">Choose Images</div>
                      <div className="text-sm text-blue-500">PNG, JPG, WEBP</div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <div className="text-lg text-gray-600 font-medium">
                    {formData.uploadedImages.length}/3 images uploaded
                  </div>
                </div>
              </div>
              
              {/* Display uploaded images */}
              {formData.uploadedImages.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  {formData.uploadedImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeUploadedImage(index)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-red-600 transition-colors shadow-lg"
                      >
                        ×
                      </button>
                      <div className="text-sm text-center mt-2 text-gray-600 font-medium truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.uploadedImages.length > 0 && (
                <div className="text-center text-sm text-purple-600 mt-6 font-medium">
                  These images will influence your logo generation style
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Rounds - Previous generations (render in order) */}
      {_generationHistory.map((round) => (
        <div key={round.round} id={`level-${round.round + 1}`} className="min-h-screen flex items-center justify-center py-20">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/20">

              {/* Round Header */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Round {round.round} - Choose Your Favorites
                </h2>

                {/* Progress Dots */}
                <div className="flex justify-center space-x-3 mb-6">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-4 h-4 rounded-full ${
                        step <= round.round
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xl text-gray-600">
                  {round.round === 1 && "Provide feedback to refine logos further (optionally select 1-2 favorites)"}
                  {round.round === 2 && "Add feedback for final refinement (optionally select favorites)"}
                  {round.round === 3 && "Final refined options - pick your perfect logo!"}
                </p>
              </div>

              {/* Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
                {(round.round === currentRound ? logos : round.logos).map((logo) => (
                  <div
                    key={logo.id}
                    onClick={() => selectLogo(logo.id)}
                    className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 group ${
                      logo.selected
                        ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    {/* Logo Number */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center shadow-lg z-10">
                      <span className="text-white text-sm font-bold">{logo.number || '?'}</span>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200 overflow-hidden">
                      <img
                        src={logo.url}
                        alt={`Logo Option ${logo.number || '?'}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>

                    {/* Selection indicator */}
                    {logo.selected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg z-10">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}

                    {/* Save button - heart icon on top right */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          saveLogo(logo)
                        }}
                        className={`rounded-full w-10 h-10 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 ${
                          isLogoSaved(logo.url)
                            ? 'bg-red-100/80 hover:bg-red-200/80 text-red-600'
                            : 'bg-white/80 hover:bg-white text-gray-700 hover:text-red-500'
                        }`}
                        title={isLogoSaved(logo.url) ? "Already saved" : "Save to collection"}
                      >
                        {isLogoSaved(logo.url) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Section for Refinement - Only show for current round */}
              {round.round === currentRound && currentRound > 0 && currentRound < 3 && (
                <div className="mb-8 bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    Provide Feedback for Refinement
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tell us what you like or dislike about these logos. Optionally select 1-2 specific ones to focus on:
                  </p>
                  <textarea
                    value={userFeedback}
                    onChange={(e) => setUserFeedback(e.target.value)}
                    placeholder="Example: I like the modern look but the text is too thin. The colors are great but maybe try a different font style..."
                    className="w-full h-24 p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {userFeedback.trim() && selectedLogos.length <= 2 && (
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                      <span className="mr-2">✓</span>
                      {selectedLogos.length > 0
                        ? `Ready to refine ${selectedLogos.length} selected logo${selectedLogos.length > 1 ? 's' : ''} with your feedback`
                        : 'Ready to refine with your general feedback'
                      }
                    </p>
                  )}
                  {selectedLogos.length > 2 && (
                    <p className="text-sm text-orange-600 mt-2 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Please select maximum 2 logos for refinement
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons - Only show for current round */}
              {round.round === currentRound && (
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  {currentRound < 3 && (
                    <button
                      onClick={proceedToRefinement}
                      disabled={!userFeedback.trim() || selectedLogos.length > 2 || loading}
                      className={`relative px-12 py-6 rounded-2xl font-extrabold text-2xl transition-all duration-300 transform shadow-lg hover:shadow-xl overflow-hidden ${
                        !userFeedback.trim() || selectedLogos.length > 2 || loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:scale-105'
                      }`}
                    >
                      {loading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 via-cyan-400 via-green-400 to-yellow-400 bg-[length:400%_100%] animate-[gradient_2s_ease-in-out_infinite]"></div>
                      )}
                      <div className="relative z-10 flex items-center justify-center">
                        {loading ? (
                          <>
                            <div className="mr-4">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:-0.32s]"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:-0.16s]"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-[bounce_1.4s_ease-in-out_infinite]"></div>
                              </div>
                            </div>
                            <span className="text-white font-extrabold">Refining Logos...</span>
                          </>
                        ) : (
                          <>
                            <span className="mr-3 text-3xl">✨</span>
                            <span className="text-white font-extrabold">{selectedLogos.length > 0 ? `Refine Selected (${selectedLogos.length})` : 'Refine with Feedback'}</span>
                          </>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Selection Info - Only show for current round */}
              {round.round === currentRound && (selectedLogos.length > 0 || userFeedback.trim()) && (
                <div className="text-center mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                  <p className="text-blue-800 font-medium text-lg">
                    {selectedLogos.length > 0
                      ? `${selectedLogos.length} logo${selectedLogos.length > 1 ? 's' : ''} selected for refinement`
                      : 'General feedback provided for refinement'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Saved Logos Gallery */}
      {savedLogos.length > 0 && (
        <div data-saved-logos className="min-h-screen flex items-center justify-center py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="bg-white/90 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/20">
              
              {/* Gallery Header */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Your Saved Logo Collection
                </h2>
                <p className="text-xl text-gray-600">
                  {savedLogos.length} logo{savedLogos.length > 1 ? 's' : ''} saved to your collection
                </p>
              </div>

              {/* Saved Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {savedLogos.map((logo) => (
                  <div
                    key={logo.id}
                    className="relative cursor-pointer transition-all duration-300 transform hover:scale-105 group"
                  >
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200 overflow-hidden">
                      <img 
                        src={logo.url} 
                        alt={`Saved Logo ${logo.id}`} 
                        className="w-full h-40 object-cover rounded-lg" 
                      />
                    </div>
                    
                    {/* Remove button only */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          showConfirmation(
                            'Remove Logo',
                            'Are you sure you want to remove this logo from your collection? This action cannot be undone.',
                            () => removeSavedLogo(logo.id)
                          )
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-sm"
                        title="Remove from collection"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gallery Actions */}
              <div className="text-center">
                <button
                  onClick={() => {
                    showConfirmation(
                      'Clear All Logos',
                      'This will permanently delete ALL your saved logos from your collection. This action cannot be undone. Are you absolutely sure you want to continue?',
                      () => {
                        setSavedLogos([])
                        localStorage.removeItem('savedLogos')
                      }
                    )
                  }}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Clear All Saved Logos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-16 text-center">
        <p className="text-gray-500 text-lg">
          Powered by Google Gemini AI • Created with ❤️ for entrepreneurs
        </p>
        <div className="mt-6 space-x-6">
          <button
            onClick={() => setActiveModal('tos')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveModal('privacy')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Floating Contact Us Button */}
      <button
        onClick={() => setActiveModal('contact')}
        className={`fixed right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-110 group ${
          showChatButton ? 'bottom-6 translate-y-0' : 'bottom-0 translate-y-20'
        }`}
        title="Contact Us"
      >
        <span className="text-sm md:text-2xl group-hover:scale-110 transition-transform">💬</span>
      </button>

      {/* Toast Notifications */}
      <div className={`fixed right-4 z-[70] space-y-2 transition-all duration-300 ${
        isHeaderVisible
          ? 'top-20 md:top-28 lg:top-36'
          : 'top-20'
      }`}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-black' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-current opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {activeModal === 'tos' && 'Terms of Service'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'contact' && 'Contact Us'}
                {activeModal === 'upgrade' && 'Upgrade to Premium'}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {activeModal === 'tos' && (
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">1. Service Description</h3>
                    <p>AI Logo Maker provides artificial intelligence-powered logo generation services. Users can create up to 3 logos for free, after which a €10 payment is required for unlimited access.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">2. Payment Terms</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>First 3 logo generations are completely free</li>
                      <li>Additional access requires a one-time payment of €10</li>
                      <li>Payment provides unlimited logo generation for your account</li>
                      <li>All payments are processed securely through Stripe</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">3. Refund Policy</h3>
                    <p>Due to the digital nature of our service and immediate delivery of AI-generated content, we offer refunds within 24 hours of purchase only in cases of technical failure preventing service delivery. All refund requests must be submitted to our support team with detailed explanation.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">4. User Account Registration</h3>
                    <p>Account registration is only required at checkout when making a payment. We follow a "register-at-checkout" model to minimize friction for users. Account information is used solely for service delivery and support.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">5. Intellectual Property</h3>
                    <p>Users retain full ownership and commercial rights to all logos generated through our service. We do not claim ownership of generated content. However, users are responsible for ensuring their chosen business names and concepts do not infringe on existing trademarks.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">6. Service Availability</h3>
                    <p>We strive to maintain 99% uptime but cannot guarantee uninterrupted service due to the dependency on third-party AI services. Planned maintenance will be announced in advance when possible.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">7. Limitation of Liability</h3>
                    <p>Our liability is limited to the amount paid for the service (€10 maximum). We are not responsible for business losses, trademark disputes, or other consequential damages arising from logo usage.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">8. Contact Information</h3>
                    <p>For questions regarding these terms, please contact us through the Contact Us button or email support at the address provided in our contact form.</p>
                  </div>

                  <p className="text-sm text-gray-500 mt-8">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Information We Collect</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Business Information:</strong> Business name, industry, description, and design preferences you provide</li>
                      <li><strong>Generated Content:</strong> Logos and images created during your session</li>
                      <li><strong>Usage Data:</strong> Number of generations used, selected preferences, and session activity</li>
                      <li><strong>Payment Information:</strong> Processed securely by Stripe (we don't store payment details)</li>
                      <li><strong>Account Data:</strong> Email address and basic account information (only when you register at checkout)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">How We Use Your Information</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Generate personalized logos based on your business requirements</li>
                      <li>Track your usage against the 3-generation free limit</li>
                      <li>Process payments and manage your account</li>
                      <li>Provide customer support and respond to inquiries</li>
                      <li>Improve our AI algorithms and service quality</li>
                      <li>Send service-related communications (not marketing emails)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Data Storage and Security</h3>
                    <p>Your data is stored securely and used only for service delivery. We use industry-standard encryption and security practices. Generated logos are stored temporarily to enable downloads and refinements during your session.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Third-Party Services</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Google Gemini AI:</strong> Powers our logo generation (subject to Google's privacy policy)</li>
                      <li><strong>Stripe:</strong> Processes payments securely (subject to Stripe's privacy policy)</li>
                      <li><strong>Google Analytics:</strong> Tracks usage patterns for service improvement</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Your Rights</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Access your personal data and generated content</li>
                      <li>Request correction of inaccurate information</li>
                      <li>Request deletion of your account and associated data</li>
                      <li>Withdraw consent for data processing (may limit service functionality)</li>
                      <li>Export your generated logos and account data</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Data Retention</h3>
                    <p>Account data is retained until you request deletion. Generated logos are stored temporarily for session continuity and permanently if you save them to your collection. Anonymous usage analytics may be retained for service improvement.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Contact for Privacy Matters</h3>
                    <p>For privacy-related questions, data requests, or concerns, please contact us through the Contact Us button or email our privacy team at the address provided in our contact form.</p>
                  </div>

                  <p className="text-sm text-gray-500 mt-8">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-gray-600">We'd love to hear from you! Get in touch with our team.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h4 className="font-semibold text-gray-800 mb-2">📧 Email Support</h4>
                        <p className="text-gray-600">support@ailogomaker.com</p>
                        <p className="text-sm text-gray-500 mt-2">Response within 24 hours</p>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h4 className="font-semibold text-gray-800 mb-2">💬 Live Chat</h4>
                        <p className="text-gray-600">Available during business hours</p>
                        <p className="text-sm text-gray-500 mt-2">Monday - Friday, 9 AM - 6 PM CET</p>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h4 className="font-semibold text-gray-800 mb-2">❓ FAQ & Help</h4>
                        <p className="text-gray-600">Check our comprehensive help center</p>
                        <p className="text-sm text-gray-500 mt-2">Self-service solutions available 24/7</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800">Send us a message</h4>
                      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); showToast('Message sent! We\'ll get back to you soon.', 'success'); setActiveModal(null); }}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>General Inquiry</option>
                            <option>Technical Support</option>
                            <option>Billing Question</option>
                            <option>Feature Request</option>
                            <option>Bug Report</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                          <textarea
                            required
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="How can we help you?"
                          ></textarea>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                        >
                          Send Message
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'upgrade' && (
                <div className="space-y-6 text-center">
                  {clientSecret ? (
                    <Elements options={{ clientSecret }} stripe={stripePromise}>
                      <CheckoutForm />
                    </Elements>
                  ) : (
                  <>
                    <div className="mb-8">
                      <div className="text-6xl mb-4">🚀</div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">
                        You've reached your free limit!
                      </h3>
                      <p className="text-gray-600 text-lg">
                        {!isSignedIn
                          ? "You've used all 3 free logo generations. Sign up to get unlimited access!"
                          : "Upgrade to Premium for unlimited logo generation and 8K upscaling!"}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl">
                      <h4 className="text-xl font-semibold text-gray-800 mb-4">Premium Benefits</h4>
                      <ul className="text-left space-y-3 mb-6">
                        <li className="flex items-center">
                          <span className="text-green-500 mr-3">✓</span>
                          <span>Unlimited logo generation</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-green-500 mr-3">✓</span>
                          <span>8K upscaling for premium quality</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-green-500 mr-3">✓</span>
                          <span>Priority customer support</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-green-500 mr-3">✓</span>
                          <span>Commercial usage rights</span>
                        </li>
                      </ul>

                      <div className="text-3xl font-bold text-gray-800 mb-6">
                        Only €10 <span className="text-lg font-normal text-gray-600">one-time payment</span>
                      </div>

                      <div className="space-y-4">
                        {!isSignedIn ? (
                          <div className="space-y-3">
                            <SignUpButton mode="redirect">
                              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200">
                                Sign Up & Get Premium
                              </button>
                            </SignUpButton>
                            <p className="text-sm text-gray-500">
                              Already have an account?
                              <SignInButton mode="redirect">
                                <button className="text-blue-600 hover:text-blue-700 ml-1 underline">
                                  Sign In
                                </button>
                              </SignInButton>
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={handlePaymentUpgrade}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                          >
                            Upgrade to Premium - €9.99
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border-2 border-cyan-400">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2 font-mono uppercase">
                  {confirmModal.title}
                </h3>
                <p className="text-gray-300 font-mono text-sm leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={confirmModal.onCancel}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-mono text-sm font-bold transition-colors border border-gray-600"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono text-sm font-bold transition-colors border border-red-500 shadow-lg"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
