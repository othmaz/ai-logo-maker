export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const logoUrl = await callGeminiAPI(prompt)
    res.json({ logoUrl })
  } catch (error) {
    console.error('Error generating logo:', error)
    res.status(500).json({ error: 'Failed to generate logo' })
  }
}

const callGeminiAPI = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  // For now, return a placeholder URL since we need image generation, not text generation
  // This would need to be replaced with actual image generation API
  return 'https://via.placeholder.com/400x200/0066cc/ffffff?text=Logo+Generated'
}