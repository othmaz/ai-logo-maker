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
  preferredLogos: string[]
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
  const { colors, preferredLogos, hasBackground, aestheticDirections, uploadedImages } = formData
  
  // Get reference logo names for subtle inspiration (reduced influence)
  const selectedLogos = logoReferences.filter(logo => preferredLogos.includes(logo.id))
  const logoInspiration = selectedLogos.length > 0 
    ? `Consider the general aesthetic of: ${selectedLogos.map(logo => logo.name).join(', ')}. ` 
    : ''
  
  // Custom image references
  const customImageInspiration = uploadedImages.length > 0
    ? `The user has provided ${uploadedImages.length} custom reference image${uploadedImages.length > 1 ? 's' : ''} showing their preferred design style. ` 
    : ''
  
  // Background instruction
  const backgroundStyle = hasBackground 
    ? 'Include a subtle solid color or gentle gradient background. Keep the background very minimal and not distracting. ' 
    : 'Keep background transparent, white, or minimal. '
  
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

const refinePromptFromSelection = (_selectedLogos: Logo[], formData: FormData): string[] => {
  const basePrompt = buildBasePrompt(formData)
  const { colors, preferredLogos, hasBackground, aestheticDirections, uploadedImages } = formData
  
  // Get reference logo names for subtle inspiration (reduced influence)
  const selectedLogos = logoReferences.filter(logo => preferredLogos.includes(logo.id))
  const logoInspiration = selectedLogos.length > 0 
    ? `Keep the general aesthetic feel of: ${selectedLogos.map(logo => logo.name).join(', ')}. ` 
    : ''
  
  // Custom image references
  const customImageInspiration = uploadedImages.length > 0
    ? `Continue incorporating the style from the ${uploadedImages.length} custom reference image${uploadedImages.length > 1 ? 's' : ''} provided. ` 
    : ''
  
  // Background instruction
  const backgroundStyle = hasBackground 
    ? 'Maintain subtle solid color or gentle gradient background. Keep background very minimal. ' 
    : 'Keep background clean and minimal. '
  
  // Aesthetic directions from user
  const aestheticStyle = aestheticDirections 
    ? `Following style notes: ${aestheticDirections}. `
    : ''
  
  // Create clean, modern refinements that maintain simplicity
  const refinementPrompts = [
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Refine the selected style with even more elegance and sophistication. Make it cleaner and more premium. ${backgroundStyle}${colors ? `Use ${colors} with restraint and class.` : 'Use refined, minimal colors.'}`,
    
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Simplify the selected direction further - remove any unnecessary elements. Focus on pure, clean design. ${backgroundStyle}${colors ? `Use ${colors} more minimally.` : 'Stick to 1-2 colors maximum.'}`,
    
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Keep the essence of what was selected but make the typography more modern and refined. ${backgroundStyle}${colors ? `Incorporate ${colors} in the text treatment.` : 'Use contemporary color choices.'}`,
    
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Polish the selected style to be more premium and sophisticated. ${backgroundStyle}${colors ? `Use ${colors} strategically for maximum impact.` : 'Choose luxury brand colors.'}`,
    
    `${basePrompt} ${aestheticStyle}${customImageInspiration}${logoInspiration}Take the selected approach but make it slightly more distinctive while staying clean and modern. ${backgroundStyle}${colors ? `Make ${colors} more memorable but still elegant.` : 'Add one subtle accent color.'}`
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
    preferredLogos: [],
    uploadedImages: [],
    hasBackground: false
  })
  const [logos, setLogos] = useState<Logo[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [_generationHistory, setGenerationHistory] = useState<GenerationRound[]>([])
  const [selectedLogos, setSelectedLogos] = useState<Logo[]>([])
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

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
      prompts = refinePromptFromSelection(selectedLogos, formData)
    }
    
    console.log('📝 Built prompts:', prompts)
    
    try {
      console.log('📡 Sending request to Railway backend for multiple logos...')
      
      const response = await fetch('https://ai-logo-maker-production.up.railway.app/api/generate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts })
      })
      
      console.log('📨 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Response data:', data)
      
      if (data.logos && data.logos.length > 0) {
        const newLogos: Logo[] = data.logos.map((logoUrl: string, index: number) => ({
          id: `logo-${currentRound}-${index}-${Date.now()}`,
          url: logoUrl,
          prompt: prompts[index],
          selected: false
        }))
        
        setLogos(newLogos)
        setSelectedLogos([])
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
    if (selectedLogos.length === 0) {
      alert('Please select at least one logo to refine')
      return
    }
    
    generateLogos(false)
  }


  const toggleLogoReference = (logoId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredLogos: prev.preferredLogos.includes(logoId)
        ? prev.preferredLogos.filter(id => id !== logoId)
        : [...prev.preferredLogos, logoId].slice(0, 5) // Max 5 selections
    }))
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
    await generateLogos(isInitial)
    // Scroll to results after generation
    setTimeout(() => {
      const targetLevel = `level-${currentRound + 1}`
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
              {[...Array(25)].map((_, i) => (
                <h1 key={`first-${i}`} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate mobile-font tracking-tighter leading-none flex items-center h-full m-0 p-0" style={{fontStretch: 'ultra-condensed'}}>
                  TEST2
                </h1>
              ))}
            </div>
            {/* Second set for seamless loop */}
            <div className="flex items-center space-x-0 mr-0 h-full">
              {[...Array(25)].map((_, i) => (
                <h1 key={`second-${i}`} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate mobile-font tracking-tighter leading-none flex items-center h-full m-0 p-0" style={{fontStretch: 'ultra-condensed'}}>
                  TEST2
                </h1>
              ))}
            </div>
            {/* Third set for extra seamlessness */}
            <div className="flex items-center space-x-0 mr-0 h-full">
              {[...Array(25)].map((_, i) => (
                <h1 key={`third-${i}`} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate mobile-font tracking-tighter leading-none flex items-center h-full m-0 p-0" style={{fontStretch: 'ultra-condensed'}}>
                  TEST2
                </h1>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Level 0: Hero Section */}
      <div id="level-0" className="min-h-screen relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-black/60"></div>
        
        {/* Main hero content - positioned higher */}
        <div className="flex-1 flex items-center justify-center pt-48 pb-16 lg:pb-16">
          <div className="relative max-w-6xl mx-auto px-4 text-center">
            <p className="text-3xl lg:text-4xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              Sculpt your brand image with AI in 2 minutes. No design skills needed, completely free to use.
            </p>
            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 text-lg lg:text-xl text-gray-400 mb-16">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-full mr-3"></div>
                Powered by Google Gemini AI
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-full mr-3"></div>
                High-quality PNG downloads
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-full mr-3"></div>
                100% Free to use
              </div>
            </div>
            <button 
              onClick={() => scrollToLevel('level-1')}
              className="animate-bounce hover:animate-none transition-all duration-300 transform hover:scale-110 mobile-arrow"
            >
              <div className="w-16 h-16 border-3 border-white rounded-full mx-auto flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300">
                <span className="text-3xl text-white hover:text-black">↓</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Infinite scrolling logo band at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 py-6">
          <div className="relative overflow-hidden">
            <p className="text-center text-sm text-gray-400 mb-4 font-medium">Trusted by brands worldwide</p>
            <div className="flex animate-scroll whitespace-nowrap">
              {/* First set of logos */}
              <div className="flex items-center space-x-16 mr-16">
                {logoReferences.map((logo) => (
                  <div key={`first-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex items-center space-x-16 mr-16">
                {logoReferences.map((logo) => (
                  <div key={`second-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
              {/* Third set for extra seamlessness */}
              <div className="flex items-center space-x-16 mr-16">
                {logoReferences.map((logo) => (
                  <div key={`third-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
              {/* Fourth set for maximum seamlessness */}
              <div className="flex items-center space-x-16 mr-16">
                {logoReferences.map((logo) => (
                  <div key={`fourth-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
              {/* Fifth set for ultra seamlessness */}
              <div className="flex items-center space-x-16 mr-16">
                {logoReferences.map((logo) => (
                  <div key={`fifth-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
              {/* Sixth set for perfect seamlessness */}
              <div className="flex items-center space-x-16">
                {logoReferences.map((logo) => (
                  <div key={`sixth-${logo.id}`} className="flex items-center space-x-3 text-gray-300">
                    <img 
                      src={logo.imageUrl} 
                      alt={logo.name}
                      className="w-8 h-8 object-contain filter brightness-0 invert opacity-70"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="text-lg font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
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
                    className="w-full p-5 border-0 bg-gray-700 rounded-2xl h-24 focus:ring-2 focus:ring-white focus:bg-gray-600 transition-all duration-200 text-white placeholder-gray-400 resize-none text-lg"
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
            
            {/* Logo Reference Selection Section */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20 mt-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">🎯 Step 2: Choose Logo References (Optional)</h3>
                <p className="text-lg text-gray-600">Select up to 5 famous logos that inspire your style preferences</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {logoReferences.slice(0, 12).map((logo) => (
                  <div
                    key={logo.id}
                    onClick={() => toggleLogoReference(logo.id)}
                    className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      formData.preferredLogos.includes(logo.id)
                        ? 'border-purple-500 bg-purple-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {formData.preferredLogos.includes(logo.id) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                    )}
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      <img 
                        src={logo.imageUrl} 
                        alt={logo.name}
                        className="w-8 h-8 object-contain filter brightness-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.textContent = logo.name.charAt(0);
                        }}
                      />
                      <div className="hidden text-xl font-bold text-gray-400"></div>
                    </div>
                    <div className="text-xs font-medium text-center text-gray-700">{logo.name}</div>
                    <div className="text-xs text-center text-gray-500">{logo.category}</div>
                  </div>
                ))}
              </div>
              
              {/* Custom Image Upload Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">📸 Upload Your Own References</h4>
                  <p className="text-sm text-gray-600 mb-4">Upload up to 3 images of logos or designs that inspire you (max 5MB each)</p>
                  
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 border-dashed rounded-lg p-4 transition-colors duration-200">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📁</div>
                        <div className="text-sm font-medium text-blue-700">Choose Images</div>
                        <div className="text-xs text-blue-500">PNG, JPG, WEBP</div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    
                    <div className="text-sm text-gray-500">
                      {formData.uploadedImages.length}/3 images uploaded
                    </div>
                  </div>
                </div>
                
                {/* Display uploaded images */}
                {formData.uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {formData.uploadedImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removeUploadedImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                        <div className="text-xs text-center mt-1 text-gray-600 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-center text-sm text-gray-500 mt-6">
                Selected: {formData.preferredLogos.length}/5 brand logos • {formData.uploadedImages.length}/3 custom images
                {(formData.preferredLogos.length > 0 || formData.uploadedImages.length > 0) && (
                  <span className="block mt-2 text-purple-600">
                    These will influence your logo generation style
                  </span>
                )}
              </div>
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
                  {currentRound === 1 && "Select 1-2 logos you like to refine them further"}
                  {currentRound === 2 && "Choose from refined options or select for final refinement"}
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
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                      <img 
                        src={logo.url} 
                        alt={`Logo Option ${logo.id}`} 
                        className="w-full h-40 object-contain rounded-lg" 
                      />
                    </div>
                    
                    {/* Selection indicator */}
                    {logo.selected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                    
                    {/* Download button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadLogo(logo)
                      }}
                      className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
                    >
                      ⬇️
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {currentRound < 3 && (
                  <button 
                    onClick={() => {
                      proceedToRefinement()
                      setTimeout(() => scrollToLevel(`level-${currentRound + 1}`), 500)
                    }}
                    disabled={selectedLogos.length === 0}
                    className={`px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      selectedLogos.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-3 text-2xl">✨</span>
                      Refine Selected ({selectedLogos.length})
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
              {selectedLogos.length > 0 && (
                <div className="text-center mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                  <p className="text-blue-800 font-medium text-lg">
                    {selectedLogos.length} logo{selectedLogos.length > 1 ? 's' : ''} selected for refinement
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
                  {round.round === 1 && "Select 1-2 logos you like to refine them further"}
                  {round.round === 2 && "Choose from refined options or select for final refinement"}
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
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                      <img 
                        src={logo.url} 
                        alt={`Logo Option ${logo.id}`} 
                        className="w-full h-40 object-contain rounded-lg" 
                      />
                    </div>
                    
                    {/* Selection indicator */}
                    {logo.selected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                    
                    {/* Download button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadLogo(logo)
                      }}
                      className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
                    >
                      ⬇️
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {round.round < 3 && (
                  <button 
                    onClick={() => {
                      proceedToRefinement()
                      setTimeout(() => scrollToLevel(`level-${currentRound + 1}`), 500)
                    }}
                    disabled={selectedLogos.length === 0}
                    className={`px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      selectedLogos.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-3 text-2xl">✨</span>
                      Refine Selected ({selectedLogos.length})
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
              {selectedLogos.length > 0 && (
                <div className="text-center mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                  <p className="text-blue-800 font-medium text-lg">
                    {selectedLogos.length} logo{selectedLogos.length > 1 ? 's' : ''} selected for refinement
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

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
