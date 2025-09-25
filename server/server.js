const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')
const path = require('path')
const Replicate = require('replicate')
const Stripe = require('stripe')
const { connectToDatabase, sql } = require('./lib/db')
const { migrateFromLocalStorage } = require('./lib/migrate')

dotenv.config({ path: path.join(__dirname, '../.env') })

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Initialize Stripe client with error handling
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY environment variable is missing!')
  console.warn('💳 Payment features will be disabled, but other APIs will work')
  console.warn('📋 Available environment variables:', Object.keys(process.env).filter(key => key.includes('STRIPE')))
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Verify DB connectivity on boot (non-blocking)
connectToDatabase().then(ok => {
  if (!ok) {
    console.warn('⚠️ Database not reachable at startup. API endpoints will attempt reconnects.')
  }
})

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
        
        // In serverless environments (Vercel), always use data URLs
        if (process.env.VERCEL) {
          console.log('💾 Serverless environment detected - returning base64 data URL')
          return `data:image/png;base64,${imageData}`
        }

        // For local/Railway environments, save to file system
        try {
          const timestamp = Date.now()
          const filename = `logo-${timestamp}.png`
          const filepath = path.join(imagesDir, filename)

          // Save the image
          fs.writeFileSync(filepath, buffer)
          console.log(`💾 Logo saved as ${filename}`)

          // Return the URL to access the image
          const baseUrl = `http://localhost:${port}`
          return `${baseUrl}/images/${filename}`
        } catch (saveError) {
          console.warn('⚠️ Could not save image file, using data URL')
          console.log('💾 Returning base64 data URL instead')
          // Fallback to data URL
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

// Image upscaling endpoint using Replicate Real-ESRGAN
app.post('/api/upscale', async (req, res) => {
  console.log('🔍 Received upscaling request')
  console.log('📦 Request body keys:', Object.keys(req.body))

  try {
    const { imageUrl, scale = 4 } = req.body

    if (!imageUrl) {
      console.log('❌ No image URL provided')
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // Validate the Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.log('❌ REPLICATE_API_TOKEN not found')
      return res.status(500).json({ error: 'Replicate API token not configured' })
    }

    console.log('🔍 Upscaling image URL:', imageUrl)
    console.log('📏 Scale factor:', scale)
    console.log('🔑 Replicate API token status:', process.env.REPLICATE_API_TOKEN ? 'Present' : 'MISSING')

    const startTime = Date.now()

    // Call Replicate Real-ESRGAN model for upscaling
    console.log('🚀 Starting Replicate Real-ESRGAN upscaling...')
    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: imageUrl,
          scale: scale,
          face_enhance: false, // Keep false for logos to avoid face detection artifacts
        }
      }
    )

    const endTime = Date.now()
    console.log(`✅ Upscaling completed in ${endTime - startTime}ms`)
    console.log('📎 Upscaled image URL:', output)

    // The output is typically a URL to the upscaled image
    res.json({
      originalUrl: imageUrl,
      upscaledUrl: output,
      scale: scale,
      processingTime: endTime - startTime
    })

  } catch (error) {
    console.error('❌ SERVER ERROR in /api/upscale:')
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    console.error('   Error name:', error.name)
    console.error('   Request body:', req.body)
    console.error('   Environment variables:', {
      'REPLICATE_API_TOKEN': process.env.REPLICATE_API_TOKEN ? 'Present' : 'MISSING'
    })

    // Handle specific Replicate errors
    if (error.message.includes('Authentication failed')) {
      return res.status(401).json({
        error: 'Replicate API authentication failed. Please check your API token.'
      })
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({
        error: 'Replicate API quota exceeded. Please try again later.'
      })
    }

    res.status(500).json({
      error: 'Failed to upscale image: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Create payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  console.log('🔍 create-payment-intent endpoint called');
  console.log('🔑 STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY);
  console.log('🔑 STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 'undefined');
  console.log('🔑 STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) : 'undefined');

  if (!stripe) {
    return res.status(503).json({ error: 'Payment service unavailable - Stripe not configured' });
  }

  try {
    console.log('💳 Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999, // €9.99 in cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created successfully');
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('❌ Stripe payment intent error:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error type from Stripe:', error.type);
    console.error('   Full error:', error);

    res.status(400).send({
      error: {
        message: error.message,
        type: error.type,
        code: error.code
      },
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

// ============================
// User Management APIs
// ============================

app.post('/api/users/sync', async (req, res) => {
  try {
    const { clerkUserId, email } = req.body
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    const { rows } = await sql`
      INSERT INTO users (clerk_user_id, email)
      VALUES (${clerkUserId}, ${email || null})
      ON CONFLICT (clerk_user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
      RETURNING id, clerk_user_id, email, subscription_status, generations_used, generations_limit
    `
    res.json({ user: rows[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/profile', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    const { rows } = await sql`
      SELECT id, clerk_user_id, email, subscription_status, generations_used, generations_limit
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `
    res.json({ profile: rows[0] || null })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/subscription', async (req, res) => {
  try {
    const { clerkUserId, status } = req.body
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    await sql`UPDATE users SET subscription_status = ${status || 'free'} WHERE clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Migration API
app.post('/api/users/migrate', async (req, res) => {
  try {
    const { clerkUserId, email, localStorageData } = req.body
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })

    const result = await migrateFromLocalStorage(clerkUserId, localStorageData, email)
    res.json(result)
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ error: error.message, success: false })
  }
})

// ============================
// Logo Management APIs
// ============================

app.get('/api/logos/saved', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    const { rows } = await sql`
      SELECT id, logo_url as url, logo_prompt as prompt, created_at, is_premium, file_format
      FROM saved_logos
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY created_at DESC
    `
    res.json({ logos: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/logos/save', async (req, res) => {
  try {
    const { clerkUserId, logo } = req.body
    if (!clerkUserId || !logo?.url) return res.status(400).json({ error: 'clerkUserId and logo.url required' })
    const { rows } = await sql`SELECT id FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    await sql`
      INSERT INTO saved_logos (user_id, clerk_user_id, logo_url, logo_prompt, is_premium, file_format)
      VALUES (${rows[0].id}, ${clerkUserId}, ${logo.url}, ${logo.prompt || null}, ${!!logo.is_premium}, ${logo.file_format || 'png'})
    `
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/logos/:id', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    const { id } = req.params
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    await sql`DELETE FROM saved_logos WHERE id = ${id} AND clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/logos/clear', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    await sql`DELETE FROM saved_logos WHERE clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================
// Generation Tracking APIs
// ============================

app.post('/api/generations/track', async (req, res) => {
  try {
    const { clerkUserId, prompt } = req.body
    if (!clerkUserId || !prompt) return res.status(400).json({ error: 'clerkUserId and prompt required' })
    await sql`INSERT INTO generation_history (clerk_user_id, prompt) VALUES (${clerkUserId}, ${prompt})`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/generations/usage', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    const { rows } = await sql`SELECT generations_used, generations_limit, subscription_status FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`
    res.json(rows[0] || { generations_used: 0 })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/generations/increment', async (req, res) => {
  try {
    const { clerkUserId, by = 1 } = req.body
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })
    await sql`UPDATE users SET generations_used = generations_used + ${by} WHERE clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================
// Analytics APIs
// ============================

app.post('/api/analytics/track', async (req, res) => {
  try {
    const { event, clerkUserId, meta } = req.body
    if (!event) return res.status(400).json({ error: 'event is required' })
    await sql`INSERT INTO usage_analytics (action, clerk_user_id, metadata) VALUES (${event}, ${clerkUserId || null}, ${meta ? JSON.stringify(meta) : null})`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { rows } = await sql`SELECT action, COUNT(*) as count FROM usage_analytics GROUP BY action ORDER BY count DESC`
    res.json({ events: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
