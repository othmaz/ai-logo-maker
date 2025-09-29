const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')
const path = require('path')
const Replicate = require('replicate')
const Stripe = require('stripe')
const sharp = require('sharp')
const potrace = require('potrace')
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

// Stripe webhook endpoint for secure payment verification
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    console.error('❌ Stripe not configured for webhook processing');
    return res.status(503).send('Stripe not configured');
  }

  if (!endpointSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('💳 Payment succeeded:', paymentIntent.id);

        // Extract user information from metadata (if available)
        const userId = paymentIntent.metadata?.userId;
        const userEmail = paymentIntent.metadata?.userEmail;

        if (userId) {
          console.log('👤 Processing payment for user:', userId);

          // Update user subscription in database
          try {
            await connectToDatabase();
            await sql`
              UPDATE users
              SET subscription_status = 'premium',
                  payment_date = NOW(),
                  stripe_payment_id = ${paymentIntent.id}
              WHERE clerk_user_id = ${userId}
            `;

            console.log('✅ User subscription updated successfully');

            // Track payment analytics
            await sql`
              INSERT INTO usage_analytics (user_id, event_type, event_data)
              VALUES (
                ${userId},
                'payment_success',
                ${JSON.stringify({
                  payment_id: paymentIntent.id,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency
                })}
              )
            `;

            console.log('📊 Payment analytics tracked');

          } catch (dbError) {
            console.error('❌ Database error during payment processing:', dbError);
            // Don't fail the webhook - Stripe considers this payment successful
          }
        } else {
          console.warn('⚠️ Payment succeeded but no userId in metadata:', paymentIntent.id);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('❌ Payment failed:', failedPayment.id);

        // Track failed payment analytics
        const failedUserId = failedPayment.metadata?.userId;
        if (failedUserId) {
          try {
            await connectToDatabase();
            await sql`
              INSERT INTO usage_analytics (user_id, event_type, event_data)
              VALUES (
                ${failedUserId},
                'payment_failed',
                ${JSON.stringify({
                  payment_id: failedPayment.id,
                  error: failedPayment.last_payment_error?.message
                })}
              )
            `;
          } catch (dbError) {
            console.error('❌ Failed to track payment failure:', dbError);
          }
        }
        break;

      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Enhanced payment intent creation with user metadata
app.post('/api/create-payment-intent-with-user', async (req, res) => {
  console.log('🔍 create-payment-intent-with-user endpoint called');

  if (!stripe) {
    return res.status(503).json({ error: 'Payment service unavailable - Stripe not configured' });
  }

  try {
    const { userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('💳 Creating payment intent for user:', userId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999, // €9.99 in cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId,
        userEmail: userEmail || 'unknown'
      }
    });

    console.log('✅ Payment intent created with user metadata');

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      formattedAmount: '€9.99'
    });

  } catch (error) {
    console.error('❌ Enhanced payment intent error:', error);
    res.status(400).send({
      error: {
        message: error.message,
        type: error.type,
        code: error.code
      },
    });
  }
});

