import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import * as fs from 'node:fs'
import * as path from 'path'

dotenv.config({ path: '../.env' })

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Usage tracking system
const usageData = new Map() // Store: IP -> { count: number, date: string, isPaid: boolean }
const DAILY_LIMIT = 3 // 3 generations per day for free users

// Helper function to get today's date string
const getTodayDate = () => new Date().toISOString().split('T')[0]

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.ip ||
         '127.0.0.1'
}

// Helper function to check and update usage
const checkUsageLimit = (ip) => {
  const today = getTodayDate()
  const userData = usageData.get(ip)
  
  // If user is paid, no limits
  if (userData?.isPaid) {
    return { allowed: true, remaining: 999, total: 999 }
  }
  
  // If no data or different day, reset
  if (!userData || userData.date !== today) {
    usageData.set(ip, { count: 0, date: today, isPaid: false })
    return { allowed: true, remaining: DAILY_LIMIT - 1, total: DAILY_LIMIT }
  }
  
  // Check if limit exceeded
  if (userData.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, total: DAILY_LIMIT }
  }
  
  return { allowed: true, remaining: DAILY_LIMIT - userData.count - 1, total: DAILY_LIMIT }
}

// Helper function to increment usage
const incrementUsage = (ip) => {
  const today = getTodayDate()
  const userData = usageData.get(ip) || { count: 0, date: today, isPaid: false }
  
  if (userData.date !== today) {
    userData.count = 1
    userData.date = today
  } else {
    userData.count += 1
  }
  
  usageData.set(ip, userData)
  return userData.count
}

// Create directory for generated images
const imagesDir = './generated-logos'
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

// Serve static files from generated-logos directory
app.use('/images', express.static(imagesDir))

// API endpoint to check usage limits
app.get('/api/usage', (req, res) => {
  try {
    const ip = getClientIP(req)
    const usage = checkUsageLimit(ip)
    
    console.log(`📊 Usage check for IP ${ip}: ${JSON.stringify(usage)}`)
    
    res.json({
      remaining: usage.remaining,
      total: usage.total,
      allowed: usage.allowed
    })
  } catch (error) {
    console.error('❌ Error checking usage:', error.message)
    res.status(500).json({ error: 'Failed to check usage limits' })
  }
})

// API endpoint to upgrade to paid (placeholder for payment integration)
app.post('/api/upgrade', (req, res) => {
  try {
    const ip = getClientIP(req)
    const { paymentToken } = req.body // In real implementation, verify payment here
    
    // For now, just mark as paid (replace with actual payment verification)
    const today = getTodayDate()
    const userData = usageData.get(ip) || { count: 0, date: today, isPaid: false }
    userData.isPaid = true
    usageData.set(ip, userData)
    
    console.log(`💰 User upgraded to paid: IP ${ip}`)
    
    res.json({ 
      success: true, 
      message: 'Successfully upgraded to unlimited access!',
      unlimited: true 
    })
  } catch (error) {
    console.error('❌ Error processing upgrade:', error.message)
    res.status(500).json({ error: 'Failed to process upgrade' })
  }
})

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
    const ip = getClientIP(req)

    // Check usage limits first
    const usage = checkUsageLimit(ip)
    if (!usage.allowed) {
      console.log(`🚫 Generation limit exceeded for IP ${ip}`)
      return res.status(429).json({ 
        error: 'Daily generation limit exceeded',
        limitExceeded: true,
        remaining: usage.remaining,
        total: usage.total
      })
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
    
    // Increment usage count after successful generation
    const newCount = incrementUsage(ip)
    const updatedUsage = checkUsageLimit(ip)
    
    console.log(`✅ All ${logos.length} logos generated in ${endTime - startTime}ms`)
    console.log(`📊 Usage updated for IP ${ip}: ${newCount}/${DAILY_LIMIT}`)
    console.log('📎 Logo URLs:')
    logos.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`)
    })
    
    res.json({ 
      logos,
      usage: {
        remaining: updatedUsage.remaining,
        total: updatedUsage.total,
        used: newCount
      }
    })
  } catch (error) {
    console.error('❌ Server error in /api/generate-multiple:', error.message)
    res.status(500).json({ error: 'Failed to generate logos: ' + error.message })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})