import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import * as fs from 'node:fs'
import * as path from 'path'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Create directory for generated images
const imagesDir = './generated-logos'
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

// Serve static files from generated-logos directory
app.use('/images', express.static(imagesDir))

const callGeminiAPI = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using placeholder image')
    return generateEnhancedPlaceholder(prompt)
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey
    })

    // Enhanced prompt for better logo generation
    const enhancedPrompt = `Create a professional, high-quality logo design. ${prompt}. The logo should be clean, memorable, and suitable for business use. Use high contrast colors, clear typography if text is included, and ensure the design works well at different sizes. Style: modern and professional. Format: square logo suitable for business applications.`

    console.log('Attempting to generate logo with Gemini API...')

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: enhancedPrompt,
    })

    // Process the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data
        const buffer = Buffer.from(imageData, "base64")
        
        // Generate unique filename
        const timestamp = Date.now()
        const filename = `logo-${timestamp}.png`
        const filepath = path.join(imagesDir, filename)
        
        // Save the image
        fs.writeFileSync(filepath, buffer)
        console.log(`Logo saved as ${filename}`)
        
        // Return the URL to access the image
        const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
          : `http://localhost:${port}`
        return `${baseUrl}/images/${filename}`
      }
    }
    
    // Fallback if no image was generated
    throw new Error('No image was generated in the response')
    
  } catch (error) {
    console.error('Gemini API Error:', error.status || error.message)
    
    // Handle specific API errors
    if (error.status === 429) {
      console.log('⚠️  Gemini API quota exceeded - using enhanced placeholder')
      return generateEnhancedPlaceholder(prompt, 'quota-exceeded')
    }
    
    // Return enhanced placeholder on other errors
    console.log('⚠️  Gemini API error - using enhanced placeholder')
    return generateEnhancedPlaceholder(prompt, 'api-error')
  }
}

const generateEnhancedPlaceholder = (prompt, errorType = 'demo') => {
  // Extract business name from prompt if possible
  const businessNameMatch = prompt.match(/for "([^"]+)"/i) || prompt.match(/called "([^"]+)"/i)
  const businessName = businessNameMatch ? businessNameMatch[1] : 'Your Business'
  
  // Choose colors based on industry/style
  const colorSchemes = [
    { bg: '2563eb', text: 'ffffff', desc: 'Professional Blue' },
    { bg: '059669', text: 'ffffff', desc: 'Growth Green' },
    { bg: 'dc2626', text: 'ffffff', desc: 'Bold Red' },
    { bg: '7c3aed', text: 'ffffff', desc: 'Creative Purple' },
    { bg: 'ea580c', text: 'ffffff', desc: 'Energy Orange' }
  ]
  
  const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)]
  
  let logoText = businessName
  if (errorType === 'quota-exceeded') {
    logoText += '%0A%0A(Quota+Exceeded)'
  } else if (errorType === 'api-error') {
    logoText += '%0A%0A(Demo+Mode)'
  }
  
  const placeholderUrl = `https://via.placeholder.com/400x400/${scheme.bg}/${scheme.text}?text=${encodeURIComponent(logoText)}`
  
  console.log(`📸 Generated ${scheme.desc} placeholder for: ${businessName}`)
  return placeholderUrl
}

app.post('/api/generate', async (req, res) => {
  console.log('📨 Received logo generation request')
  
  try {
    const { prompt } = req.body

    if (!prompt) {
      console.log('❌ No prompt provided')
      return res.status(400).json({ error: 'Prompt is required' })
    }

    console.log('🎨 Generating logo with prompt:', prompt.substring(0, 100) + '...')
    
    const startTime = Date.now()
    const logoUrl = await callGeminiAPI(prompt)
    const endTime = Date.now()
    
    console.log(`✅ Logo generated in ${endTime - startTime}ms`)
    console.log('📎 Logo URL:', logoUrl)
    
    res.json({ logoUrl })
  } catch (error) {
    console.error('❌ Server error in /api/generate:', error.message)
    res.status(500).json({ error: 'Failed to generate logo: ' + error.message })
  }
})

app.post('/api/generate-multiple', async (req, res) => {
  console.log('📨 Received multiple logo generation request')
  
  try {
    const { prompts } = req.body

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      console.log('❌ No prompts provided or invalid format')
      return res.status(400).json({ error: 'Prompts array is required' })
    }

    if (prompts.length > 5) {
      console.log('❌ Too many prompts requested')
      return res.status(400).json({ error: 'Maximum 5 prompts allowed' })
    }

    console.log(`🎨 Generating ${prompts.length} logos with prompts:`)
    prompts.forEach((prompt, index) => {
      console.log(`   ${index + 1}. ${prompt.substring(0, 80)}...`)
    })
    
    const startTime = Date.now()
    
    // Generate all logos concurrently
    const logoPromises = prompts.map(async (prompt, index) => {
      try {
        console.log(`🔄 Starting logo ${index + 1}/${prompts.length}`)
        const logoUrl = await callGeminiAPI(prompt)
        console.log(`✅ Logo ${index + 1} completed`)
        return logoUrl
      } catch (error) {
        console.error(`❌ Error generating logo ${index + 1}:`, error.message)
        // Return placeholder on individual logo failure
        return generateEnhancedPlaceholder(prompt, 'generation-error')
      }
    })
    
    const logos = await Promise.all(logoPromises)
    const endTime = Date.now()
    
    console.log(`✅ All ${logos.length} logos generated in ${endTime - startTime}ms`)
    console.log('📎 Logo URLs:')
    logos.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`)
    })
    
    res.json({ logos })
  } catch (error) {
    console.error('❌ Server error in /api/generate-multiple:', error.message)
    res.status(500).json({ error: 'Failed to generate logos: ' + error.message })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})