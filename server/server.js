const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Create directory for generated images (use /tmp in serverless environments)
const imagesDir = process.env.VERCEL ? '/tmp/generated-logos' : './generated-logos'
try {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
    console.log('✅ Created images directory:', imagesDir)
  }
} catch (error) {
  console.warn('⚠️ Could not create images directory (serverless environment):', error.message)
  console.log('📁 Will use base64 responses instead of file storage')
}

// Serve static files from generated-logos directory (only if directory exists)
if (fs.existsSync(imagesDir)) {
  app.use('/images', express.static(imagesDir))
}


const callGeminiAPI = async (prompt, referenceImages = []) => {
  const apiKey = process.env.GEMINI_API_KEY
  
  console.log('🔑 API Key status:', apiKey ? `Present (${apiKey.length} chars)` : 'MISSING')
  
  if (!apiKey) {
    console.warn('❌ GEMINI_API_KEY not set, using placeholder image')
    return generateEnhancedPlaceholder(prompt)
  }

  try {
    console.log('🔄 Initializing Gemini client...')
    console.log('🔑 API Key first/last 5 chars:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'NONE')
    const ai = new GoogleGenAI({ apiKey: apiKey })
    
    // Enhanced prompt for better logo generation
    let enhancedPrompt = `Create a professional, high-quality logo design. ${prompt}. The logo should be clean, memorable, and suitable for business use. Use high contrast colors, clear typography if text is included, and ensure the design works well at different sizes. Style: modern and professional. Format: square logo suitable for business applications. IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements.`

    // Add specific instructions for image refinement using direct image input
    if (referenceImages && referenceImages.length > 0) {
      console.log('🎯 Using direct image refinement approach like Gemini chat...')
      enhancedPrompt = `${prompt} Keep the exact same design, layout, typography, and structure as shown in the provided image. Apply only the specific changes requested while preserving everything else identical to the reference image.`
    }

    console.log('🚀 Attempting to generate logo with Gemini API...')
    console.log('📝 Prompt:', enhancedPrompt.substring(0, 100) + '...')

    console.log('📡 Calling ai.models.generateContent()...')

    // Construct contents array EXACTLY like documentation
    if (referenceImages && referenceImages.length > 0) {
      console.log('🖼️ Using image + text format exactly like documentation')
      // This is the EXACT format from documentation
      const prompt = [
        { text: enhancedPrompt },
        {
          inlineData: {
            mimeType: referenceImages[0].mimeType,
            data: referenceImages[0].data,
          },
        },
      ]
      contents = prompt
      console.log('📝 Sending to Gemini: documentation format - array with text + image')
    } else {
      contents = enhancedPrompt
      console.log('📝 Sending to Gemini: text-only prompt')
    }

    console.log('🚀 CALLING GEMINI API NOW...')
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: contents
    })
    console.log('✅ Gemini API call completed')
    
    console.log('📨 Received response from Gemini API')
    console.log('🔍 Response structure:', {
      candidates: response.candidates?.length || 0,
      hasContent: !!response.candidates?.[0]?.content,
      hasParts: !!response.candidates?.[0]?.content?.parts?.length,
      hasInlineData: !!response.candidates?.[0]?.content?.parts?.[0]?.inlineData
    })

    // Check if we got image data - JavaScript uses inlineData not inline_data
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        console.log('✅ Found image data in response!')
        const imageData = part.inlineData.data
        const buffer = Buffer.from(imageData, "base64")
        
        // Try to save image to file system, fallback to data URL
        try {
          const timestamp = Date.now()
          const filename = `logo-${timestamp}.png`
          const filepath = path.join(imagesDir, filename)

          // Save the image
          fs.writeFileSync(filepath, buffer)
          console.log(`💾 Logo saved as ${filename}`)

          // Return the URL to access the image
          const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : process.env.VERCEL
              ? `https://${process.env.VERCEL_URL}`
              : `http://localhost:${port}`
          return `${baseUrl}/images/${filename}`
        } catch (saveError) {
          console.warn('⚠️ Could not save image file (serverless environment), using data URL')
          console.log('💾 Returning base64 data URL instead')
          // Return data URL directly for serverless environments
          return `data:image/png;base64,${imageData}`
        }
      }
    }
    
    // If no image generated, use enhanced placeholder
    console.log('❌ No image data received, using placeholder')
    console.log('📄 Response content:', JSON.stringify(response.candidates?.[0]?.content, null, 2))
    return generateEnhancedPlaceholder(prompt, 'no-image-data')
    
  } catch (error) {
    console.error('Gemini API Error:', error.status || error.message)
    console.error('Full error details:', error)
    
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

// Simple logo generation endpoint - NO IP TRACKING
app.post('/api/generate-multiple', async (req, res) => {
  console.log('📨 Received multiple logo generation request')
  console.log('📦 Request body keys:', Object.keys(req.body))
  console.log('📏 Request body size:', JSON.stringify(req.body).length, 'characters')

  try {
    const { prompts, referenceImages } = req.body

    // DEBUG: Check if referenceImages are present
    console.log('🔍 DEBUG: referenceImages present?', !!referenceImages)
    console.log('🔍 DEBUG: referenceImages type:', typeof referenceImages)
    console.log('🔍 DEBUG: referenceImages length:', referenceImages ? referenceImages.length : 'undefined')
    if (referenceImages) {
      console.log('🔍 DEBUG: First image keys:', Object.keys(referenceImages[0] || {}))
    }

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
      console.log(`   ${index + 1}. ${prompt.substring(0, 100)}...`)
    })

    // DETAILED REFERENCE IMAGE DEBUGGING
    if (referenceImages && referenceImages.length > 0) {
      console.log('🖼️ === REFERENCE IMAGES RECEIVED ===')
      console.log(`   Count: ${referenceImages.length}`)
      referenceImages.forEach((img, index) => {
        console.log(`   Image ${index + 1}:`)
        console.log(`     - MIME Type: ${img.mimeType}`)
        console.log(`     - Data Length: ${img.data ? img.data.length : 'NO DATA'}`)
        console.log(`     - Size (KB): ${img.data ? Math.round(img.data.length * 0.75 / 1024) : 0}`)
        console.log(`     - First 50 chars: ${img.data ? img.data.substring(0, 50) + '...' : 'EMPTY'}`)
      })
      console.log('🖼️ === END REFERENCE IMAGES ===')
    } else {
      console.log('🚫 NO reference images received')
      console.log('   referenceImages value:', referenceImages)
      console.log('   referenceImages type:', typeof referenceImages)
    }

    const startTime = Date.now()

    // Generate all logos concurrently
    const logoPromises = prompts.map(async (prompt, index) => {
      try {
        console.log(`🔄 Starting logo ${index + 1}/${prompts.length}`)
        const logoUrl = await callGeminiAPI(prompt, referenceImages)
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
    console.error('❌ SERVER ERROR in /api/generate-multiple:')
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    console.error('   Error name:', error.name)
    console.error('   Request body keys:', Object.keys(req.body || {}))
    console.error('   Environment variables:', {
      'GEMINI_API_KEY': process.env.GEMINI_API_KEY ? 'Present' : 'MISSING',
      'NODE_ENV': process.env.NODE_ENV,
      'PORT': process.env.PORT
    })
    res.status(500).json({
      error: 'Failed to generate logos: ' + error.message,
      details: error.stack
    })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})