import { useState } from 'react'

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

interface FormData {
  businessName: string
  industry: string
  description: string
  style: string
  colors: string
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

const buildPrompt = (formData: FormData, variation?: string): string => {
  const { businessName, industry, description, style, colors } = formData
  
  // Build a descriptive, narrative prompt as recommended for Gemini
  let prompt = `Create a modern, professional logo for a business called "${businessName}".`
  
  if (industry && description) {
    prompt += ` This is a ${industry} company that ${description}.`
  } else if (industry) {
    prompt += ` This is a ${industry} business.`
  } else if (description) {
    prompt += ` The business ${description}.`
  }
  
  // Add style-specific descriptive language
  const styleDescriptions = {
    modern: 'The logo should have a contemporary, sleek design with clean lines and geometric shapes',
    minimalist: 'Design a minimalist logo with simple, clean elements and plenty of negative space',
    vintage: 'Create a vintage-style logo with classic typography and traditional design elements',
    playful: 'Make a playful, friendly logo with dynamic shapes and approachable design elements',
    professional: 'Design a sophisticated, corporate logo that conveys trust and expertise'
  }
  
  prompt += ` ${styleDescriptions[style as keyof typeof styleDescriptions] || styleDescriptions.modern}.`
  
  // Add variation-specific guidance for refinement rounds
  if (variation) {
    prompt += ` ${variation}`
  }
  
  // Add color guidance
  if (colors) {
    prompt += ` Use a color palette primarily featuring ${colors}.`
  } else {
    prompt += ` Choose appropriate colors that reflect the business nature and industry.`
  }
  
  // Add technical specifications for logo quality
  prompt += ` The logo should include clear, legible text if text is incorporated. Ensure high contrast between elements for versatility. The design should be scalable and work well at different sizes, from business cards to signage. Create a square format logo suitable for digital and print applications. The overall design should be memorable, distinctive, and professional.`
  
  return prompt
}

const createPromptVariations = (basePrompt: string): string[] => {
  const variations = [
    '', // Base prompt
    'Focus on typography-based design with minimal iconography.',
    'Emphasize symbolic elements and icons over text.',
    'Create an abstract, geometric interpretation.',
    'Design with bold, impactful visual elements.',
  ]
  
  return variations.map(variation => basePrompt + (variation ? ` ${variation}` : ''))
}

const refinePromptFromSelection = (_selectedLogos: Logo[], formData: FormData): string[] => {
  const basePrompt = buildPrompt(formData)
  
  // Analyze selected logos to create targeted variations
  const refinementPrompts = [
    `${basePrompt} Create a similar style to the previously preferred designs, with subtle variations in layout and composition.`,
    `${basePrompt} Maintain the core design elements that were selected, but explore different color treatments.`,
    `${basePrompt} Keep the preferred aesthetic direction, but experiment with different typography approaches.`,
    `${basePrompt} Blend the best aspects of the selected designs into new creative variations.`,
    `${basePrompt} Refine the chosen design direction with enhanced professionalism and polish.`,
  ]
  
  return refinementPrompts
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    industry: '',
    description: '',
    style: 'modern',
    colors: ''
  })
  const [logos, setLogos] = useState<Logo[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [_generationHistory, setGenerationHistory] = useState<GenerationRound[]>([])
  const [selectedLogos, setSelectedLogos] = useState<Logo[]>([])
  const [_showingFinal, _setShowingFinal] = useState(false)

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
      const basePrompt = buildPrompt(formData)
      prompts = createPromptVariations(basePrompt)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      
      {/* Level 0: Hero Section */}
      <div id="level-0" className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
            Free AI Logo Maker
          </h1>
          <p className="text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create professional logos in seconds with AI. No design skills needed, completely free to use.
          </p>
          <div className="flex justify-center space-x-12 text-lg text-gray-500 mb-16">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              Powered by Google Gemini AI
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              High-quality PNG downloads
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              100% Free to use
            </div>
          </div>
          <button 
            onClick={() => scrollToLevel('level-1')}
            className="animate-bounce hover:animate-none transition-all duration-300 transform hover:scale-110"
          >
            <div className="w-12 h-12 border-2 border-blue-600 rounded-full mx-auto flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <span className="text-2xl">↓</span>
            </div>
          </button>
        </div>
      </div>

      {/* Level 1: Form Section */}
      <div id="level-1" className="min-h-screen flex items-center justify-center py-20">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/20">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Step 1: Tell Us About Your Business</h2>
              <p className="text-xl text-gray-600">The more details you provide, the better your logos will be</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-700">Business Name *</label>
                  <input 
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Enter your business name"
                    className="w-full p-5 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-700">Industry</label>
                  <select 
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="w-full p-5 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 text-lg"
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
                  <label className="block text-lg font-medium text-gray-700">Business Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell us what your business does (helps create better logos)"
                    className="w-full p-5 border-0 bg-gray-50 rounded-2xl h-32 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none text-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-700">Logo Style</label>
                  <select 
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    className="w-full p-5 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 text-lg"
                  >
                    <option value="modern">✨ Modern & Clean</option>
                    <option value="minimalist">🎯 Minimalist & Simple</option>
                    <option value="vintage">🏛️ Vintage & Classic</option>
                    <option value="playful">🎪 Playful & Fun</option>
                    <option value="professional">💼 Professional & Corporate</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-gray-700">Color Preferences</label>
                  <input 
                    value={formData.colors}
                    onChange={(e) => setFormData({...formData, colors: e.target.value})}
                    placeholder="e.g., blue and white, green, purple"
                    className="w-full p-5 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
                  />
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
