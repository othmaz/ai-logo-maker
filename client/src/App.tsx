import { useState, useEffect } from 'react'

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

interface FormData {
  businessName: string
  industry: string
  description: string
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
  const { colors, hasBackground, aestheticDirections, uploadedImages } = formData
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
  
  // Create 5 completely different approaches - focus on clean, modern styles
  const variations = [
    // Variation 1: Modern Brand Wordmark
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Create a clean, modern wordmark like contemporary big brands. Use a sophisticated, custom typeface with perfect letter spacing. Simple, elegant typography. ${backgroundStyle}${colors ? `Consider ${colors} but prioritize readability and elegance.` : 'Use minimal colors - could be black on white or single accent color.'}`,
    
    // Variation 2: Minimal Symbol + Text
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Design a simple geometric symbol paired with clean typography. Minimal iconic element with the wordmark. ${backgroundStyle}${colors ? `Use ${colors} sparingly and strategically.` : 'Keep colors minimal and purposeful.'}`,
    
    // Variation 3: Pure Typography Focus
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Focus entirely on beautiful, modern typography. No symbols or icons - just perfectly crafted lettering. ${backgroundStyle}${colors ? `Incorporate ${colors} in the text treatment.` : 'Use sophisticated color choices.'}`,
    
    // Variation 4: Geometric Minimalism
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Use very simple geometric shapes - circles, squares, triangles. Clean, mathematical precision. ${backgroundStyle}${colors ? `Work ${colors} into the geometric elements.` : 'Use bold but minimal color palette.'}`,
    
    // Variation 5: Lettermark/Monogram
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Create a sophisticated lettermark or monogram using initials. Contemporary and refined. ${backgroundStyle}${colors ? `Use ${colors} in the lettermark design.` : 'Choose premium, professional colors.'}`
  ]
  
  return variations
}

const refinePromptFromSelection = (_selectedLogos: Logo[], formData: FormData, feedback?: string): string[] => {
  const basePrompt = buildBasePrompt(formData)
  const { colors, hasBackground, aestheticDirections, uploadedImages } = formData
  
  const logoInspiration = ''
  
  // User feedback integration
  const feedbackText = feedback && feedback.trim() 
    ? `Based on user feedback: ${feedback.trim()}. ` 
    : ''
  
  // Custom image references
  const customImageInspiration = uploadedImages.length > 0
    ? `Continue incorporating the style from the ${uploadedImages.length} custom reference image${uploadedImages.length > 1 ? 's' : ''} provided. ` 
    : ''
  
  // Background instruction - VERY IMPORTANT for refinement
  const backgroundStyle = hasBackground 
    ? 'Maintain subtle solid color or gentle gradient background. Keep background very minimal. ' 
    : 'CRITICAL: The background must be completely WHITE (#FFFFFF) with absolutely NO gradients, NO colors, NO patterns, NO textures - just pure solid white background. '
  
  // Aesthetic directions from user
  const aestheticStyle = aestheticDirections 
    ? `Following style notes: ${aestheticDirections}. `
    : ''
  
  // Create refinements that preserve the essence of selected logos
  const selectedLogosContext = _selectedLogos.length > 0 
    ? `IMPORTANT: Base these refinements closely on the ${_selectedLogos.length} selected logo${_selectedLogos.length > 1 ? 's' : ''}. Keep their core design approach, style elements, and visual characteristics. ` 
    : ''
  
  const refinementPrompts = [
    `${basePrompt} ${selectedLogosContext}${aestheticStyle}${customImageInspiration}${logoInspiration}${feedbackText}Refine the selected style with even more elegance and sophistication. Keep the same design approach but make it cleaner and more premium. ${backgroundStyle}${colors ? `Use ${colors} with restraint and class.` : 'Use refined, minimal colors.'}`,
    
    `${basePrompt} ${selectedLogosContext}${aestheticStyle}${customImageInspiration}${logoInspiration}${feedbackText}Maintain the selected design direction but simplify further - remove unnecessary elements while preserving the core style. ${backgroundStyle}${colors ? `Use ${colors} more minimally.` : 'Stick to 1-2 colors maximum.'}`,
    
    `${basePrompt} ${selectedLogosContext}${aestheticStyle}${customImageInspiration}${logoInspiration}${feedbackText}Keep the essence and structure of the selected logos but refine the typography to be more modern and polished. ${backgroundStyle}${colors ? `Incorporate ${colors} in the text treatment.` : 'Use contemporary color choices.'}`,
    
    `${basePrompt} ${selectedLogosContext}${aestheticStyle}${customImageInspiration}${logoInspiration}${feedbackText}Polish the selected style to be more premium and sophisticated while maintaining the same design philosophy and visual approach. ${backgroundStyle}${colors ? `Use ${colors} strategically for maximum impact.` : 'Choose luxury brand colors.'}`,
    
    `${basePrompt} ${selectedLogosContext}${aestheticStyle}${customImageInspiration}${logoInspiration}${feedbackText}Enhance the selected approach with subtle improvements - make it more distinctive while preserving the original style direction. ${backgroundStyle}${colors ? `Make ${colors} more memorable but still elegant.` : 'Add one subtle accent color.'}`
  ]
  
  return refinementPrompts
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    industry: '',
    description: '',
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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

  // Function to check usage limits
  const checkUsageLimit = async () => {
    try {
      const response = await fetch('/api/usage')
      const data = await response.json()
      setUsage(data)
      setIsPaid(data.remaining === 999) // 999 indicates unlimited (paid user)
    } catch (error) {
      console.error('Failed to check usage limits:', error)
    }
  }

  // Save logo to localStorage
  const saveLogo = (logo: Logo) => {
    const newSavedLogos = [...savedLogos, { ...logo, id: `saved-${Date.now()}-${Math.random()}` }]
    setSavedLogos(newSavedLogos)
    localStorage.setItem('savedLogos', JSON.stringify(newSavedLogos))
    alert('Logo saved to your collection!')
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
      setShowUpgradeModal(true)
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
    }
    
    console.log('📝 Built prompts:', prompts)
    
    try {
      console.log('📡 Sending request to backend for multiple logos...')
      
      const response = await fetch('/api/generate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts })
      })
      
      console.log('📨 Response status:', response.status)
      
      if (response.status === 429) {
        // Usage limit exceeded
        const errorData = await response.json()
        if (errorData.limitExceeded) {
          setUsage({ remaining: 0, total: errorData.total, used: errorData.total })
          setShowUpgradeModal(true)
          setLoading(false)
          return
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Response data:', data)
      
      // Update usage data if provided
      if (data.usage) {
        setUsage(data.usage)
      }
      
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
        console.log('🖼️ Logos set:', newLogos)
        
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
      } else if (data.error) {
        console.error('❌ Server error:', data.error)
        alert('Error generating logos: ' + data.error)
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      alert('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

  const proceedToRefinement = () => {
    if (selectedLogos.length > 2) {
      alert('Please select maximum 2 logos to refine (or provide feedback without selecting any)')
      return
    }
    
    if (!userFeedback.trim()) {
      alert('Please provide feedback about what you like or dislike in the current logos to help generate better ones')
      return
    }
    
    generateLogos(false)
  }



  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      const totalFiles = formData.uploadedImages.length + newFiles.length
      
      if (totalFiles > 3) {
        alert('Maximum 3 images allowed')
        return
      }
      
      // Validate file types and sizes
      const validFiles = newFiles.filter(file => {
        const isValidType = file.type.startsWith('image/')
        const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB limit
        
        if (!isValidType) {
          alert(`${file.name} is not a valid image file`)
          return false
        }
        if (!isValidSize) {
          alert(`${file.name} is too large. Maximum size is 5MB`)
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
    link.href = logo.url
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
        <div className="flex-1 flex items-center justify-center pt-60 pb-32">
          <div className="relative max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl lg:text-6xl hero-text mb-8 max-w-5xl mx-auto leading-tight font-extrabold">
              Sculpt your brand image with AI
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed font-semibold">
              2 minutes. No design skills needed.
            </p>
            <p className="text-lg lg:text-xl text-gray-400 mb-16 font-medium">
              Completely free to use.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 lg:gap-10 text-sm lg:text-base hero-features mb-20 -mt-3 lg:-mt-6">
              <div className="flex items-center group">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mr-3 group-hover:scale-110 transition-transform"></div>
                <span className="text-gray-300 group-hover:text-white transition-colors">Powered by Google Gemini AI</span>
              </div>
              <div className="flex items-center group">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mr-3 group-hover:scale-110 transition-transform"></div>
                <span className="text-gray-300 group-hover:text-white transition-colors">High-quality PNG downloads</span>
              </div>
              <div className="flex items-center group">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mr-3 group-hover:scale-110 transition-transform"></div>
                <span className="text-gray-300 group-hover:text-white transition-colors">100% Free to use</span>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Arrow positioned outside content container */}
        <div className="absolute bottom-36 left-0 right-0 flex justify-center z-50">
          <button 
            onClick={() => scrollToLevel('level-1')}
            className="lg:animate-bounce hover:animate-none transition-all duration-300 hover:scale-110 mobile-arrow"
          >
            <div className="w-14 h-14 border-2 border-white/60 rounded-full flex items-center justify-center hover:bg-white/10 hover:border-white transition-all duration-300 backdrop-blur-sm">
              <span className="text-2xl text-white">↓</span>
            </div>
          </button>
        </div>
        
        {/* Infinite scrolling logo band at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 py-6">
          <div className="relative overflow-hidden">
            <p className="text-center text-sm text-gray-400 mb-4 font-medium">Trusted by brands worldwide</p>
            <div className="flex animate-scroll whitespace-nowrap">
              {/* Generate many sets of logos for long scrolling */}
              {[...Array(20)].map((_, setIndex) => (
                <div key={setIndex} className="flex items-center space-x-16 mr-16">
                  {logoReferences.map((logo) => (
                    <div key={`${setIndex}-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                      <img 
                        src={logo.imageUrl} 
                        alt={logo.name}
                        className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjNGI1NTYzIi8+CjxyZWN0IHg9IjYiIHk9IjYiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgZmlsbD0iIzk0YTNiOCIvPgo8L3N2Zz4K';
                        }}
                      />
                      <span className="text-lg font-medium">{logo.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
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
                    className={`w-full p-6 rounded-2xl font-bold text-xl transition-all duration-300 transform ${
                      !formData.businessName || loading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                        Creating Your 5 Logos...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-3 text-2xl">🎨</span>
                        Generate 5 AI Logos
                      </div>
                    )}
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

      {/* Level 2: Current Logo Results */}
      {logos.length > 0 && (
        <div id={`level-${currentRound + 1}`} className="min-h-screen flex items-center justify-center py-20">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/20">
              
              {/* Round Header */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Round {currentRound} - Choose Your Favorites
                </h2>
                
                {/* Progress Dots */}
                <div className="flex justify-center space-x-3 mb-6">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-4 h-4 rounded-full ${
                        step <= currentRound 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-xl text-gray-600">
                  {currentRound === 1 && "Provide feedback to refine logos further (optionally select 1-2 favorites)"}
                  {currentRound === 2 && "Add feedback for final refinement (optionally select favorites)"}
                  {currentRound === 3 && "Final refined options - pick your perfect logo!"}
                </p>
              </div>

              {/* Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
                {logos.map((logo) => (
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
                    
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                      <img 
                        src={logo.url} 
                        alt={`Logo Option ${logo.number || '?'}`} 
                        className="w-full h-40 object-contain rounded-lg" 
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

              {/* Feedback Section for Refinement */}
              {currentRound > 0 && currentRound < 3 && (
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {currentRound < 3 && (
                  <button 
                    onClick={() => {
                      proceedToRefinement()
                      setTimeout(() => scrollToLevel(`level-${currentRound + 2}`), 500)
                    }}
                    disabled={!userFeedback.trim() || selectedLogos.length > 2}
                    className={`px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      !userFeedback.trim() || selectedLogos.length > 2
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-3 text-2xl">✨</span>
{selectedLogos.length > 0 ? `Refine Selected (${selectedLogos.length})` : 'Refine with Feedback'}
                    </div>
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    handleLogoGeneration(true)
                  }}
                  className="px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-3 text-2xl">🔄</span>
                    Generate New Set
                  </div>
                </button>
              </div>

              {/* Selection Info */}
              {(selectedLogos.length > 0 || userFeedback.trim()) && (
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
      )}

      {/* Historical Rounds - Previous generations */}
      {_generationHistory.slice(0, -1).map((round) => (
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
                  {round.round === 1 && "Select 1-2 logos you like and provide feedback to refine them further"}
                  {round.round === 2 && "Choose from refined options and add feedback for final refinement"}
                  {round.round === 3 && "Final refined options - pick your perfect logo!"}
                </p>
              </div>

              {/* Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
                {round.logos.map((logo) => (
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
                    
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                      <img 
                        src={logo.url} 
                        alt={`Logo Option ${logo.number || '?'}`} 
                        className="w-full h-40 object-contain rounded-lg" 
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {round.round < 3 && (
                  <button 
                    onClick={() => {
                      proceedToRefinement()
                      setTimeout(() => scrollToLevel(`level-${currentRound + 2}`), 500)
                    }}
                    disabled={!userFeedback.trim() || selectedLogos.length > 2}
                    className={`px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      !userFeedback.trim() || selectedLogos.length > 2
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-3 text-2xl">✨</span>
{selectedLogos.length > 0 ? `Refine Selected (${selectedLogos.length})` : 'Refine with Feedback'}
                    </div>
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    handleLogoGeneration(true)
                  }}
                  className="px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-3 text-2xl">🔄</span>
                    Generate New Set
                  </div>
                </button>
              </div>

              {/* Selection Info */}
              {(selectedLogos.length > 0 || userFeedback.trim()) && (
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
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                      <img 
                        src={logo.url} 
                        alt={`Saved Logo ${logo.id}`} 
                        className="w-full h-40 object-contain rounded-lg" 
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
    </div>
  )
}

export default App
