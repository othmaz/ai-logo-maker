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

const buildPrompt = (formData: FormData): string => {
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

function App() {
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    industry: '',
    description: '',
    style: 'modern',
    colors: ''
  })
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generateLogo = async () => {
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
          has_colors: !!formData.colors
        })
      } else {
        console.log('⚠️ GA4 gtag not available')
      }
    } catch (error) {
      console.error('GA4 tracking error:', error)
    }
    
    const prompt = buildPrompt(formData)
    console.log('📝 Built prompt:', prompt)
    
    try {
      console.log('📡 Sending request to Railway backend...')
      
      const response = await fetch('https://ai-logo-maker-production.up.railway.app/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      console.log('📨 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Response data:', data)
      
      if (data.logoUrl) {
        setLogo(data.logoUrl)
        console.log('🖼️ Logo URL set:', data.logoUrl)
        
        // Track successful logo generation with GA4
        try {
          if (typeof window !== 'undefined' && window.gtag) {
            console.log('🔍 Sending GA4 event: logo_generated')
            window.gtag('event', 'logo_generated', {
              business_name: formData.businessName,
              industry: formData.industry || 'unspecified',
              style: formData.style,
              has_description: !!formData.description,
              has_colors: !!formData.colors
            })
          } else {
            console.log('⚠️ GA4 gtag not available for logo_generated')
          }
        } catch (error) {
          console.error('GA4 logo_generated tracking error:', error)
        }
      } else if (data.error) {
        console.error('❌ Server error:', data.error)
        alert('Error generating logo: ' + data.error)
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      alert('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
      console.log('🏁 Logo generation finished')
    }
  }

  const downloadLogo = () => {
    if (!logo) return
    const link = document.createElement('a')
    link.download = `${formData.businessName}-logo.png`
    link.href = logo
    link.click()
    
    // Track logo download - this is a conversion! 
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        console.log('🔍 Sending GA4 event: logo_downloaded')
        window.gtag('event', 'logo_downloaded', {
          business_name: formData.businessName,
          industry: formData.industry || 'unspecified',
          style: formData.style
        })
      } else {
        console.log('⚠️ GA4 gtag not available for logo_downloaded')
      }
    } catch (error) {
      console.error('GA4 logo_downloaded tracking error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
              Free AI Logo Maker
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create professional logos in seconds with AI. No design skills needed, completely free to use.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500 mb-12">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Powered by Google Gemini AI
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                High-quality PNG downloads
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                100% Free to use
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Design Your Logo</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Business Name *</label>
                <input 
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  placeholder="Enter your business name"
                  className="w-full p-4 border-0 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <select 
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full p-4 border-0 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900"
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
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Business Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell us what your business does (helps create better logos)"
                  className="w-full p-4 border-0 bg-gray-50 rounded-xl h-28 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Logo Style</label>
                <select 
                  value={formData.style}
                  onChange={(e) => setFormData({...formData, style: e.target.value})}
                  className="w-full p-4 border-0 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900"
                >
                  <option value="modern">✨ Modern & Clean</option>
                  <option value="minimalist">🎯 Minimalist & Simple</option>
                  <option value="vintage">🏛️ Vintage & Classic</option>
                  <option value="playful">🎪 Playful & Fun</option>
                  <option value="professional">💼 Professional & Corporate</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Color Preferences</label>
                <input 
                  value={formData.colors}
                  onChange={(e) => setFormData({...formData, colors: e.target.value})}
                  placeholder="e.g., blue and white, green, purple"
                  className="w-full p-4 border-0 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500"
                />
              </div>
              
              <button 
                onClick={generateLogo}
                disabled={!formData.businessName || loading}
                className={`w-full p-4 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                  !formData.businessName || loading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creating Your Logo...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🎨</span>
                    Generate AI Logo
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Logo Display Section */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
            {!logo ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">🎨</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your Logo Will Appear Here</h3>
                <p className="text-gray-500">Fill out the form and click "Generate AI Logo" to create your professional logo</p>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">🎉 Your Logo is Ready!</h3>
                <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors duration-200">
                  <img src={logo} alt="Generated Logo" className="max-w-full mx-auto rounded-lg shadow-lg" />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={downloadLogo}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-2">⬇️</span>
                      Download PNG
                    </div>
                  </button>
                  
                  <button 
                    onClick={generateLogo}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-2">🔄</span>
                      Generate New Logo
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-16 py-8">
          <p className="text-gray-500 text-sm">
            Powered by Google Gemini AI • Created with ❤️ for entrepreneurs
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