// Payment verification endpoint (fallback for client-side verification)
app.get('/api/verify-payment/:paymentIntentId', async (req, res) => {
  console.log('🔍 verify-payment endpoint called');

  if (!stripe) {
    return res.status(503).json({ error: 'Payment service unavailable' });
  }

  try {
    const { paymentIntentId } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('💳 Payment intent status:', paymentIntent.status);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(400).json({
      error: error.message
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

    await connectToDatabase()
    const { rows } = await sql`
      INSERT INTO users (clerk_user_id, email)
      VALUES (${clerkUserId}, ${email || null})
      ON CONFLICT (clerk_user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
      RETURNING id, clerk_user_id, email, subscription_status, generations_used, generations_limit
    `

    console.log(`✅ User synced: ${clerkUserId}, subscription: ${rows[0]?.subscription_status}`)
    res.json({ user: rows[0] })
  } catch (error) {
    console.error('❌ Failed to sync user:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/profile', async (req, res) => {
  try {
    const { clerkUserId } = req.query
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })

    await connectToDatabase()
    const { rows } = await sql`
      SELECT id, clerk_user_id, email, subscription_status, generations_used, generations_limit
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `

    console.log(`✅ Profile fetched for user ${clerkUserId}, subscription: ${rows[0]?.subscription_status || 'none'}`)
    res.json({ profile: rows[0] || null })
  } catch (error) {
    console.error('❌ Failed to fetch profile:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/subscription', async (req, res) => {
  try {
    const { clerkUserId, status } = req.body
    if (!clerkUserId) return res.status(400).json({ error: 'clerkUserId is required' })

    await connectToDatabase()
    const result = await sql`UPDATE users SET subscription_status = ${status || 'free'} WHERE clerk_user_id = ${clerkUserId}`

    console.log(`✅ Updated subscription for user ${clerkUserId} to ${status}. Rows affected: ${result.count}`)

    res.json({ success: true, rowsAffected: result.count })
  } catch (error) {
    console.error('❌ Failed to update subscription:', error)
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
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

    await connectToDatabase()
    await sql`INSERT INTO usage_analytics (action, clerk_user_id, metadata) VALUES (${event}, ${clerkUserId || null}, ${meta ? JSON.stringify(meta) : null})`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    await connectToDatabase()
    const { rows } = await sql`SELECT action, COUNT(*) as count FROM usage_analytics GROUP BY action ORDER BY count DESC`
    res.json({ events: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================
// Premium File Generation APIs
// ============================

// Helper function to verify premium user status
const verifyPremiumUser = async (clerkUserId) => {
  await connectToDatabase()
  const { rows } = await sql`
    SELECT subscription_status FROM users
    WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `
  return rows[0]?.subscription_status === 'premium'
}

// Helper function to fetch image buffer from URL
const fetchImageBuffer = async (imageUrl) => {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

// 8K Upscale Endpoint
app.post('/api/logos/:id/upscale', async (req, res) => {
  console.log('🔍 8K upscale endpoint called')

  try {
    const { id } = req.params
    const { clerkUserId } = req.body

    if (!clerkUserId) {
      return res.status(400).json({ error: 'clerkUserId is required' })
    }

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for 8K upscaling' })
    }

    // Get logo from database
    await connectToDatabase()
    const { rows } = await sql`
      SELECT logo_url FROM saved_logos
      WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
    `

    if (!rows[0]) {
      return res.status(404).json({ error: 'Logo not found' })
    }

    const logoUrl = rows[0].logo_url
    console.log('🔍 Upscaling logo:', logoUrl)

    if (!replicate) {
      return res.status(503).json({ error: 'Replicate service not configured' })
    }

    // Call Replicate Real-ESRGAN for 8K upscaling
    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: logoUrl,
          scale: 8, // 8x upscaling for 8K resolution
          face_enhance: false
        }
      }
    )

    console.log('✅ 8K upscaling completed')

    // Track analytics
    await sql`
      INSERT INTO usage_analytics (action, clerk_user_id, metadata)
      VALUES ('logo_upscaled_8k', ${clerkUserId}, ${JSON.stringify({ logo_id: id, original_url: logoUrl, upscaled_url: output })})
    `

    res.json({
      success: true,
      originalUrl: logoUrl,
      upscaledUrl: output,
      scale: 8,
      resolution: '8K'
    })

  } catch (error) {
    console.error('❌ 8K upscale error:', error)
    res.status(500).json({
      error: 'Failed to upscale logo: ' + error.message
    })
  }
})

// SVG Conversion Endpoint
app.post('/api/logos/:id/vectorize', async (req, res) => {
  console.log('🔍 SVG vectorization endpoint called')

  try {
    const { id } = req.params
    const { clerkUserId } = req.body

    if (!clerkUserId) {
      return res.status(400).json({ error: 'clerkUserId is required' })
    }

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for SVG conversion' })
    }

    // Get logo from database
    await connectToDatabase()
    const { rows } = await sql`
      SELECT logo_url FROM saved_logos
      WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
    `

    if (!rows[0]) {
      return res.status(404).json({ error: 'Logo not found' })
    }

    const imageUrl = rows[0].logo_url
    console.log('🔍 Vectorizing logo:', imageUrl)

    // Fetch and process image
    const imageBuffer = await fetchImageBuffer(imageUrl)

    // Convert to high-contrast PNG for better vectorization
    const processedBuffer = await sharp(imageBuffer)
      .png()
      .sharpen()
      .normalise()
      .toBuffer()

    // Convert to SVG using potrace
    const svgString = await new Promise((resolve, reject) => {
      potrace.trace(processedBuffer, {
        background: '#FFFFFF',
        color: 'auto',
        threshold: 128,
        optTolerance: 0.4,
        turdSize: 100,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY
      }, (err, svg) => {
        if (err) reject(err)
        else resolve(svg)
      })
    })

    console.log('✅ SVG vectorization completed')

    // Track analytics
    await sql`
      INSERT INTO usage_analytics (action, clerk_user_id, metadata)
      VALUES ('logo_vectorized', ${clerkUserId}, ${JSON.stringify({ logo_id: id, source_url: imageUrl })})
    `

    res.json({
      success: true,
      svgData: svgString,
      sourceUrl: imageUrl,
      format: 'SVG'
    })

  } catch (error) {
    console.error('❌ SVG vectorization error:', error)
    res.status(500).json({
      error: 'Failed to vectorize logo: ' + error.message
    })
  }
})

// Additional Formats Endpoint (Favicon & Profile Picture)
app.post('/api/logos/:id/formats', async (req, res) => {
  console.log('🔍 Additional formats endpoint called')

  try {
    const { id } = req.params
    const { clerkUserId, formats } = req.body

    if (!clerkUserId) {
      return res.status(400).json({ error: 'clerkUserId is required' })
    }

    if (!formats || !Array.isArray(formats)) {
      return res.status(400).json({ error: 'formats array is required' })
    }

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for additional formats' })
    }

    // Get logo from database
    await connectToDatabase()
    const { rows } = await sql`
      SELECT logo_url FROM saved_logos
      WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
    `

    if (!rows[0]) {
      return res.status(404).json({ error: 'Logo not found' })
    }

    const imageUrl = rows[0].logo_url
    console.log('🔍 Processing formats for logo:', imageUrl)

    const imageBuffer = await fetchImageBuffer(imageUrl)
    const results = {}

    // Process each requested format
    for (const format of formats) {
      try {
        switch (format) {
          case 'favicon':
            // Create favicon (32x32 PNG)
            const favicon32 = await sharp(imageBuffer)
              .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
              .png()
              .toBuffer()

            results.favicon = {
              data: favicon32.toString('base64'),
              mimeType: 'image/png',
              filename: 'favicon-32x32.png',
              size: '32x32'
            }
            break

          case 'profile':
            // Create circular profile picture
            const size = 512

            // Create circular mask
            const mask = Buffer.from(
              `<svg width="${size}" height="${size}">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
              </svg>`
            )

            const profileBuffer = await sharp(imageBuffer)
              .resize(size, size, { fit: 'cover' })
              .composite([{ input: mask, blend: 'dest-in' }])
              .png()
              .toBuffer()

            results.profile = {
              data: profileBuffer.toString('base64'),
              mimeType: 'image/png',
              filename: 'profile-picture.png',
              size: `${size}x${size}`
            }
            break

          default:
            console.warn(`Unknown format requested: ${format}`)
        }
      } catch (formatError) {
        console.error(`Error processing format ${format}:`, formatError)
        results[format] = { error: formatError.message }
      }
    }

    console.log('✅ Format processing completed')

    // Track analytics
    await sql`
      INSERT INTO usage_analytics (action, clerk_user_id, metadata)
      VALUES ('logo_formats_generated', ${clerkUserId}, ${JSON.stringify({ logo_id: id, formats: formats, source_url: imageUrl })})
    `

    res.json({
      success: true,
      formats: results,
      sourceUrl: imageUrl
    })

  } catch (error) {
    console.error('❌ Format processing error:', error)
    res.status(500).json({
      error: 'Failed to process formats: ' + error.message
    })
  }
})
