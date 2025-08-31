import { useState } from 'react'
import { track } from '@vercel/analytics'

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
    
    // Track logo generation attempt
    track('Logo Generation Started', {
      businessName: formData.businessName,
      industry: formData.industry || 'unspecified',
      style: formData.style,
      hasDescription: !!formData.description,
      hasColors: !!formData.colors
    })
    
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
        
        // Track successful logo generation
        track('Logo Generated', {
          businessName: formData.businessName,
          industry: formData.industry || 'unspecified',
          style: formData.style,
          hasDescription: !!formData.description,
          hasColors: !!formData.colors
        })
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
    track('Logo Downloaded', {
      businessName: formData.businessName,
      industry: formData.industry || 'unspecified',
      style: formData.style
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-8 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">Free AI Logo Maker</h1>
      
      <div className="space-y-4 mb-8 bg-white p-6 rounded-lg shadow-md">
        <input 
          value={formData.businessName}
          onChange={(e) => setFormData({...formData, businessName: e.target.value})}
          placeholder="Business Name (required)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <select 
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Industry</option>
          <option value="restaurant">Restaurant</option>
          <option value="tech">Technology</option>
          <option value="retail">Retail</option>
          <option value="consulting">Consulting</option>
          <option value="healthcare">Healthcare</option>
          <option value="creative">Creative</option>
          <option value="other">Other</option>
        </select>
        
        <textarea 
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Brief description of your business (optional)"
          className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <select 
          value={formData.style}
          onChange={(e) => setFormData({...formData, style: e.target.value})}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="modern">Modern</option>
          <option value="minimalist">Minimalist</option>
          <option value="vintage">Vintage</option>
          <option value="playful">Playful</option>
          <option value="professional">Professional</option>
        </select>
        
        <input 
          value={formData.colors}
          onChange={(e) => setFormData({...formData, colors: e.target.value})}
          placeholder="Preferred colors (e.g., blue, green) - optional"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <button 
          onClick={generateLogo}
          disabled={!formData.businessName || loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition duration-200"
        >
          {loading ? 'Generating Logo...' : 'Generate Logo'}
        </button>
      </div>
      
      {logo && (
        <div className="text-center space-y-4 bg-white p-6 rounded-lg shadow-md">
          <div className="border-2 border-gray-200 rounded-lg p-8 bg-white">
            <img src={logo} alt="Generated Logo" className="max-w-full mx-auto" />
          </div>
          
          <div className="flex gap-4 justify-center">
            <button 
              onClick={downloadLogo}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200"
            >
              Download Logo
            </button>
            
            <button 
              onClick={generateLogo}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition duration-200"
            >
              Generate New Logo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
