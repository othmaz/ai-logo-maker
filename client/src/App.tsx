import { useState, useEffect } from 'react'
import './animations.css'

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
  const [isPaid, setIsPaid] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

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
    
    // Check usage limits on load
    checkUsageLimit()
  }, [])

  // Function to check usage limits (no limits with restored server)
  const checkUsageLimit = async () => {
    // Unlimited usage - no IP tracking
    setUsage({ remaining: 999, total: 999, used: 0 })
    setIsPaid(true)
  }

  // Save logo to localStorage
  const saveLogo = (logo: Logo) => {
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

  // Handle scroll-based header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past initial offset
        setIsHeaderVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsHeaderVisible(true)
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
    if (!isPaid && usage.remaining <= 0) {
      console.log('Usage limit reached - upgrade needed')
      return
    }
    
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
            round: currentRound
          })
        }
      } catch (error) {
        console.error('GA4 logos_generated tracking error:', error)
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

  const downloadLogo = (logo: Logo) => {
    const link = document.createElement('a')
    link.download = `${formData.businessName}-logo.png`

    // For data URLs, ensure we're downloading the full quality image
    if (logo.url.startsWith('data:')) {
      // Data URL - download directly with full quality
      link.href = logo.url
    } else {
      // HTTP URL - fetch and ensure quality
      link.href = logo.url
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
          round: currentRound
        })
      } else {
        console.log('⚠️ GA4 gtag not available for logo_downloaded')
      }
    } catch (error) {
      console.error('GA4 logo_downloaded tracking error:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      
      {/* Sticky Top Title Band */}
      <div className={`fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50 h-16 md:h-24 lg:h-32 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="relative overflow-hidden h-full">
          <div className="flex animate-scroll whitespace-nowrap h-full">
            {/* First set of titles */}
            <div className="flex items-center space-x-0 mr-0 h-full">
              {[...Array(50)].map((_, i) => (
                <h1 key={`first-${i}`} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate mobile-font tracking-tighter leading-none flex items-center h-full m-0 p-0 -mr-16 lg:-mr-48" style={{fontStretch: 'ultra-condensed', transform: 'scaleY(1.35) scaleX(0.8)'}}>
                  FREE AI LOGO MAKER
                </h1>
              ))}
            </div>
            {/* Second set for seamless loop */}
            <div className="flex items-center space-x-0 mr-0 h-full">
              {[...Array(50)].map((_, i) => (
                <h1 key={`second-${i}`} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate mobile-font tracking-tighter leading-none flex items-center h-full m-0 p-0 -mr-16 lg:-mr-48" style={{fontStretch: 'ultra-condensed', transform: 'scaleY(1.35) scaleX(0.8)'}}>
                  FREE AI LOGO MAKER
                </h1>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Level 0: Hero Section */}
      <div id="level-0" className="h-screen relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        
        {/* Main hero content - centered */}
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="relative max-w-6xl mx-auto px-4 text-center">
            <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 max-w-5xl mx-auto leading-tight text-white">
              CRAFT YOUR LOGO<br />
              <span className="text-glow text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">WITH AI POWER</span>
            </h1>
            <p className="retro-body text-base md:text-lg lg:text-xl text-cyan-400 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed">
              &gt; 2 MINUTES. NO DESIGN SKILLS NEEDED.
            </p>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-10 text-xs md:text-sm lg:text-base hero-features mb-12 md:mb-16">
              <div className="flex items-center group">
                <div className="w-6 h-6 mr-3 text-cyan-400 flex items-center justify-center pixel-icon text-xs group-hover:text-white transition-colors">🧠</div>
                <span className="retro-mono text-gray-300 group-hover:text-cyan-400 transition-colors">POWERED BY GOOGLE GEMINI AI</span>
              </div>
              <div className="flex items-center group">
                <div className="w-6 h-6 mr-3 text-green-400 flex items-center justify-center pixel-icon text-xs group-hover:text-white transition-colors">💾</div>
                <span className="retro-mono text-gray-300 group-hover:text-green-400 transition-colors">HIGH-QUALITY PNG DOWNLOADS</span>
              </div>
              <div className="flex items-center group">
                <div className="w-6 h-6 mr-3 text-purple-400 flex items-center justify-center pixel-icon text-xs group-hover:text-white transition-colors">🆓</div>
                <span className="retro-mono text-gray-300 group-hover:text-purple-400 transition-colors">100% FREE TO USE</span>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Retro CTA button positioned below content */}
        <div className="absolute bottom-16 md:bottom-20 left-0 right-0 flex justify-center z-50">
          <button
            onClick={() => scrollToLevel('level-1')}
            className="animate-bounce hover:animate-none retro-button relative overflow-hidden bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-red-400 to-orange-400 bg-[length:400%_100%] px-4 py-2 md:px-8 md:py-4 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-red-400 to-orange-400 bg-[length:400%_100%] animate-[gradient_2s_ease-in-out_infinite] opacity-0 hover:opacity-100 transition-opacity"></div>
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

                    {/* Action buttons */}
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          saveLogo(logo)
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
                        title="Save to collection"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadLogo(logo)
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
                        title="Download"
                      >
                        ⬇️
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
        <div className="min-h-screen flex items-center justify-center py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
                    
                    {/* Action buttons */}
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadLogo(logo)
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-sm"
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSavedLogo(logo.id)
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
                    if (confirm('Are you sure you want to clear your entire logo collection?')) {
                      setSavedLogos([])
                      localStorage.removeItem('savedLogos')
                    }
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
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
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
    </div>
  )
}

export default App
