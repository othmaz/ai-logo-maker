const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Replicate = require('replicate')
const Stripe = require('stripe')
const sharp = require('sharp')
const potrace = require('potrace')
const { put } = require('@vercel/blob')
const { connectToDatabase, sql } = require('./lib/db')
const { buildBriefedRefinementPrompts: buildServerBriefedPrompts, generateVariantPlans } = require('./lib/promptBuilder')
const { migrateFromLocalStorage } = require('./lib/migrate')
const { Resend } = require('resend')
const { optimize } = require('svgo')
const { verifyToken } = require('@clerk/backend')

dotenv.config({ path: path.join(__dirname, '.env') })       // server/.env (API keys)
dotenv.config({ path: path.join(__dirname, '../.env') })    // root .env (Clerk, fallbacks)

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

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const app = express()
const port = process.env.PORT || 3001

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
const FREE_IMAGE_SIZE = process.env.GEMINI_IMAGE_SIZE_FREE || '0.5K'
const PAID_IMAGE_SIZE = process.env.GEMINI_IMAGE_SIZE_PAID || '1K'
const MAX_ANON_INITIAL_VARIATIONS = Number(process.env.MAX_ANON_INITIAL_VARIATIONS || 3)
const MAX_ANON_REFINE_VARIATIONS = Number(process.env.MAX_ANON_REFINE_VARIATIONS || 1)

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const defaultOrigins = [
  'https://craftyourlogo.com',
  'https://www.craftyourlogo.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins])

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
}))

app.use((error, _req, res, next) => {
  if (error?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: error.message })
  }

  return next(error)
})

// Stripe webhook must come BEFORE express.json() to receive raw body
// (will be added later in the file before other routes)

// Parse JSON for all routes EXCEPT webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next()
  } else {
    express.json({ limit: '50mb' })(req, res, next)
  }
})
app.use(express.urlencoded({ limit: '50mb', extended: true }))

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim()
}

const getSubscriptionStatus = async (clerkUserId) => {
  if (!clerkUserId) return 'free'

  try {
    await connectToDatabase()
    const { rows } = await sql`
      SELECT subscription_status
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `
    return rows[0]?.subscription_status || 'free'
  } catch (error) {
    console.warn('⚠️ Failed to fetch subscription status, defaulting to free:', error?.message || error)
    return 'free'
  }
}

const resolveRequestUserContext = async (req) => {
  const token = extractBearerToken(req)
  if (!token || !process.env.CLERK_SECRET_KEY) {
    return { isAuthenticated: false, clerkUserId: null, subscriptionStatus: 'free', isPremium: false }
  }

  try {
    const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    const clerkUserId = verifiedToken.sub || verifiedToken.userId || null

    if (!clerkUserId) {
      return { isAuthenticated: false, clerkUserId: null, subscriptionStatus: 'free', isPremium: false }
    }

    const subscriptionStatus = await getSubscriptionStatus(clerkUserId)
    const isPremium = subscriptionStatus === 'premium'

    return { isAuthenticated: true, clerkUserId, subscriptionStatus, isPremium }
  } catch (error) {
    console.warn('⚠️ Failed to verify bearer token in optional auth path; treating as anonymous:', error?.message || error)
    return { isAuthenticated: false, clerkUserId: null, subscriptionStatus: 'free', isPremium: false }
  }
}

const consumeSignedUserCredits = async ({ clerkUserId, requestedCount }) => {
  const amount = Math.max(1, Number(requestedCount) || 1)

  await connectToDatabase()

  const { rows: currentRows } = await sql`
    SELECT subscription_status, credits_used, credits_limit
    FROM users
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `

  const current = currentRows[0]
  if (!current) {
    return {
      ok: false,
      reason: 'USER_NOT_FOUND',
      message: 'User profile not initialized. Please refresh and try again.',
    }
  }

  if (current.subscription_status === 'premium') {
    return { ok: true, isPremium: true, remaining: Infinity }
  }

  const { rows: updatedRows } = await sql`
    UPDATE users
    SET credits_used = credits_used + ${amount}
    WHERE clerk_user_id = ${clerkUserId}
      AND subscription_status <> 'premium'
      AND (credits_used + ${amount}) <= credits_limit
    RETURNING subscription_status, credits_used, credits_limit
  `

  if (updatedRows[0]) {
    const updated = updatedRows[0]
    return {
      ok: true,
      isPremium: updated.subscription_status === 'premium',
      remaining: Math.max(0, (updated.credits_limit || 0) - (updated.credits_used || 0)),
    }
  }

  const { rows: latestRows } = await sql`
    SELECT subscription_status, credits_used, credits_limit
    FROM users
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `

  const latest = latestRows[0]

  if (latest?.subscription_status === 'premium') {
    return { ok: true, isPremium: true, remaining: Infinity }
  }

  return {
    ok: false,
    reason: 'INSUFFICIENT_CREDITS',
    remaining: Math.max(0, (latest?.credits_limit || 0) - (latest?.credits_used || 0)),
    creditsUsed: latest?.credits_used || 0,
    creditsLimit: latest?.credits_limit || 0,
    message: 'Not enough credits for this generation request.',
  }
}

const requireAuth = async (req, res, next) => {
  try {
    if (!process.env.CLERK_SECRET_KEY) {
      return res.status(500).json({ error: 'Server auth misconfigured: CLERK_SECRET_KEY missing' })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing bearer token' })
    }

    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    const userId = verifiedToken.sub || verifiedToken.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: invalid token subject' })
    }

    req.auth = { userId }
    next()
  } catch (error) {
    console.error('❌ Auth verification failed:', error?.message || error)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

const createRateLimiter = ({ windowMs, max, name, keyFn }) => {
  const counters = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const key = keyFn(req)

    const current = counters.get(key)
    const active = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs }

    active.count += 1
    counters.set(key, active)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - active.count, 0)))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(active.resetAt / 1000)))

    if (active.count > max) {
      return res.status(429).json({
        error: `Too many requests (${name}). Please retry later.`,
      })
    }

    next()
  }
}

const generationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  name: 'generation',
  keyFn: (req) => req.ip || 'anonymous',
})

const expensiveOperationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  name: 'premium-format',
  keyFn: (req) => req.auth?.userId || req.ip || 'anonymous',
})

let ensureGenerationRequestTablePromise = null
let ensureSavedLogosEditorStateColumnPromise = null

const ensureGenerationRequestTable = async () => {
  if (ensureGenerationRequestTablePromise) {
    return ensureGenerationRequestTablePromise
  }

  ensureGenerationRequestTablePromise = (async () => {
    await connectToDatabase()
    await sql`
      CREATE TABLE IF NOT EXISTS generation_request_cache (
        request_id VARCHAR(128) PRIMARY KEY,
        actor_key VARCHAR(255) NOT NULL,
        clerk_user_id VARCHAR(255),
        generation_stage VARCHAR(32) NOT NULL DEFAULT 'initial',
        payload_hash VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        response_code INTEGER,
        response_json JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_generation_request_cache_actor_key ON generation_request_cache(actor_key)`
  })().catch((error) => {
    ensureGenerationRequestTablePromise = null
    throw error
  })

  return ensureGenerationRequestTablePromise
}

const ensureSavedLogosEditorStateColumn = async () => {
  if (ensureSavedLogosEditorStateColumnPromise) {
    return ensureSavedLogosEditorStateColumnPromise
  }

  ensureSavedLogosEditorStateColumnPromise = (async () => {
    await connectToDatabase()
    await sql`ALTER TABLE saved_logos ADD COLUMN IF NOT EXISTS editor_state JSONB`
  })().catch((error) => {
    ensureSavedLogosEditorStateColumnPromise = null
    throw error
  })

  return ensureSavedLogosEditorStateColumnPromise
}

const normalizeEditorStatePayload = (rawState) => {
  if (!rawState) return null

  let state = rawState
  if (typeof rawState === 'string') {
    try {
      state = JSON.parse(rawState)
    } catch {
      return null
    }
  }

  if (typeof state !== 'object' || Array.isArray(state)) {
    return null
  }

  try {
    const serialized = JSON.stringify(state)
    if (!serialized || serialized.length > 30000) {
      return null
    }
    return state
  } catch {
    return null
  }
}

const normalizeRequestId = (requestId) => {
  if (requestId === undefined || requestId === null) return null
  const normalized = String(requestId).trim()
  if (!normalized) return null
  return normalized.slice(0, 128)
}

const resolveActorKey = (req, clerkUserId) => {
  if (clerkUserId) {
    return `user:${clerkUserId}`
  }

  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)[0]

  const ip = forwarded || req.ip || 'anonymous'
  return `anon:${ip}`
}

const buildGenerationPayloadHash = ({ prompts, formData, brief, specCore, delta, variationCount, variantPlans, referenceImages, generationStage }) => {
  const payload = {
    prompts,
    formData,
    brief,
    specCore,
    delta,
    variationCount,
    variantPlans,
    generationStage,
    referenceImageCount: Array.isArray(referenceImages) ? referenceImages.length : 0,
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
}

const normalizeMutableOverrides = (rawOverrides) => {
  if (!rawOverrides || typeof rawOverrides !== 'object') {
    return {}
  }

  const overrides = {}

  if (typeof rawOverrides.colors === 'string' && rawOverrides.colors.trim()) {
    overrides.colors = rawOverrides.colors.trim()
  }

  if (typeof rawOverrides.backgroundValue === 'string' && rawOverrides.backgroundValue.trim()) {
    overrides.backgroundValue = rawOverrides.backgroundValue.trim()
  }

  if (typeof rawOverrides.style === 'string' && rawOverrides.style.trim()) {
    overrides.style = rawOverrides.style.trim()
  }

  if (typeof rawOverrides.colorUsageRules === 'string') {
    overrides.colorUsageRules = rawOverrides.colorUsageRules.trim()
  } else if (typeof rawOverrides.colorNotes === 'string') {
    // legacy key
    overrides.colorUsageRules = rawOverrides.colorNotes.trim()
  }

  if (typeof rawOverrides.tagline === 'string') {
    overrides.tagline = rawOverrides.tagline.trim()
  }

  if (typeof rawOverrides.hasBackground === 'boolean') {
    overrides.hasBackground = rawOverrides.hasBackground
  }

  return overrides
}

const MUTABLE_FIELDS = ['colors', 'colorUsageRules', 'style', 'hasBackground', 'backgroundValue', 'tagline']

const normalizeMutableFieldName = (field) => {
  const raw = String(field || '').trim()
  const key = raw.replace(/[-_\s]/g, '').toLowerCase()

  const aliases = {
    color: 'colors',
    colors: 'colors',
    colornotes: 'colorUsageRules',
    colorusagerules: 'colorUsageRules',
    style: 'style',
    hasbackground: 'hasBackground',
    background: 'backgroundValue',
    backgroundvalue: 'backgroundValue',
    tagline: 'tagline',
  }

  return aliases[key] || null
}

const normalizeMutableFieldValue = (field, value) => {
  const key = normalizeMutableFieldName(field)
  if (!key) return undefined

  if (key === 'hasBackground') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true
      if (['false', '0', 'no', 'off'].includes(normalized)) return false
    }
    return undefined
  }

  if (key === 'backgroundValue') {
    const normalized = String(value || '').trim()
    return normalized || 'white'
  }

  return String(value || '').trim()
}

const getMutableSnapshotFromFormData = (formData = {}) => ({
  colors: normalizeMutableFieldValue('colors', formData?.colors) || '',
  colorUsageRules: normalizeMutableFieldValue('colorUsageRules', formData?.colorUsageRules || formData?.colorNotes) || '',
  style: normalizeMutableFieldValue('style', formData?.style) || '',
  hasBackground: typeof formData?.hasBackground === 'boolean' ? formData.hasBackground : false,
  backgroundValue: normalizeMutableFieldValue('backgroundValue', formData?.backgroundValue) || 'white',
  tagline: normalizeMutableFieldValue('tagline', formData?.tagline) || '',
})

const getPreviousMutableSnapshotFromSpecCore = (specCore) => {
  if (!specCore || typeof specCore !== 'object') return null

  const snapshot = specCore?.meta?.lastFormInput?.mutable
  if (snapshot && typeof snapshot === 'object') {
    return {
      colors: normalizeMutableFieldValue('colors', snapshot.colors) || '',
      colorUsageRules: normalizeMutableFieldValue('colorUsageRules', snapshot.colorUsageRules) || '',
      style: normalizeMutableFieldValue('style', snapshot.style) || '',
      hasBackground: typeof snapshot.hasBackground === 'boolean' ? snapshot.hasBackground : false,
      backgroundValue: normalizeMutableFieldValue('backgroundValue', snapshot.backgroundValue) || 'white',
      tagline: normalizeMutableFieldValue('tagline', snapshot.tagline) || '',
    }
  }

  // Legacy fallback (older snapshots only persisted color)
  const legacyColorSnapshot = specCore?.meta?.lastFormInput?.color
  if (!legacyColorSnapshot || typeof legacyColorSnapshot !== 'object') {
    return null
  }

  return {
    colors: normalizeMutableFieldValue('colors', legacyColorSnapshot.colors) || '',
    colorUsageRules: normalizeMutableFieldValue('colorUsageRules', legacyColorSnapshot.colorUsageRules) || '',
    style: normalizeMutableFieldValue('style', specCore?.mutableDefaults?.style) || '',
    hasBackground: typeof specCore?.mutableDefaults?.hasBackground === 'boolean'
      ? specCore.mutableDefaults.hasBackground
      : false,
    backgroundValue: normalizeMutableFieldValue('backgroundValue', specCore?.mutableDefaults?.backgroundValue) || 'white',
    tagline: normalizeMutableFieldValue('tagline', specCore?.mutableDefaults?.tagline) || '',
  }
}

const getDirtyMutableFields = ({ previousSnapshot, currentSnapshot, existingSpecCore }) => {
  const dirty = new Set()

  if (previousSnapshot) {
    MUTABLE_FIELDS.forEach((field) => {
      if (previousSnapshot[field] !== currentSnapshot[field]) {
        dirty.add(field)
      }
    })
    return dirty
  }

  // Fallback for old payloads without snapshot metadata: compare against specCore defaults.
  const previousDefaults = normalizeMutableOverrides(existingSpecCore?.mutableDefaults || {})
  MUTABLE_FIELDS.forEach((field) => {
    const normalizedDefault = normalizeMutableFieldValue(field, previousDefaults[field])
    const fallbackDefault = field === 'backgroundValue'
      ? 'white'
      : (field === 'hasBackground' ? false : '')

    const previousValue = normalizedDefault == null ? fallbackDefault : normalizedDefault
    if (previousValue !== currentSnapshot[field]) {
      dirty.add(field)
    }
  })

  return dirty
}

const normalizeMutableLocks = (specCore) => {
  const sourceLocks = (specCore && typeof specCore === 'object' && specCore.mutableLocks && typeof specCore.mutableLocks === 'object')
    ? specCore.mutableLocks
    : {}

  const normalized = {}

  for (const [rawField, rawValue] of Object.entries(sourceLocks)) {
    // Legacy compatibility: mutableLocks.color = { colors, colorUsageRules }
    if (rawField === 'color' && rawValue && typeof rawValue === 'object') {
      const legacyColors = normalizeMutableFieldValue('colors', rawValue.colors)
      const legacyRules = normalizeMutableFieldValue('colorUsageRules', rawValue.colorUsageRules)
      if (legacyColors) normalized.colors = { value: legacyColors }
      if (legacyRules != null) normalized.colorUsageRules = { value: legacyRules }
      continue
    }

    const field = normalizeMutableFieldName(rawField)
    if (!field) continue

    if (rawValue && typeof rawValue === 'object' && Object.prototype.hasOwnProperty.call(rawValue, 'value')) {
      const value = normalizeMutableFieldValue(field, rawValue.value)
      if (value !== undefined) normalized[field] = { value }
      continue
    }

    const value = normalizeMutableFieldValue(field, rawValue)
    if (value !== undefined) normalized[field] = { value }
  }

  return normalized
}

const getLockedMutableValue = (locks, field) => {
  const key = normalizeMutableFieldName(field)
  if (!key || !locks || typeof locks !== 'object') return undefined
  const lockEntry = locks[key]
  if (!lockEntry || typeof lockEntry !== 'object') return undefined
  if (!Object.prototype.hasOwnProperty.call(lockEntry, 'value')) return undefined
  return normalizeMutableFieldValue(key, lockEntry.value)
}

const hasPersistentCue = (feedback = '') => {
  const text = String(feedback || '').toLowerCase()
  if (!text) return false
  return /(keep|don't\s+change|do\s+not\s+change|preserve|maintain|exact|same\s+as|leave\s+as\s+is)/i.test(text)
}

const hasTemporaryCue = (feedback = '') => {
  const text = String(feedback || '').toLowerCase()
  if (!text) return false
  return /(try|test|for\s+this\s+one|maybe|slightly|explore|version|option)/i.test(text)
}

const normalizeLogoTypeValue = (value) => {
  const normalized = String(value || '').toLowerCase().trim()
  if (['wordmark', 'lettermark', 'combination', 'pictorial', 'abstract'].includes(normalized)) {
    return normalized
  }
  return null
}

const normalizeEditScopeValue = (value) => {
  const normalized = String(value || '').toLowerCase().trim()
  if (['text_only', 'icon_only', 'both'].includes(normalized)) return normalized
  return null
}

const inferEditScope = ({ modelEditScope = null }) => {
  const explicitModelScope = normalizeEditScopeValue(modelEditScope)
  return explicitModelScope || null
}

const normalizeMutableDirectives = (input) => {
  if (!Array.isArray(input)) return []

  const directives = []

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue

    const field = normalizeMutableFieldName(raw.field)
    if (!field) continue

    const action = ['set', 'lock', 'unlock'].includes(String(raw.action || '').toLowerCase())
      ? String(raw.action).toLowerCase()
      : 'set'

    const mode = ['persistent', 'temporary'].includes(String(raw.mode || '').toLowerCase())
      ? String(raw.mode).toLowerCase()
      : 'temporary'

    const normalizedValue = normalizeMutableFieldValue(field, raw.value)

    directives.push({
      field,
      action,
      mode,
      value: normalizedValue,
      reason: typeof raw.reason === 'string' ? raw.reason.trim() : undefined,
    })
  }

  return directives
}

const resolveMutableValueForPrompt = ({ field, formSnapshot, formDirtyFields, locks, incomingSpecCore }) => {
  if (formDirtyFields.has(field)) {
    return formSnapshot[field]
  }

  const lockedValue = getLockedMutableValue(locks, field)
  if (lockedValue !== undefined) {
    return lockedValue
  }

  if (incomingSpecCore && incomingSpecCore.mutableDefaults && Object.prototype.hasOwnProperty.call(incomingSpecCore.mutableDefaults, field)) {
    const normalized = normalizeMutableFieldValue(field, incomingSpecCore.mutableDefaults[field])
    if (normalized !== undefined) {
      return normalized
    }
  }

  return formSnapshot[field]
}

const buildSpecCoreFromInput = ({ formData, existingSpecCore }) => {
  const baseline = {
    version: 1,
    brand: {
      businessName: formData.businessName || '',
      industry: formData.industry || '',
      description: formData.description || '',
    },
    immutable: {
      logoType: formData.logoType,
      taglinePolicy: formData.tagline ? 'with_tagline' : 'no_tagline',
      textRule: formData.logoType,
    },
    mutableDefaults: {
      colors: formData.colors || '',
      colorUsageRules: formData.colorUsageRules || formData.colorNotes || '',
      backgroundValue: formData.backgroundValue || 'white',
      hasBackground: Boolean(formData.hasBackground),
      style: formData.style || '',
      tagline: formData.tagline || '',
    },
  }

  if (!existingSpecCore || typeof existingSpecCore !== 'object') {
    return baseline
  }

  return {
    ...(existingSpecCore || {}),
    ...baseline,
    version: Number(existingSpecCore.version) || baseline.version,
    brand: {
      ...(existingSpecCore.brand || {}),
      ...baseline.brand,
    },
    immutable: {
      ...(existingSpecCore.immutable || {}),
      ...baseline.immutable,
    },
    mutableDefaults: {
      ...baseline.mutableDefaults,
      ...(existingSpecCore.mutableDefaults || {}),
    },
  }
}

const applyMutableOverridesToSpecCore = (specCore, rawOverrides) => {
  if (!specCore || typeof specCore !== 'object') return specCore

  const overrides = normalizeMutableOverrides(rawOverrides)
  if (!Object.keys(overrides).length) return specCore

  return {
    ...specCore,
    mutableDefaults: {
      ...(specCore.mutableDefaults || {}),
      ...overrides,
    },
  }
}

const buildDeltaFromBrief = ({ brief, mutableOverrides, roundHints = [] }) => {
  const overrideKeys = Object.keys(mutableOverrides || {})

  return {
    preserve: Array.isArray(brief?.preserve) ? brief.preserve : [],
    change: [
      ...(brief?.new_direction ? [brief.new_direction] : []),
      ...overrideKeys.map((key) => `override:${key}`),
    ],
    remove: [],
    overrides: mutableOverrides,
    roundHints,
  }
}

const applyMutableOverridesToFormData = (formData, rawOverrides) => {
  const overrides = normalizeMutableOverrides(rawOverrides)
  if (!Object.keys(overrides).length) {
    return formData
  }

  const next = { ...formData }

  if (overrides.colors) {
    next.colors = overrides.colors
  }

  if (overrides.style) {
    next.style = overrides.style
  }

  if (Object.prototype.hasOwnProperty.call(overrides, 'colorUsageRules')) {
    next.colorUsageRules = overrides.colorUsageRules || undefined
  }

  if (Object.prototype.hasOwnProperty.call(overrides, 'tagline')) {
    next.tagline = overrides.tagline || undefined
  }

  if (overrides.backgroundValue) {
    next.backgroundValue = overrides.backgroundValue
    next.hasBackground = !['none', 'transparent'].includes(overrides.backgroundValue)
  }

  if (typeof overrides.hasBackground === 'boolean') {
    next.hasBackground = overrides.hasBackground
  }

  return next
}

const finalizeGenerationRequest = async ({ requestId, status, responseCode, responsePayload }) => {
  if (!requestId) return

  await sql`
    UPDATE generation_request_cache
    SET status = ${status},
        response_code = ${responseCode},
        response_json = ${JSON.stringify(responsePayload)}::jsonb,
        updated_at = NOW()
    WHERE request_id = ${requestId}
  `
}

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

// Polygonal SVG Generator - Creates geometric/low-poly style vectorization
async function createPolygonalSVG(pixelData, width, height) {
  console.log('🔺 Creating polygonal SVG...')

  // Sample grid size - controls polygon density (smaller = more detail, larger = more geometric)
  const gridSize = 8

  // Extract color regions using grid sampling
  const colorRegions = []

  for (let y = 0; y < height; y += gridSize) {
    for (let x = 0; x < width; x += gridSize) {
      const idx = (y * width + x) * 4
      const r = pixelData[idx]
      const g = pixelData[idx + 1]
      const b = pixelData[idx + 2]
      const a = pixelData[idx + 3]

      // Skip transparent pixels
      if (a < 128) continue

      // Create color hex
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

      colorRegions.push({ x, y, color, r, g, b })
    }
  }

  // Group similar colors together
  const colorGroups = {}
  colorRegions.forEach(region => {
    // Quantize colors to reduce total number
    const qR = Math.round(region.r / 32) * 32
    const qG = Math.round(region.g / 32) * 32
    const qB = Math.round(region.b / 32) * 32
    const key = `${qR}-${qG}-${qB}`

    if (!colorGroups[key]) {
      colorGroups[key] = {
        color: `rgb(${qR},${qG},${qB})`,
        points: []
      }
    }
    colorGroups[key].points.push({ x: region.x, y: region.y })
  })

  // Build SVG with polygonal shapes
  let svgPaths = ''

  Object.values(colorGroups).forEach(group => {
    if (group.points.length < 3) return // Need at least 3 points for polygon

    // Create convex hull or simplified polygon from points
    const polygon = createPolygonFromPoints(group.points, gridSize)
    svgPaths += `  <path d="${polygon}" fill="${group.color}" />\n`
  })

  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${svgPaths}</svg>`

  console.log('✅ Polygonal SVG created')
  return svg
}

// Create polygon path from a set of points
function createPolygonFromPoints(points, gridSize) {
  if (points.length === 0) return ''

  // Sort points to create a reasonable polygon shape
  // Use a simple approach: sort by angle from center
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

  const sortedPoints = points
    .map(p => ({
      ...p,
      angle: Math.atan2(p.y - centerY, p.x - centerX)
    }))
    .sort((a, b) => a.angle - b.angle)

  // Create rectangular blocks for a more geometric look
  const rects = []
  sortedPoints.forEach(p => {
    rects.push(`M${p.x},${p.y} L${p.x + gridSize},${p.y} L${p.x + gridSize},${p.y + gridSize} L${p.x},${p.y + gridSize} Z`)
  })

  return rects.join(' ')
}


const callGeminiAPI = async (prompt, referenceImages = [], generationProfile = 'free') => {
  const apiKey = process.env.GEMINI_API_KEY
  const imageSize = generationProfile === 'paid' ? PAID_IMAGE_SIZE : FREE_IMAGE_SIZE
  const maxAttempts = Math.max(1, Number(process.env.GEMINI_MAX_RETRIES || 2) + 1)
  const baseRetryMs = Math.max(200, Number(process.env.GEMINI_RETRY_BASE_MS || 800))

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const retryableStatusCodes = new Set([408, 409, 425, 429, 500, 502, 503, 504])

  const isRetryableError = (error) => {
    const status = Number(error?.status || 0)
    if (retryableStatusCodes.has(status)) return true

    const message = String(error?.message || '')
    const causeCode = String(error?.cause?.code || '')
    const merged = `${message} ${causeCode}`

    return /fetch failed|timeout|timed out|econnreset|und_err|socket|network/i.test(merged)
  }

  console.log('🔑 API Key status:', apiKey ? `Present (${apiKey.length} chars)` : 'MISSING')

  if (!apiKey) {
    console.warn('❌ GEMINI_API_KEY not set, using placeholder image')
    return generateEnhancedPlaceholder(prompt)
  }

  console.log('🔄 Initializing Gemini client...')
  const ai = new GoogleGenAI({ apiKey: apiKey })

  // Use the prompt exactly as-is from the client - NO server modifications
  // Client handles ALL instructions including refinement
  const enhancedPrompt = prompt

  if (referenceImages && referenceImages.length > 0) {
    console.log('🎯 Refinement mode detected (reference images present)')
  }

  console.log('🚀 Attempting to generate logo with Gemini API...')
  console.log('📝 Prompt:', enhancedPrompt.substring(0, 100) + '...')

  let contents

  // Construct contents array with text + all selected reference images
  if (referenceImages && referenceImages.length > 0) {
    console.log(`🖼️ Using multimodal refinement with ${referenceImages.length} reference image(s)`)

    const imageParts = referenceImages
      .filter((image) => image?.data)
      .map((image) => ({
        inlineData: {
          mimeType: image.mimeType || 'image/png',
          data: image.data,
        },
      }))

    contents = [{ text: enhancedPrompt }, ...imageParts]
    console.log('📝 Sending to Gemini: text + all reference images')
  } else {
    contents = enhancedPrompt
    console.log('📝 Sending to Gemini: text-only prompt')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📡 Calling ai.models.generateContent() (attempt ${attempt}/${maxAttempts})...`)
      console.log(`🎛️ Generation profile: ${generationProfile} | imageSize=${imageSize} | model=${GEMINI_IMAGE_MODEL}`)

      const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: contents,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: '1:1',
            imageSize,
          },
        }
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
      const parts = response?.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if (part.inlineData) {
          console.log('✅ Found image data in response!')
          const imageData = part.inlineData.data
          const buffer = Buffer.from(imageData, 'base64')

          const outputBuffer = buffer
          try {
            const meta = await sharp(buffer).metadata()
            if (meta.width && meta.height && meta.width !== meta.height) {
              console.log(`📐 Gemini returned non-square output ${meta.width}x${meta.height}; preserving original ratio`)
            }
          } catch (normalizationError) {
            console.warn('⚠️ Could not inspect generated image dimensions:', normalizationError.message)
          }

          // Optional: persist generated outputs to Blob.
          // Default is OFF so only liked/final logos get persisted (via /api/logos/save).
          const persistGeneratedToBlob = process.env.PERSIST_GENERATED_LOGOS_TO_BLOB === 'true'
          if (persistGeneratedToBlob && process.env.BLOB_READ_WRITE_TOKEN) {
            try {
              const timestamp = Date.now()
              const filename = `generated/logo-${timestamp}.png`

              console.log(`📤 Uploading generated logo to Vercel Blob: ${filename}`)
              const blob = await put(filename, outputBuffer, {
                access: 'public',
                contentType: 'image/png',
                addRandomSuffix: false,
              })

              console.log(`✅ Generated logo uploaded to Vercel Blob: ${blob.url}`)
              return blob.url
            } catch (blobError) {
              console.warn('⚠️ Generated Blob upload failed:', blobError.message)
              console.log('💾 Falling back to data URL')
            }
          }

          // Default path: return data URL (ephemeral) and persist only when user likes/saves.
          if (!persistGeneratedToBlob) {
            console.log('💾 Using base64 data URL (generated persistence disabled; liked logos are persisted on save)')
          } else {
            console.log('💾 Using base64 data URL (Blob token missing or upload failed)')
          }
          return `data:image/png;base64,${outputBuffer.toString('base64')}`
        }
      }

      const canRetryNoImage = attempt < maxAttempts
      console.warn(`⚠️ No image data in Gemini response (attempt ${attempt}/${maxAttempts})`)
      console.log('📄 Response content:', JSON.stringify(response.candidates?.[0]?.content, null, 2))

      if (canRetryNoImage) {
        const backoffMs = baseRetryMs * Math.pow(2, attempt - 1)
        console.log(`🔁 Retrying Gemini call after ${backoffMs}ms (no-image-data)`)
        await wait(backoffMs)
        continue
      }

      console.log('❌ No image data received after retries, using placeholder')
      return generateEnhancedPlaceholder(prompt, 'no-image-data')
    } catch (error) {
      console.error(`Gemini API Error (attempt ${attempt}/${maxAttempts}):`, error.status || error.message)
      console.error('Full error details:', error)

      const shouldRetry = attempt < maxAttempts && isRetryableError(error)
      if (shouldRetry) {
        const backoffMs = baseRetryMs * Math.pow(2, attempt - 1)
        console.log(`🔁 Retrying Gemini call after ${backoffMs}ms due to retryable error`)
        await wait(backoffMs)
        continue
      }

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

  // Defensive fallback (should not normally be reached)
  return generateEnhancedPlaceholder(prompt, 'api-error')
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-logo-maker-api' })
})

// ── DIRECTOR AGENT ────────────────────────────────────────────────────────────
// Phase 1: Interprets user intent + feedback → structured design brief
// Used by client before calling /api/generate-multiple on refinements
app.post('/api/interpret-brief', async (req, res) => {
  const {
    formData,
    feedback,
    refineHistory = [],
    specCore: incomingSpecCore = null,
    delta: incomingDelta = null,
    variationCount: rawVariationCount = null,
    referenceImages = [],
    referenceContext = null,
  } = req.body

  if (!formData) {
    return res.status(400).json({ error: 'formData is required' })
  }

  // feedback can be empty string (first generation)
  if (typeof feedback !== 'string') {
    return res.status(400).json({ error: 'feedback must be a string' })
  }

  const variationCount = rawVariationCount == null ? 1 : Number(rawVariationCount)
  if (![1, 3, 5].includes(variationCount)) {
    return res.status(400).json({ error: 'variationCount must be one of: 1, 3, 5' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const systemInstruction = `You are a Logo Director. Convert user intent into a strict design brief JSON.

INPUT FIELDS:
- businessName
- industry
- description
- logoType (wordmark|lettermark|combination|pictorial|abstract)
- style
- colors
- hasBackground
- feedback (latest)
- refineHistory (oldest→newest)
- referenceImages (optional uploaded logo references)
- referenceContext (selection state metadata from client)

RULES:
1) Output VALID JSON only.
2) Keep brand_essence grounded in businessName + industry + description only (no invention).
3) Mood must be 2-3 plain adjectives (no jargon).
4) Preserve hard constraints explicitly in preserve/avoid.
5) Prefer latest feedback over older history unless directly conflicting.
6) Keep new_direction to one sentence.
7) Add must_change as an array of concrete edits that must be visibly applied this round.
8) visual_metaphors must be [] unless user explicitly asks for concrete metaphors.
9) reference_role mapping:
   - reject: user hates prior result or asks to restart
   - preserve: minor tweaks
   - context: normal iteration
10) Distinguish edit scope when user intent is explicit:
   - text_only: user wants typography/text changes while icon/symbol stays fixed
   - icon_only: user wants icon/symbol changes while text/typography stays fixed
   - both: both icon and text may evolve

LOGO TYPE RULES:
- wordmark: full business name text only; no icon/symbol
- lettermark: initials/monogram only; no full business name; no standalone icon
- combination: icon/symbol + readable business name together
- pictorial: symbol/icon only; zero text
- abstract: non-literal abstract symbol only; zero text

BACKGROUND:
- If hasBackground=false, preserve "transparent/no background".

OUTPUT JSON SCHEMA:
{
  "brand_essence": "string",
  "mood": ["string", "string"],
  "preserve": ["string"],
  "avoid": ["string"],
  "new_direction": "string",
  "must_change": ["string"],
  "typography_intent": "string or null",
  "visual_metaphors": [],
  "composition": "string or null",
  "reference_role": "preserve | context | reject",
  "edit_scope": "text_only | icon_only | both",
  "reference_target": "current_selection | previous_selected | explicit_round | uploaded_anchor | latest_round | none",
  "reference_round": "number|null (1-based round index when reference_target=explicit_round)",
  "reference_logo": "number|null (1-based logo index inside that round, optional)",
  "detected_logo_type": "wordmark | lettermark | combination | pictorial | abstract | null",
  "mutable_overrides": {
    "colors": "string (optional)",
    "colorUsageRules": "string (optional)",
    "backgroundValue": "string (optional)",
    "style": "string (optional)",
    "tagline": "string (optional)",
    "hasBackground": "boolean (optional)"
  },
  "mutable_directives": [
    {
      "field": "colors|colorUsageRules|style|backgroundValue|hasBackground|tagline",
      "action": "set|lock|unlock",
      "mode": "persistent|temporary",
      "value": "string|boolean (optional)",
      "reason": "short optional reason"
    }
  ]
}

IMPORTANT:
- Keep immutable brand identity stable.
- Latest explicit mutable user instruction wins over older history.
- must_change must include concrete visible edits requested in latest feedback (e.g., tighter kerning, taller letters).
- If latest feedback asks for change, do not leave must_change empty.
- Set edit_scope=text_only when user explicitly says keep icon/symbol unchanged and change text/typography only.
- Set edit_scope=icon_only when user explicitly says keep text/wording unchanged and change icon/symbol only.
- reference_target intent mapping:
  - "same as before", "same logo as before", "iterate on previous selected" => previous_selected
  - explicit "round X" (or "first/second round") => explicit_round with reference_round set
  - explicit "logo N" with round mention => set reference_logo too
  - "selected logo(s)" in current round => current_selection
  - uploaded logo edit mode => uploaded_anchor
  - restart/new direction with no anchor intent => none
- When referenceImages are provided, infer detected_logo_type from the uploaded logo visual structure. Keep null only if uncertain.
- Use mutable_directives for intent classification:
  - keep/exact/preserve/don't change => action: lock, mode: persistent
  - try/test/maybe/slightly/for this one => action: set, mode: temporary
  - explicit change requests meant to persist => action: set, mode: persistent
  - explicit unlock/open to change => action: unlock, mode: persistent
- Keep mutable_overrides filled with this-round values (for generation); do not rely on it alone for persistence semantics.`

  const historyBlock = refineHistory.length > 0
    ? refineHistory.map((f, i) => `Round ${i + 1}: "${f}"`).join('\n')
    : 'None yet.'

  const logoTypeMeta = {
    wordmark: 'text-only logo (full business name as typography)',
    lettermark: 'initials/monogram logo (letters only)',
    combination: 'icon + business name combined lockup',
    pictorial: 'icon/symbol-only logo (no text)',
    abstract: 'abstract non-literal symbol (no text)'
  }

  const logoTypeNote = logoTypeMeta[formData.logoType] || 'custom logo type'

  const currentFormMutableSnapshot = getMutableSnapshotFromFormData(formData)
  const previousFormMutableSnapshot = getPreviousMutableSnapshotFromSpecCore(incomingSpecCore)
  const formDirtyFields = getDirtyMutableFields({
    previousSnapshot: previousFormMutableSnapshot,
    currentSnapshot: currentFormMutableSnapshot,
    existingSpecCore: incomingSpecCore,
  })

  const existingLocks = normalizeMutableLocks(incomingSpecCore)

  const effectiveMutableForPrompt = {
    colors: resolveMutableValueForPrompt({
      field: 'colors',
      formSnapshot: currentFormMutableSnapshot,
      formDirtyFields,
      locks: existingLocks,
      incomingSpecCore,
    }) || '',
    colorUsageRules: resolveMutableValueForPrompt({
      field: 'colorUsageRules',
      formSnapshot: currentFormMutableSnapshot,
      formDirtyFields,
      locks: existingLocks,
      incomingSpecCore,
    }) || '',
    style: resolveMutableValueForPrompt({
      field: 'style',
      formSnapshot: currentFormMutableSnapshot,
      formDirtyFields,
      locks: existingLocks,
      incomingSpecCore,
    }) || 'Not specified',
    hasBackground: (() => {
      const resolved = resolveMutableValueForPrompt({
        field: 'hasBackground',
        formSnapshot: currentFormMutableSnapshot,
        formDirtyFields,
        locks: existingLocks,
        incomingSpecCore,
      })
      return typeof resolved === 'boolean' ? resolved : false
    })(),
    backgroundValue: resolveMutableValueForPrompt({
      field: 'backgroundValue',
      formSnapshot: currentFormMutableSnapshot,
      formDirtyFields,
      locks: existingLocks,
      incomingSpecCore,
    }) || 'white',
    tagline: resolveMutableValueForPrompt({
      field: 'tagline',
      formSnapshot: currentFormMutableSnapshot,
      formDirtyFields,
      locks: existingLocks,
      incomingSpecCore,
    }) || '',
  }

  const userPrompt = `Client brief:
- Business name: ${formData.businessName}
- Industry: ${formData.industry || 'Not specified'}
- Description: ${formData.description || 'Not specified'}
- Logo type: ${formData.logoType} (${logoTypeNote})
- Style: ${effectiveMutableForPrompt.style}
- Colors: ${effectiveMutableForPrompt.colors || 'No fixed color selected'}
- Color usage rules: ${effectiveMutableForPrompt.colorUsageRules || 'None'}
- Background: ${effectiveMutableForPrompt.hasBackground ? `background allowed (${effectiveMutableForPrompt.backgroundValue})` : 'transparent/no background'}
- Tagline: ${effectiveMutableForPrompt.tagline || 'None'}

Mutable fields edited in form this round: ${Array.from(formDirtyFields).join(', ') || 'none'}
Active locks from memory: ${Object.keys(existingLocks).join(', ') || 'none'}

Feedback history (oldest to newest):
${historyBlock}

Current round feedback: "${feedback.trim()}"
Requested variants this round: ${variationCount}

Existing specCore (if any): ${incomingSpecCore ? JSON.stringify(incomingSpecCore) : 'none'}
Previous delta (if any): ${incomingDelta ? JSON.stringify(incomingDelta) : 'none'}
Uploaded reference images in this request: ${Array.isArray(referenceImages) ? referenceImages.length : 0}
Reference context metadata: ${referenceContext ? JSON.stringify(referenceContext) : 'none'}

Produce the structured design brief JSON now.`

  console.log('📋 User prompt to Gemini:')
  console.log(userPrompt.split('\n').map(l => '   ' + l).join('\n'))

  try {
    const ai = new GoogleGenAI({ apiKey })

    console.log('\n' + '═'.repeat(60))
    console.log('🎨  DIRECTOR AGENT  ·  gemini-3-flash-preview')
    console.log('═'.repeat(60))
    console.log(`   Business   : ${formData.businessName}`)
    console.log(`   Logo Type  : ${formData.logoType} ← THIS IS WHAT USER SELECTED`)
    console.log(`   Industry   : ${formData.industry || '—'}`)
    console.log(`   Feedback   : "${feedback.trim()}"`)
    console.log(`   History    : ${refineHistory.length} prior round(s)`)
    console.log(`   Refs       : ${Array.isArray(referenceImages) ? referenceImages.length : 0} uploaded image(s)`)
    console.log('─'.repeat(60))

    const directorImageParts = Array.isArray(referenceImages)
      ? referenceImages
        .filter((image) => image?.data)
        .map((image) => ({
          inlineData: {
            mimeType: image.mimeType || 'image/png',
            data: image.data,
          },
        }))
      : []

    const directorContents = directorImageParts.length > 0
      ? [{ text: userPrompt }, ...directorImageParts]
      : userPrompt

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: directorContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
      }
    })

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text?.() || ''
    let brief
    try {
      brief = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        brief = JSON.parse(match[0])
      } else {
        throw new Error('Could not parse JSON from Director Agent response')
      }
    }

    const normalizedReferenceRole = ['preserve', 'context', 'reject'].includes(brief?.reference_role)
      ? brief.reference_role
      : 'context'

    const normalizedMustChange = Array.isArray(brief?.must_change)
      ? brief.must_change.map((item) => String(item || '').trim()).filter(Boolean)
      : []

    const normalizedEditScope = inferEditScope({
      feedback,
      description: formData?.description,
      modelEditScope: brief?.edit_scope || brief?.editScope,
    })

    const normalizePositiveIntOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null
      const n = Number(value)
      if (!Number.isFinite(n) || n < 1) return null
      return Math.floor(n)
    }

    const normalizeReferenceTarget = (value) => {
      const normalized = String(value || '').toLowerCase()
      return ['current_selection', 'previous_selected', 'explicit_round', 'uploaded_anchor', 'latest_round', 'none'].includes(normalized)
        ? normalized
        : null
    }

    const normalizedReferenceTarget = normalizeReferenceTarget(
      brief?.reference_target || brief?.referenceTarget
    ) || (normalizedReferenceRole === 'reject' ? 'none' : 'current_selection')

    const normalizedReferenceRound = normalizePositiveIntOrNull(
      brief?.reference_round ?? brief?.referenceRound
    )

    const normalizedReferenceLogo = normalizePositiveIntOrNull(
      brief?.reference_logo ?? brief?.referenceLogo
    )

    const normalizedDetectedLogoType = normalizeLogoTypeValue(
      brief?.detected_logo_type || brief?.detectedLogoType
    )

    const legacyMutableOverrides = normalizeMutableOverrides(
      brief?.mutable_overrides || brief?.delta?.overrides || brief?.overrides
    )

    const mutableDirectives = normalizeMutableDirectives(
      brief?.mutable_directives || brief?.directives || brief?.instructions
    )

    const feedbackIsPersistent = hasPersistentCue(feedback)
    const feedbackIsTemporary = hasTemporaryCue(feedback)
    const fallbackPersistentMode = feedbackIsPersistent && !feedbackIsTemporary

    const persistentOverrides = {}
    const temporaryOverrides = {}
    const roundHints = []
    const nextMutableLocks = { ...existingLocks }

    // Rule: if user changed a form field this round, form wins and stale lock is cleared.
    formDirtyFields.forEach((field) => {
      if (nextMutableLocks[field]) {
        delete nextMutableLocks[field]
        console.log(`🎛️ Clearing lock for ${field} because form changed explicitly this round`)
      }
    })

    const applyDirective = (directive) => {
      const { field, action, mode, value, reason } = directive
      if (!field) return

      if (action === 'unlock') {
        if (nextMutableLocks[field]) {
          delete nextMutableLocks[field]
        }
        return
      }

      if (action === 'set') {
        if (value === undefined) return

        if (mode === 'persistent') {
          persistentOverrides[field] = value
        } else {
          temporaryOverrides[field] = value
          roundHints.push({ field, action: 'set', value, reason: reason || 'temporary exploration' })
        }
        return
      }

      if (action === 'lock') {
        const lockValue = value !== undefined
          ? value
          : (
            Object.prototype.hasOwnProperty.call(persistentOverrides, field)
              ? persistentOverrides[field]
              : (
                Object.prototype.hasOwnProperty.call(temporaryOverrides, field)
                  ? temporaryOverrides[field]
                  : resolveMutableValueForPrompt({
                    field,
                    formSnapshot: currentFormMutableSnapshot,
                    formDirtyFields,
                    locks: nextMutableLocks,
                    incomingSpecCore,
                  })
              )
          )

        if (lockValue !== undefined) {
          nextMutableLocks[field] = { value: lockValue }
        }

        if (mode === 'persistent' && value !== undefined) {
          persistentOverrides[field] = value
        }

        if (mode === 'temporary' && value !== undefined) {
          temporaryOverrides[field] = value
          roundHints.push({ field, action: 'lock', value, reason: reason || 'temporary lock for this round' })
        }
      }
    }

    if (mutableDirectives.length) {
      mutableDirectives.forEach(applyDirective)
    } else if (Object.keys(legacyMutableOverrides).length) {
      // Fallback when model doesn't return directives.
      for (const [field, value] of Object.entries(legacyMutableOverrides)) {
        if (fallbackPersistentMode) {
          persistentOverrides[field] = value
          if (feedbackIsPersistent) {
            nextMutableLocks[field] = { value }
          }
        } else {
          temporaryOverrides[field] = value
          roundHints.push({ field, action: 'set', value, reason: 'legacy override treated as temporary' })
        }
      }
    }

    let specCore = buildSpecCoreFromInput({
      formData,
      existingSpecCore: incomingSpecCore || brief?.spec_core || null,
    })

    const nextMutableDefaults = {
      ...(specCore.mutableDefaults || {}),
    }

    // Rule: formData beats specCore only for fields explicitly edited this round.
    formDirtyFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(currentFormMutableSnapshot, field)) {
        nextMutableDefaults[field] = currentFormMutableSnapshot[field]
      }
    })

    Object.entries(persistentOverrides).forEach(([field, value]) => {
      nextMutableDefaults[field] = value
      if (nextMutableLocks[field]) {
        nextMutableLocks[field] = { value }
      }
    })

    const mergedMutableOverrides = {
      ...persistentOverrides,
      ...temporaryOverrides,
    }

    const priorMeta = (incomingSpecCore && typeof incomingSpecCore === 'object' && incomingSpecCore.meta && typeof incomingSpecCore.meta === 'object')
      ? incomingSpecCore.meta
      : {}

    specCore = {
      ...specCore,
      mutableDefaults: nextMutableDefaults,
      mutableLocks: nextMutableLocks,
      meta: {
        ...priorMeta,
        lastFormInput: {
          ...(priorMeta.lastFormInput || {}),
          mutable: currentFormMutableSnapshot,
          color: {
            colors: currentFormMutableSnapshot.colors,
            colorUsageRules: currentFormMutableSnapshot.colorUsageRules,
          },
        },
      },
    }

    const delta = buildDeltaFromBrief({
      brief,
      mutableOverrides: mergedMutableOverrides,
      roundHints,
    })

    const variantPlans = generateVariantPlans({
      logoType: normalizedDetectedLogoType || formData.logoType,
      count: variationCount,
      seedText: [
        formData.businessName,
        formData.industry,
        brief?.brand_essence,
        brief?.new_direction,
        feedback,
      ].filter(Boolean).join('|'),
    })

    const normalizedBrief = {
      ...brief,
      reference_role: normalizedReferenceRole,
      edit_scope: normalizedEditScope || undefined,
      reference_target: normalizedReferenceTarget,
      reference_round: normalizedReferenceTarget === 'explicit_round' ? normalizedReferenceRound : null,
      reference_logo: normalizedReferenceTarget === 'explicit_round' ? normalizedReferenceLogo : null,
      detected_logo_type: normalizedDetectedLogoType || undefined,
      must_change: normalizedMustChange,
      mutable_overrides: mergedMutableOverrides,
      mutable_directives: mutableDirectives,
      round_hints: roundHints,
      spec_core: specCore,
      delta,
      variant_plans: variantPlans,
    }

    console.log('✅  BRIEF PRODUCED:')
    console.log(`   Essence  : ${normalizedBrief.brand_essence}`)
    console.log(`   Mood     : ${(normalizedBrief.mood || []).join(', ')}`)
    console.log(`   Preserve : ${(normalizedBrief.preserve || []).join(', ') || '—'}`)
    console.log(`   Avoid    : ${(normalizedBrief.avoid || []).join(', ') || '—'}`)
    console.log(`   Direction: ${normalizedBrief.new_direction}`)
    console.log(`   MustChange: ${(normalizedBrief.must_change || []).join(' | ') || '—'}`)
    console.log(`   EditScope: ${normalizedBrief.edit_scope || 'both/unspecified'}`)
    console.log(`   Detected : ${normalizedBrief.detected_logo_type || 'unknown'}`)
    console.log(`   Metaphors: ${(normalizedBrief.visual_metaphors || []).join(', ') || '—'}`)
    console.log(`   Reference: ${normalizedReferenceRole} (${{ preserve: 'keep base', context: 'use as context', reject: 'ignore' }[normalizedReferenceRole]})`)
    console.log(`   RefTarget: ${normalizedReferenceTarget}${normalizedReferenceTarget === 'explicit_round' ? ` (round=${normalizedReferenceRound || 'n/a'}, logo=${normalizedReferenceLogo || 'auto'})` : ''}`)
    console.log(`   Overrides: ${Object.keys(mergedMutableOverrides).length ? JSON.stringify(mergedMutableOverrides) : 'none'}`)
    console.log(`   Locks    : ${Object.keys(specCore.mutableLocks || {}).length ? JSON.stringify(specCore.mutableLocks) : 'none'}`)
    console.log(`   Hints    : ${roundHints.length ? JSON.stringify(roundHints) : 'none'}`)
    console.log(`   Variants : ${variantPlans.length} structural plan(s)`)
    console.log('═'.repeat(60) + '\n')

    res.json({
      brief: normalizedBrief,
      specCore,
      delta,
      roundHints,
      referenceRole: normalizedReferenceRole,
      referenceTarget: normalizedReferenceTarget,
      referenceRound: normalizedReferenceTarget === 'explicit_round' ? normalizedReferenceRound : null,
      referenceLogo: normalizedReferenceTarget === 'explicit_round' ? normalizedReferenceLogo : null,
      editScope: normalizedEditScope || null,
      detectedLogoType: normalizedDetectedLogoType || null,
      variantPlans,
    })

  } catch (err) {
    console.error('❌ Director Agent error:', err.message)
    res.status(500).json({ error: 'Failed to interpret brief: ' + err.message })
  }
})

// Simple logo generation endpoint - NO IP TRACKING
app.post('/api/generate-multiple', generationLimiter, async (req, res) => {
  console.log('📨 Received multiple logo generation request')
  console.log('📦 Request body keys:', Object.keys(req.body || {}))
  console.log('📏 Request body size:', JSON.stringify(req.body || {}).length, 'characters')

  let requestId = null
  let reservedIdempotencySlot = false

  try {
    const {
      prompts: clientProposedPrompts,
      formData,
      brief,
      specCore,
      delta,
      variationCount: rawVariationCount,
      variantPlans: rawVariantPlans,
      variant_plans: rawVariantPlansSnake,
      referenceImages,
      generationStage = 'initial',
      requestId: rawRequestId,
      request_id: rawRequestIdSnake,
    } = req.body || {}

    requestId = normalizeRequestId(rawRequestId || rawRequestIdSnake)

    // DEBUG: Check if referenceImages are present
    console.log('🔍 DEBUG: referenceImages present?', !!referenceImages)
    console.log('🔍 DEBUG: referenceImages type:', typeof referenceImages)
    console.log('🔍 DEBUG: referenceImages length:', referenceImages ? referenceImages.length : 'undefined')
    if (referenceImages) {
      console.log('🔍 DEBUG: First image keys:', Object.keys(referenceImages[0] || {}))
    }

    let prompts = Array.isArray(clientProposedPrompts) ? clientProposedPrompts : null
    let promptSource = 'client'
    let normalizedVariantPlans = Array.isArray(rawVariantPlans)
      ? rawVariantPlans
      : (Array.isArray(rawVariantPlansSnake) ? rawVariantPlansSnake : null)

    if (formData && brief) {
      const variationCountRaw = rawVariationCount ?? (Array.isArray(clientProposedPrompts) ? clientProposedPrompts.length : null)
      const variationCount = Number(variationCountRaw)

      if (![1, 3, 5].includes(variationCount)) {
        return res.status(400).json({
          error: 'variationCount must be one of: 1, 3, 5 when formData+brief are provided',
          code: 'INVALID_VARIATION_COUNT',
        })
      }

      const mutableOverrides = normalizeMutableOverrides(
        (delta && delta.overrides)
        || (brief && brief.delta && brief.delta.overrides)
        || (brief && brief.mutable_overrides)
      )

      let effectiveFormData = applyMutableOverridesToFormData(formData, mutableOverrides)
      if (Object.keys(mutableOverrides).length) {
        console.log(`🎛️ Applying mutable overrides before prompt compilation: ${JSON.stringify(mutableOverrides)}`)
      }

      const referenceSourcesForGeneration = Array.isArray(referenceImages)
        ? Array.from(new Set(referenceImages
          .map((img) => String(img?.source || '').toLowerCase())
          .filter(Boolean)))
        : []

      const hasUploadedAnchorRefsInRequest = referenceSourcesForGeneration.includes('uploaded')
        || (generationStage === 'initial' && Array.isArray(referenceImages) && referenceImages.length > 0)

      const generationIntentText = [
        String(brief?.new_direction || ''),
        Array.isArray(brief?.must_change) ? brief.must_change.join(' ') : '',
        String(formData?.description || ''),
      ].join(' ').trim()

      const inferredEditScopeForGeneration = inferEditScope({
        feedback: generationIntentText,
        description: formData?.description,
        modelEditScope: brief?.edit_scope || brief?.editScope,
      })

      const detectedLogoTypeForGeneration = normalizeLogoTypeValue(
        brief?.detected_logo_type || brief?.detectedLogoType
      )

      const effectiveBrief = (inferredEditScopeForGeneration && !brief?.edit_scope && !brief?.editScope)
        ? { ...brief, edit_scope: inferredEditScopeForGeneration }
        : brief

      if (
        hasUploadedAnchorRefsInRequest
        && detectedLogoTypeForGeneration
        && effectiveFormData.logoType !== detectedLogoTypeForGeneration
      ) {
        console.log(`🧠 Applying Director detected_logo_type override for uploaded reference flow: ${effectiveFormData.logoType} -> ${detectedLogoTypeForGeneration}`)
        effectiveFormData = {
          ...effectiveFormData,
          logoType: detectedLogoTypeForGeneration,
        }
        normalizedVariantPlans = undefined
      }

      const explicitIconPreserveCue = /(keep|same|preserve).{0,24}(icon|symbol|mark)|do\s*not\s+change\s+(the\s+)?(icon|symbol|mark)|not\s+the\s+icon|icon\s+unchanged/i
        .test(generationIntentText)

      if (
        hasUploadedAnchorRefsInRequest
        && effectiveFormData.logoType === 'wordmark'
        && inferredEditScopeForGeneration === 'text_only'
        && explicitIconPreserveCue
      ) {
        console.log('🛠️ Conflict detected: wordmark + uploaded icon-preservation cue + text_only scope. Overriding generation logoType to combination to preserve uploaded icon.')
        effectiveFormData = {
          ...effectiveFormData,
          logoType: 'combination',
        }
        // Existing variant plans from Director may be wordmark-specific; let prompt builder regenerate combination-safe plans.
        normalizedVariantPlans = undefined
      }

      normalizedVariantPlans = Array.isArray(normalizedVariantPlans)
        ? normalizedVariantPlans
        : (Array.isArray(effectiveBrief?.variant_plans) ? effectiveBrief.variant_plans : undefined)

      prompts = buildServerBriefedPrompts({
        formData: effectiveFormData,
        brief: effectiveBrief,
        count: variationCount,
        variantPlans: normalizedVariantPlans,
        generationStage,
      })
      promptSource = 'server_compiled'
    }

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      console.log('❌ No prompts provided or invalid format')
      return res.status(400).json({ error: 'Prompts array is required (or formData+brief+variationCount)' })
    }

    if (prompts.length > 5) {
      console.log('❌ Too many prompts requested')
      return res.status(400).json({ error: 'Maximum 5 prompts allowed' })
    }

    if (promptSource === 'server_compiled') {
      console.log(`🧠 Server compiled ${prompts.length} prompt(s) from formData+brief`)
      if (Array.isArray(clientProposedPrompts) && clientProposedPrompts.length) {
        console.log(`ℹ️ Ignoring ${clientProposedPrompts.length} client-proposed prompt(s); using server-authoritative prompts`)
      }
    }

    // ENFORCE: Anonymous users get generous first round, restricted refinements
    const userContext = await resolveRequestUserContext(req)
    const { isAuthenticated, isPremium, clerkUserId, subscriptionStatus } = userContext

    const actorKey = resolveActorKey(req, clerkUserId)
    const payloadHash = buildGenerationPayloadHash({
      prompts,
      formData,
      brief,
      specCore,
      delta,
      variationCount: rawVariationCount,
      variantPlans: normalizedVariantPlans,
      referenceImages,
      generationStage,
    })

    if (requestId) {
      await ensureGenerationRequestTable()

      const { rows: insertedRows } = await sql`
        INSERT INTO generation_request_cache (
          request_id,
          actor_key,
          clerk_user_id,
          generation_stage,
          payload_hash,
          status,
          updated_at
        )
        VALUES (
          ${requestId},
          ${actorKey},
          ${clerkUserId || null},
          ${generationStage},
          ${payloadHash},
          'processing',
          NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING request_id
      `

      if (!insertedRows[0]) {
        const { rows: existingRows } = await sql`
          SELECT actor_key, payload_hash, status, response_code, response_json
          FROM generation_request_cache
          WHERE request_id = ${requestId}
          LIMIT 1
        `

        const existing = existingRows[0]

        if (!existing) {
          return res.status(409).json({
            error: 'Request id conflict. Please retry with a new requestId.',
            code: 'REQUEST_ID_CONFLICT',
          })
        }

        if (existing.actor_key !== actorKey) {
          return res.status(409).json({
            error: 'requestId is already used by another requester',
            code: 'REQUEST_ID_OWNER_MISMATCH',
          })
        }

        if (existing.payload_hash !== payloadHash) {
          return res.status(409).json({
            error: 'requestId cannot be reused with different payload',
            code: 'REQUEST_ID_PAYLOAD_MISMATCH',
          })
        }

        if (existing.status === 'completed' || existing.status === 'failed') {
          const cachedPayload = {
            ...(existing.response_json || {}),
            requestId,
            idempotent: true,
            cached: true,
          }
          const statusCode = existing.response_code || (existing.status === 'completed' ? 200 : 409)
          console.log(`♻️ Returning cached generation response for requestId=${requestId}`)
          return res.status(statusCode).json(cachedPayload)
        }

        return res.status(409).json({
          error: 'This request is already being processed. Please wait.',
          code: 'REQUEST_IN_PROGRESS',
          requestId,
        })
      }

      reservedIdempotencySlot = true
    }

    const isInitialStage = generationStage === 'initial'
    const anonMaxVariations = isInitialStage
      ? MAX_ANON_INITIAL_VARIATIONS
      : MAX_ANON_REFINE_VARIATIONS

    if (!isAuthenticated && prompts.length > anonMaxVariations) {
      console.log(
        '🚫 BLOCKED: Anonymous user attempted to generate',
        prompts.length,
        `logos during ${generationStage} (max: ${anonMaxVariations})`
      )

      const blockedPayload = {
        error: `Anonymous users are limited to ${anonMaxVariations} logo variation${anonMaxVariations === 1 ? '' : 's'} for ${generationStage} rounds. Please sign in for more options.`,
        code: 'ANON_LIMIT_EXCEEDED',
        details: { generationStage, maxVariations: anonMaxVariations },
        requestId,
      }

      if (reservedIdempotencySlot) {
        await finalizeGenerationRequest({
          requestId,
          status: 'failed',
          responseCode: 403,
          responsePayload: blockedPayload,
        })
      }

      return res.status(403).json(blockedPayload)
    }

    let effectiveIsPremium = isPremium

    if (isAuthenticated && !isPremium) {
      const creditResult = await consumeSignedUserCredits({
        clerkUserId,
        requestedCount: prompts.length,
      })

      if (!creditResult.ok) {
        console.log(
          `🚫 BLOCKED: Authenticated free user (${clerkUserId}) attempted ${prompts.length} generations with ${creditResult.remaining ?? 0} credits remaining`
        )

        const blockedPayload = {
          error: creditResult.message || 'Not enough credits. Please upgrade to continue.',
          code: 'CREDITS_EXCEEDED',
          details: {
            requested: prompts.length,
            remaining: creditResult.remaining ?? 0,
            creditsUsed: creditResult.creditsUsed ?? null,
            creditsLimit: creditResult.creditsLimit ?? null,
          },
          requestId,
        }

        if (reservedIdempotencySlot) {
          await finalizeGenerationRequest({
            requestId,
            status: 'failed',
            responseCode: 403,
            responsePayload: blockedPayload,
          })
        }

        return res.status(403).json(blockedPayload)
      }

      effectiveIsPremium = creditResult.isPremium === true
      if (!effectiveIsPremium) {
        console.log(`💳 Consumed ${prompts.length} credit(s) for ${clerkUserId}. Remaining: ${creditResult.remaining}`)
      }
    }

    const generationProfile = effectiveIsPremium ? 'paid' : 'free'

    if (isAuthenticated) {
      console.log(`✅ Authenticated user (${clerkUserId}) - plan: ${subscriptionStatus} - profile: ${generationProfile} - stage: ${generationStage} - allowing ${prompts.length} variation(s)`)
    } else {
      console.log(`✅ Anonymous user - profile: ${generationProfile} - stage: ${generationStage} - allowing up to ${anonMaxVariations} variation(s)`)
    }

    console.log(`🎨 Generating ${prompts.length} logo(s) — prompt length: ${prompts[0]?.length || 0} chars`)

    // DETAILED REFERENCE IMAGE DEBUGGING
    if (referenceImages && referenceImages.length > 0) {
      console.log('🖼️ === REFERENCE IMAGES RECEIVED ===')
      console.log(`   Count: ${referenceImages.length}`)
      referenceImages.forEach((img, index) => {
        console.log(`   Image ${index + 1}: ${img.mimeType} — ${img.data ? Math.round(img.data.length * 0.75 / 1024) + 'KB' : 'NO DATA'}`)
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

        const referenceSources = Array.isArray(referenceImages)
          ? Array.from(new Set(referenceImages
            .map((img) => String(img?.source || '').toLowerCase())
            .filter(Boolean)))
          : []

        const hasUploadedAnchorRefs = referenceSources.includes('uploaded')
          || (generationStage === 'initial' && Array.isArray(referenceImages) && referenceImages.length > 0)

        const hasSelectedRoundRefs = referenceSources.includes('selected')
          || referenceSources.includes('latest_fallback')

        const shouldForceUploadedLogoRedesign = hasUploadedAnchorRefs

        const uploadedContractLines = shouldForceUploadedLogoRedesign
          ? [
            'UPLOADED LOGO REDESIGN CONTRACT: The provided uploaded reference image(s) are the user\'s source logo assets. Preserve recognizable identity DNA (core icon/wordmark skeleton, arrangement logic, and overall brand character). The result is invalid if it becomes a different brand concept.',
            generationStage === 'initial'
              ? 'INITIAL ROUND RULE: Keep the uploaded logo identity as the primary anchor while exploring only allowed variation in typography/layout/style from this brief.'
              : (hasSelectedRoundRefs
                ? 'REFINE ROUND RULE: When selected round outputs are also provided, treat uploaded references as immutable identity anchors and treat selected outputs as round-specific style/layout guidance.'
                : 'REFINE ROUND RULE: No selected round output was provided; evolve directly from uploaded anchors while applying this round\'s feedback.'),
          ]
          : []

        const promptWithReferenceContract = uploadedContractLines.length > 0
          ? [prompt, ...uploadedContractLines].join('\n\n')
          : prompt

        if (shouldForceUploadedLogoRedesign) {
          console.log(`🧬 Enforcing uploaded-logo redesign contract for ${generationStage}-generation prompt`)
          if (referenceSources.length) {
            console.log(`🧷 Reference source mix: ${referenceSources.join(', ')}`)
          }
        }

        const logoUrl = await callGeminiAPI(promptWithReferenceContract, referenceImages, generationProfile)
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
    logos.forEach((url, index) => {
      const display = url?.startsWith('data:') ? `[base64 data URL, ${Math.round(url.length * 0.75 / 1024)}KB]` : url
      console.log(`   ${index + 1}. ${display}`)
    })

    const successPayload = {
      logos,
      requestId,
      idempotent: false,
      promptSource,
      variantPlans: Array.isArray(normalizedVariantPlans) ? normalizedVariantPlans : undefined,
    }

    if (reservedIdempotencySlot) {
      await finalizeGenerationRequest({
        requestId,
        status: 'completed',
        responseCode: 200,
        responsePayload: successPayload,
      })
    }

    return res.json(successPayload)
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

    const errorPayload = {
      error: 'Failed to generate logos: ' + error.message,
      details: error.stack,
      requestId,
    }

    if (reservedIdempotencySlot) {
      try {
        await finalizeGenerationRequest({
          requestId,
          status: 'failed',
          responseCode: 500,
          responsePayload: errorPayload,
        })
      } catch (persistError) {
        console.error('❌ Failed to persist idempotent failure payload:', persistError.message)
      }
    }

    return res.status(500).json(errorPayload)
  }
})

// Image upscaling endpoint using Replicate Real-ESRGAN
app.post('/api/upscale', generationLimiter, async (req, res) => {
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
  // Use production webhook secret in production, local secret for development
  const endpointSecret = process.env.VERCEL
    ? process.env.STRIPE_WEBHOOK_SECRET_PRODUCTION
    : process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    console.error('❌ Stripe not configured for webhook processing');
    return res.status(503).send('Stripe not configured');
  }

  if (!endpointSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    console.error('Environment:', process.env.VERCEL ? 'PRODUCTION' : 'LOCAL');
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
                  credits_limit = 999999,
                  payment_date = NOW(),
                  stripe_payment_id = ${paymentIntent.id}
              WHERE clerk_user_id = ${userId}
            `;

            console.log('✅ User subscription updated successfully');

            // Send premium upgrade confirmation email
            console.log('📧 Checking email conditions - userEmail:', userEmail, 'resend:', !!resend);
            if (userEmail && resend) {
              console.log('📧 Sending premium upgrade email to:', userEmail);
              try {
                await resend.emails.send({
                  from: 'Craft Your Logo <noreply@craftyourlogo.com>',
                  to: userEmail,
                  subject: 'Welcome to Premium! 🎉',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(to bottom, #f8f9fa, #ffffff);">
                      <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Welcome to Premium! 🎉</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your upgrade is complete</p>
                      </div>

                      <div style="padding: 40px 30px; background: white;">
                        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Congratulations! 🚀</h2>

                        <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
                          You've unlocked the full power of Craft Your Logo! Your premium features are now active and ready to use.
                        </p>

                        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                          <h3 style="color: #06b6d4; margin: 0 0 15px 0; font-size: 18px;">✨ Your Premium Features:</h3>
                          <ul style="color: #555; line-height: 1.8; font-size: 15px; padding-left: 20px; margin: 0;">
                            <li style="margin-bottom: 10px;"><strong>Unlimited Generations:</strong> Create as many logo variations as you need</li>
                            <li style="margin-bottom: 10px;"><strong>Pro Pack Downloads:</strong> 8K resolution, SVG vectors, ICO favicons & more</li>
                            <li style="margin-bottom: 10px;"><strong>Priority Support:</strong> Get help faster with premium support</li>
                            <li style="margin-bottom: 0;"><strong>Commercial Rights:</strong> Full ownership for any project</li>
                          </ul>
                        </div>

                        <div style="text-align: center; margin: 35px 0;">
                          <a href="https://craftyourlogo.com" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">
                            Start Creating Premium Logos
                          </a>
                        </div>

                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                            <strong>Payment Details:</strong><br>
                            Amount: €9.99 (one-time payment)<br>
                            Transaction ID: ${paymentIntent.id}
                          </p>
                        </div>

                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 15px;">
                          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                            <strong>Need help?</strong> Our support team is here for you at
                            <a href="mailto:support@craftyourlogo.com" style="color: #06b6d4; text-decoration: none;">support@craftyourlogo.com</a>
                          </p>
                        </div>
                      </div>

                      <div style="background: #1f2937; padding: 30px 20px; text-align: center;">
                        <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 14px;">
                          Craft Your Logo - AI-Powered Logo Generation
                        </p>
                        <p style="color: #6b7280; margin: 0; font-size: 12px;">
                          © ${new Date().getFullYear()} Craft Your Logo. All rights reserved.
                        </p>
                      </div>
                    </div>
                  `
                });
                console.log('✅ Premium upgrade email sent successfully to:', userEmail);
              } catch (emailError) {
                console.error('❌ Failed to send premium upgrade email:', emailError);
                console.error('Email error details:', emailError.message);
              }
            } else {
              console.log('⚠️ Email not sent - missing userEmail or resend:', { userEmail, hasResend: !!resend });
            }

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
app.post('/api/create-payment-intent-with-user', requireAuth, async (req, res) => {
  console.log('🔍 create-payment-intent-with-user endpoint called');

  if (!stripe) {
    return res.status(503).json({ error: 'Payment service unavailable - Stripe not configured' });
  }

  try {
    const { userEmail } = req.body;
    const userId = req.auth.userId

    console.log('💳 Creating payment intent for authenticated user:', userId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999, // €9.99 in cents
      currency: 'eur',
      description: 'Craft Your Logo - Premium Upgrade',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: userEmail, // Send Stripe receipt to this email
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
app.get('/api/verify-payment/:paymentIntentId', requireAuth, async (req, res) => {
  console.log('🔍 verify-payment endpoint called');

  if (!stripe) {
    return res.status(503).json({ error: 'Payment service unavailable' });
  }

  try {
    const { paymentIntentId } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.userId && paymentIntent.metadata.userId !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden: payment intent does not belong to authenticated user' })
    }

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

// ============================
// Email APIs (Resend)
// ============================

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' })
    }

    if (!resend) {
      console.error('❌ Resend API key not configured')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    console.log('📧 Sending contact form email from:', email)

    // Send email to support
    const { data, error } = await resend.emails.send({
      from: 'Craft Your Logo <noreply@craftyourlogo.com>',
      to: 'support@craftyourlogo.com',
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(to bottom, #f8f9fa, #ffffff); border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">New Contact Form Submission</h1>
          </div>

          <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">From</p>
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${name}</p>
              <p style="margin: 5px 0 0 0; color: #667eea; font-size: 14px;">${email}</p>
            </div>

            <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Subject</p>
              <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${subject}</p>
            </div>

            <div>
              <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">Sent from Craft Your Logo contact form</p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return res.status(400).json({ error: error.message })
    }

    console.log('✅ Contact email sent successfully:', data.id)
    res.json({ success: true, messageId: data.id })

  } catch (error) {
    console.error('❌ Contact form error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Send welcome email
app.post('/api/emails/welcome', async (req, res) => {
  try {
    const { email, name } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!resend) {
      console.error('❌ Resend API key not configured')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    console.log('📧 Sending welcome email to:', email)

    const displayName = name || 'Creator'

    const { data, error } = await resend.emails.send({
      from: 'Craft Your Logo <noreply@craftyourlogo.com>',
      to: email,
      subject: 'Welcome to Craft Your Logo! 🎨',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(to bottom, #f8f9fa, #ffffff);">
          <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Welcome to Craft Your Logo! 🎨</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your journey to stunning logos starts here</p>
          </div>

          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hey ${displayName}! 👋</h2>

            <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
              We're thrilled to have you join Craft Your Logo! You've just unlocked the power to create professional, AI-generated logos in seconds.
            </p>

            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #06b6d4; margin: 25px 0;">
              <h3 style="color: #06b6d4; margin: 0 0 15px 0; font-size: 18px;">🎁 You've Got 15 Free Credits!</h3>
              <p style="color: #555; margin: 0; line-height: 1.6; font-size: 15px;">
                Start creating right away with your free credits. Each generation creates 5 unique logo variations for you to choose from.
              </p>
            </div>

            <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 20px;">✨ What You Can Do:</h3>
            <ul style="color: #555; line-height: 1.8; font-size: 15px; padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 10px;"><strong>Generate Logo Variations:</strong> Create 5 unique logos per generation</li>
              <li style="margin-bottom: 10px;"><strong>Refine Your Designs:</strong> Use our 3-round refinement system to perfect your logos</li>
              <li style="margin-bottom: 10px;"><strong>Download Instantly:</strong> Get standard PNG downloads for free</li>
              <li style="margin-bottom: 0;"><strong>Upgrade for More:</strong> Unlock unlimited generations, 8K resolution, SVG vectors & more for just €9.99</li>
            </ul>

            <div style="text-align: center; margin: 35px 0;">
              <a href="https://craftyourlogo.com" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">
                Start Creating Now
              </a>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                <strong>Need help?</strong> Our support team is here for you at
                <a href="mailto:support@craftyourlogo.com" style="color: #06b6d4; text-decoration: none;">support@craftyourlogo.com</a>
              </p>
            </div>
          </div>

          <div style="background: #1f2937; padding: 30px 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 14px;">
              Craft Your Logo - AI-Powered Logo Generation
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} Craft Your Logo. All rights reserved.
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return res.status(400).json({ error: error.message })
    }

    console.log('✅ Welcome email sent successfully:', data.id)
    res.json({ success: true, messageId: data.id })

  } catch (error) {
    console.error('❌ Welcome email error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

// ============================
// User Management APIs
// ============================

app.post('/api/users/sync', requireAuth, async (req, res) => {
  try {
    const { email, firstName } = req.body
    const clerkUserId = req.auth.userId

    await connectToDatabase()

    // Check if this is a new user
    const existingUser = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    const isNewUser = existingUser.rows.length === 0

    const { rows } = await sql`
      INSERT INTO users (clerk_user_id, email)
      VALUES (${clerkUserId}, ${email || null})
      ON CONFLICT (clerk_user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
      RETURNING id, clerk_user_id, email, subscription_status, credits_used, credits_limit
    `

    console.log(`✅ User synced: ${clerkUserId}, subscription: ${rows[0]?.subscription_status}`)

    // Send welcome email to new users
    if (isNewUser && email && resend) {
      try {
        await resend.emails.send({
          from: 'Craft Your Logo <noreply@craftyourlogo.com>',
          to: email,
          subject: 'Welcome to Craft Your Logo! 🎨',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(to bottom, #f8f9fa, #ffffff);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Welcome to Craft Your Logo!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your journey to stunning logos starts here</p>
              </div>

              <div style="padding: 40px 30px; background: white;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hey ${firstName || 'Creator'}! 👋</h2>

                <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
                  We're thrilled to have you join Craft Your Logo! You've just unlocked the power to create professional, AI-generated logos in seconds.
                </p>

                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e8eaf6 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #667eea; margin: 25px 0;">
                  <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px;">🎁 You've Got 15 Free Credits!</h3>
                  <p style="color: #555; margin: 0; line-height: 1.6; font-size: 15px;">
                    Start creating right away with your free credits. Each generation creates 5 unique logo variations for you to choose from.
                  </p>
                </div>

                <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 20px;">✨ What You Can Do:</h3>
                <ul style="color: #555; line-height: 1.8; font-size: 15px; padding-left: 20px;">
                  <li style="margin-bottom: 10px;"><strong>Generate Logo Variations:</strong> Create 5 unique logos per generation</li>
                  <li style="margin-bottom: 10px;"><strong>Refine Your Designs:</strong> Use our 3-round refinement system to perfect your logos</li>
                  <li style="margin-bottom: 10px;"><strong>Download Instantly:</strong> Get standard PNG downloads for free</li>
                  <li style="margin-bottom: 10px;"><strong>Upgrade for More:</strong> Unlock unlimited generations, 8K resolution, SVG vectors & more for just €9.99</li>
                </ul>

                <div style="text-align: center; margin: 35px 0;">
                  <a href="https://craftyourlogo.com" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                    Start Creating Now
                  </a>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                  <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                    <strong>Need help?</strong> Our support team is here for you at
                    <a href="mailto:support@craftyourlogo.com" style="color: #667eea; text-decoration: none;">support@craftyourlogo.com</a>
                  </p>
                </div>
              </div>

              <div style="text-align: center; padding: 30px 20px; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; margin: 0 0 10px 0; font-size: 13px;">
                  Made with ❤️ by the Craft Your Logo team
                </p>
                <p style="color: #ccc; margin: 0; font-size: 12px;">
                  © ${new Date().getFullYear()} Craft Your Logo. All rights reserved.
                </p>
              </div>
            </div>
          `
        })
        console.log(`📧 Welcome email sent to: ${email}`)
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError)
        // Don't fail user sync if email fails
      }
    }

    res.json({ user: rows[0] })
  } catch (error) {
    console.error('❌ Failed to sync user:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId

    await connectToDatabase()
    const { rows } = await sql`
      SELECT id, clerk_user_id, email, subscription_status, credits_used, credits_limit
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

app.put('/api/users/subscription', requireAuth, async (req, res) => {
  try {
    const { status, paymentIntentId: rawPaymentIntentId, payment_intent_id: rawPaymentIntentSnake } = req.body || {}
    const clerkUserId = req.auth.userId
    const normalizedStatus = (status || '').toLowerCase()
    const paymentIntentId = rawPaymentIntentId || rawPaymentIntentSnake || null

    if (!['free', 'premium'].includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid subscription status' })
    }

    await connectToDatabase()

    if (normalizedStatus === 'premium') {
      if (!stripe) {
        return res.status(503).json({ error: 'Payment service unavailable - Stripe not configured' })
      }

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId is required to activate premium' })
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          error: 'Payment not completed. Premium can only be activated after successful payment.',
          paymentStatus: paymentIntent.status,
        })
      }

      if (paymentIntent.metadata?.userId !== clerkUserId) {
        return res.status(403).json({ error: 'Payment intent does not belong to this user' })
      }

      const result = await sql`
        UPDATE users
        SET subscription_status = 'premium',
            credits_limit = 999999,
            payment_date = NOW(),
            stripe_payment_id = ${paymentIntent.id}
        WHERE clerk_user_id = ${clerkUserId}
      `

      if (result.count === 0) {
        return res.status(404).json({ error: 'User profile not found. Please refresh and try again.' })
      }

      console.log(`✅ Premium activated for ${clerkUserId} via verified payment intent ${paymentIntent.id}. Rows affected: ${result.count}`)
      return res.json({ success: true, rowsAffected: result.count, verifiedBy: 'payment_intent' })
    }

    const result = await sql`
      UPDATE users
      SET subscription_status = 'free',
          credits_limit = 15
      WHERE clerk_user_id = ${clerkUserId}
    `

    if (result.count === 0) {
      return res.status(404).json({ error: 'User profile not found.' })
    }

    console.log(`✅ Downgraded user ${clerkUserId} to free. Rows affected: ${result.count}`)
    return res.json({ success: true, rowsAffected: result.count })
  } catch (error) {
    console.error('❌ Failed to update subscription:', error)
    res.status(500).json({ error: error.message })
  }
})

// Migration API
app.post('/api/users/migrate', requireAuth, async (req, res) => {
  try {
    const { email, localStorageData } = req.body
    const clerkUserId = req.auth.userId

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

app.get('/api/logos/saved', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId

    await ensureSavedLogosEditorStateColumn()
    const { rows } = await sql`
      SELECT id, logo_url as url, logo_prompt as prompt, created_at, is_premium, file_format, editor_state
      FROM saved_logos
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY created_at DESC
    `
    res.json({ logos: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/logos/save', requireAuth, async (req, res) => {
  try {
    const { logo } = req.body
    const clerkUserId = req.auth.userId
    if (!logo?.url) return res.status(400).json({ error: 'logo.url required' })

    const editorState = normalizeEditorStatePayload(logo?.editor_state || logo?.editorState || null)

    let persistedUrl = logo.url

    // If logo is still ephemeral (data URL), try to persist it to Blob at save-time.
    // If Blob is unavailable/rate-limited/full, gracefully fall back to storing the data URL
    // so users can still like/save without hard failure.
    if (typeof persistedUrl === 'string' && persistedUrl.startsWith('data:image/')) {
      const match = persistedUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!match) {
        return res.status(400).json({ error: 'Invalid data URL format for logo.url' })
      }

      const mimeType = match[1]
      const base64 = match[2]
      const buffer = Buffer.from(base64, 'base64')

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const extMap = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp'
          }
          const ext = extMap[mimeType] || 'png'
          const filename = `saved/${clerkUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

          console.log(`📤 Persisting liked logo to Blob: ${filename}`)
          const blob = await put(filename, buffer, {
            access: 'public',
            contentType: mimeType,
            addRandomSuffix: false,
          })
          persistedUrl = blob.url
          console.log(`✅ Liked logo persisted: ${persistedUrl}`)
        } catch (blobErr) {
          console.warn('⚠️ Failed to persist liked logo to Blob. Falling back to inline data URL save:', blobErr.message)
        }
      } else {
        console.warn('⚠️ BLOB_READ_WRITE_TOKEN missing. Saving liked logo as inline data URL.')
      }
    }

    await ensureSavedLogosEditorStateColumn()
    const { rows } = await sql`SELECT id FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })

    const inserted = await sql`
      INSERT INTO saved_logos (user_id, clerk_user_id, logo_url, logo_prompt, is_premium, file_format, editor_state)
      VALUES (
        ${rows[0].id},
        ${clerkUserId},
        ${persistedUrl},
        ${logo.prompt || null},
        ${!!logo.is_premium},
        ${logo.file_format || 'png'},
        ${editorState ? JSON.stringify(editorState) : null}::jsonb
      )
      RETURNING id
    `

    res.json({ success: true, logoId: inserted.rows?.[0]?.id, url: persistedUrl, editor_state: editorState })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/logos/:id', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId
    const { id } = req.params

    await connectToDatabase()
    await sql`DELETE FROM saved_logos WHERE id = ${id} AND clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/logos/clear', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId

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

app.post('/api/generations/track', requireAuth, async (req, res) => {
  try {
    const { prompt, logosGenerated = 1, isPremium = false } = req.body
    const clerkUserId = req.auth.userId
    if (!prompt) return res.status(400).json({ error: 'prompt required' })

    await connectToDatabase()
    await sql`INSERT INTO generation_history (clerk_user_id, prompt, logos_generated, is_premium) VALUES (${clerkUserId}, ${prompt}, ${logosGenerated}, ${isPremium})`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/generations/usage', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId

    await connectToDatabase()
    const { rows } = await sql`SELECT credits_used, credits_limit, subscription_status FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`
    res.json(rows[0] || { credits_used: 0 })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/generations/increment', requireAuth, async (req, res) => {
  try {
    const { by = 1 } = req.body
    const clerkUserId = req.auth.userId

    await connectToDatabase()
    await sql`UPDATE users SET credits_used = credits_used + ${by} WHERE clerk_user_id = ${clerkUserId}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================
// Analytics APIs
// ============================

app.post('/api/analytics/track', requireAuth, async (req, res) => {
  try {
    const { event, meta } = req.body
    const clerkUserId = req.auth.userId
    if (!event) return res.status(400).json({ error: 'event is required' })

    await connectToDatabase()
    await sql`INSERT INTO usage_analytics (action, clerk_user_id, metadata) VALUES (${event}, ${clerkUserId || null}, ${meta ? JSON.stringify(meta) : null})`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/analytics/dashboard', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId
    await connectToDatabase()
    const { rows } = await sql`
      SELECT action, COUNT(*) as count
      FROM usage_analytics
      WHERE clerk_user_id = ${clerkUserId}
      GROUP BY action
      ORDER BY count DESC
    `
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
app.post('/api/logos/:id/upscale', requireAuth, expensiveOperationLimiter, async (req, res) => {
  console.log('🔍 8K upscale endpoint called')

  try {
    const { id } = req.params
    const { logoUrl: providedLogoUrl } = req.body
    const clerkUserId = req.auth.userId

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for 8K upscaling' })
    }

    // Use logoUrl from request body, or try to get from database as fallback
    let logoUrl = providedLogoUrl

    if (!logoUrl) {
      console.log(`🔍 Looking up logo ${id} in database...`)

      // Get logo from database as fallback
      await connectToDatabase()
      const { rows } = await sql`
        SELECT logo_url FROM saved_logos
        WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
      `

      if (!rows[0]) {
        return res.status(404).json({ error: 'Logo not found and no logoUrl provided' })
      }

      logoUrl = rows[0].logo_url
    }

    if (!logoUrl) {
      return res.status(400).json({ error: 'No image URL found for this logo' })
    }

    console.log('🔍 Upscaling logo:', logoUrl)

    if (!replicate) {
      return res.status(503).json({ error: 'Replicate service not configured' })
    }

    // Call Replicate Real-ESRGAN for BOTH 8K and 4K upscaling in parallel
    console.log('🚀 Starting parallel upscaling: 8K and 4K...')

    const [output8k, output4k] = await Promise.all([
      replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: logoUrl,
            scale: 8, // 8x upscaling for 8K resolution
            face_enhance: false
          }
        }
      ),
      replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: logoUrl,
            scale: 4, // 4x upscaling for 4K resolution
            face_enhance: false
          }
        }
      )
    ])

    console.log('✅ Both upscaling operations completed')

    // Helper function to handle Replicate output
    const handleReplicateOutput = async (output, resolution, scale) => {
      if (typeof output === 'string') {
        console.log(`✅ Got ${resolution} URL from Replicate:`, output)
        return output
      } else if (output && typeof output === 'object') {
        console.log(`📥 Reading ${resolution} stream from Replicate...`)
        const chunks = []
        for await (const chunk of output) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        console.log(`✅ ${resolution} stream read, size: ${buffer.length} bytes`)

        const timestamp = Date.now()
        const filename = `logo-${id}-${scale}k-${timestamp}.png`

        if (process.env.BLOB_READ_WRITE_TOKEN) {
          console.log(`📤 Uploading ${resolution} image to Vercel Blob: ${filename}`)
          const blob = await put(filename, buffer, {
            access: 'public',
            contentType: 'image/png',
          })
          console.log(`✅ ${resolution} image uploaded to Vercel Blob: ${blob.url}`)
          return blob.url
        } else {
          throw new Error('Blob storage not configured')
        }
      } else {
        throw new Error(`Unexpected output format from Replicate for ${resolution}`)
      }
    }

    const upscaledUrl = await handleReplicateOutput(output8k, '8K', 8)
    const upscaled4kUrl = await handleReplicateOutput(output4k, '4K', 4)

    // Track analytics
    await sql`
      INSERT INTO usage_analytics (action, clerk_user_id, metadata)
      VALUES ('logo_upscaled_8k_4k', ${clerkUserId}, ${JSON.stringify({
        logo_id: id,
        original_url: logoUrl,
        upscaled_8k_url: upscaledUrl,
        upscaled_4k_url: upscaled4kUrl
      })})
    `

    res.json({
      success: true,
      originalUrl: logoUrl,
      upscaledUrl: upscaledUrl,
      upscaled4kUrl: upscaled4kUrl,
      scale: 8,
      resolution: '8K + 4K'
    })

  } catch (error) {
    console.error('❌ 8K upscale error:', error)
    res.status(500).json({
      error: 'Failed to upscale logo: ' + error.message
    })
  }
})

// SVG Conversion Endpoint
app.post('/api/logos/:id/vectorize', requireAuth, expensiveOperationLimiter, async (req, res) => {
  console.log('🔍 SVG vectorization endpoint called')

  try {
    const { id } = req.params
    const { logoUrl: providedLogoUrl, curveFitting } = req.body
    const clerkUserId = req.auth.userId

    // Default to spline if not specified
    const curveMode = curveFitting || 'spline'
    console.log(`🔺 Using curve fitting mode: ${curveMode}`)

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for SVG conversion' })
    }

    // Use logoUrl from request body (8K version for better polygon detail), or try to get from database as fallback
    let imageUrl = providedLogoUrl

    if (!imageUrl) {
      console.log(`🔍 Looking up logo ${id} in database...`)

      // Get logo from database as fallback
      await connectToDatabase()
      const { rows } = await sql`
        SELECT logo_url FROM saved_logos
        WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
      `

      if (!rows[0]) {
        return res.status(404).json({ error: 'Logo not found and no logoUrl provided' })
      }

      imageUrl = rows[0].logo_url
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL found for this logo' })
    }

    console.log('🔍 Vectorizing logo:', imageUrl)
    console.log(`🔺 Using FreeConvert API with mode: ${curveMode}`)

    // Use FreeConvert API for colored SVG conversion
    const freeConvertApiKey = process.env.FREECONVERT_API_KEY

    if (!freeConvertApiKey) {
      return res.status(500).json({ error: 'FreeConvert API key not configured' })
    }

    console.log('🔄 Using 4K upscaled + bg-removed version for SVG conversion...')

    // Create FreeConvert job
    const jobResponse = await fetch('https://api.freeconvert.com/v1/process/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${freeConvertApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-1': {
            operation: 'import/url',
            url: imageUrl,
            filename: 'logo.png'
          },
          'convert-1': {
            operation: 'convert',
            input: 'import-1',
            input_format: 'png',
            output_format: 'svg',
            options: {
              'color-mode': 'color',
              'clustering': 'stacked',
              'color-precision': 8, // Max quality
              'gradient-step': 1, // Smooth gradients
              'filter-speckle': 1, // Minimal filtering for detail preservation
              'curve-fitting': curveMode
            }
          },
          'export-1': {
            operation: 'export/url',
            input: ['convert-1'],
            filename: 'logo-vector.svg'
          }
        }
      })
    })

    const jobResult = await jobResponse.json()
    console.log('📋 FreeConvert job created:', jobResult.id, 'status:', jobResult.status)

    // Check if job creation failed
    if (!jobResult.id) {
      console.error('❌ FreeConvert job creation failed:', jobResult)
      throw new Error('Failed to create FreeConvert job: ' + JSON.stringify(jobResult))
    }

    // Wait for job to complete
    let jobStatus = jobResult
    let pollCount = 0
    while (jobStatus.status === 'processing' || jobStatus.status === 'pending') {
      await new Promise(resolve => setTimeout(resolve, 3000))
      pollCount++
      console.log(`⏳ Polling FreeConvert job (attempt ${pollCount})...`)

      const statusResponse = await fetch(`https://api.freeconvert.com/v1/process/jobs/${jobResult.id}`, {
        headers: { 'Authorization': `Bearer ${freeConvertApiKey}` }
      })
      jobStatus = await statusResponse.json()
      console.log(`📊 Job status: ${jobStatus.status}`)

      // Safety limit to avoid infinite loop
      if (pollCount > 60) { // Max 3 minutes (60 * 3 seconds)
        throw new Error('FreeConvert job timeout after 3 minutes')
      }
    }

    if (jobStatus.status !== 'completed') {
      // Get detailed error from failed tasks
      const failedTasks = jobStatus.tasks?.filter(t => t.status === 'failed') || []
      const errorDetails = failedTasks.map(t => `${t.name}: ${t.message || t.code || 'unknown'}`).join(', ')
      console.error('❌ FreeConvert job failed:', {
        jobId: jobResult.id,
        status: jobStatus.status,
        message: jobStatus.message,
        failedTasks: errorDetails,
        fullJobStatus: JSON.stringify(jobStatus, null, 2)
      })
      throw new Error('SVG conversion failed: ' + (errorDetails || jobStatus.message || 'Unknown error'))
    }

    // Get the export URL
    const exportTask = jobStatus.tasks.find(t => t.name === 'export-1')
    if (!exportTask?.result?.url) {
      throw new Error('No SVG file in conversion result')
    }

    // Download the SVG
    const svgResponse = await fetch(exportTask.result.url)
    let svgString = await svgResponse.text()

    // Log original file size
    const originalSize = Buffer.byteLength(svgString, 'utf8')
    console.log(`📦 Original SVG size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)

    // Remove dark background
    svgString = svgString.replace(/<path d="[^"]*" fill="#363636"[^>]*\/>/,'')

    // Add viewBox if missing
    if (!svgString.includes('viewBox=')) {
      svgString = svgString.replace(/<svg([^>]+)>/, '<svg$1 viewBox="0 0 8192 8192">')
    }

    // Optimize SVG with SVGO (fast mode - essential plugins only)
    console.log('🔧 Optimizing SVG with SVGO...')
    const optimized = optimize(svgString, {
      plugins: [
        'removeDoctype',
        'removeComments',
        'removeMetadata',
        'cleanupIds',
        'removeUselessDefs',
        'removeEmptyText',
        'removeEmptyAttrs',
        'removeEmptyContainers',
        {
          name: 'cleanupNumericValues',
          params: {
            floatPrecision: 1  // More aggressive rounding for speed
          }
        },
        {
          name: 'convertPathData',
          params: {
            floatPrecision: 1,
            transformPrecision: 1
          }
        }
      ],
      multipass: false  // Single pass for speed
    })

    svgString = optimized.data
    const optimizedSize = Buffer.byteLength(svgString, 'utf8')
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1)
    console.log(`📦 Optimized SVG size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB (${reduction}% reduction)`)

    console.log('✅ SVG vectorization and optimization completed!')

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

// Background Removal Endpoint
app.post('/api/logos/:id/remove-background', requireAuth, expensiveOperationLimiter, async (req, res) => {
  console.log('🎨 Background removal endpoint called')
  console.log('📋 Request params:', req.params)
  console.log('📋 Request body:', req.body)

  try {
    const { id } = req.params
    const { logoUrl } = req.body
    const clerkUserId = req.auth.userId

    // Check if user is premium (or debug force premium is enabled)
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for background removal' })
    }

    // Use logoUrl from request body, or try to get from database as fallback
    let imageUrl = logoUrl

    if (!imageUrl) {
      console.log(`🔍 Looking up logo ${id} in database...`)

      // Get logo from database as fallback
      const { rows } = await sql`
        SELECT logo_url FROM saved_logos
        WHERE id = ${id} AND clerk_user_id = ${clerkUserId}
        LIMIT 1
      `

      if (!rows[0]) {
        return res.status(404).json({ error: 'Logo not found and no logoUrl provided' })
      }

      imageUrl = rows[0].logo_url
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL found for this logo' })
    }

    console.log(`📥 Fetching image from: ${imageUrl}`)

    // Download the original image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    console.log(`✅ Image downloaded, size: ${imageBuffer.length} bytes`)

    // Use Sharp to remove background
    console.log('🎨 Processing image with Sharp to remove background...')

    // Create a proper background removal using Sharp
    const processedImageBuffer = await sharp(imageBuffer)
      .ensureAlpha() // Add alpha channel for transparency
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        const { width, height, channels } = info
        const pixelArray = new Uint8ClampedArray(data)

        // Process pixels to make white/light backgrounds transparent
        for (let i = 0; i < pixelArray.length; i += channels) {
          const r = pixelArray[i]
          const g = pixelArray[i + 1]
          const b = pixelArray[i + 2]

          // Calculate brightness
          const brightness = (r + g + b) / 3

          // If pixel is light (close to white background), make it transparent
          if (brightness > 230) {
            pixelArray[i + 3] = 0 // Set alpha to 0 (transparent)
          } else if (brightness > 200) {
            // Partially transparent for smoother edges
            pixelArray[i + 3] = Math.floor((230 - brightness) * 8.5)
          }
        }

        // Convert back to PNG with transparency
        return sharp(pixelArray, {
          raw: { width, height, channels }
        })
        .png({ quality: 100, compressionLevel: 6 })
        .toBuffer()
      })

    console.log('🎨 ✅ Advanced background removal completed!')

    console.log(`✅ Background removal completed, output size: ${processedImageBuffer.length} bytes`)

    // Upload to Vercel Blob Storage
    const timestamp = Date.now()
    const filename = `logo-${id}-no-bg-${timestamp}.png`
    let processedUrl

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log(`📤 Uploading background-removed image to Vercel Blob: ${filename}`)
        const blob = await put(filename, processedImageBuffer, {
          access: 'public',
          contentType: 'image/png',
        })
        processedUrl = blob.url
        console.log(`✅ Background-removed image uploaded to Vercel Blob: ${processedUrl}`)
      } catch (blobError) {
        console.warn('⚠️ Vercel Blob upload failed:', blobError.message)
        throw new Error('Failed to upload processed image to storage')
      }
    } else {
      throw new Error('Blob storage not configured')
    }

    // Track analytics
    await sql`
      INSERT INTO usage_analytics (action, clerk_user_id, metadata)
      VALUES ('background_removed', ${clerkUserId}, ${JSON.stringify({
        logo_id: id,
        source_url: imageUrl,
        output_url: processedUrl
      })})
    `

    console.log('✅ Background removal completed successfully')

    res.json({
      success: true,
      processedUrl,
      sourceUrl: imageUrl,
      filename,
      format: 'PNG with transparent background'
    })

  } catch (error) {
    console.error('❌ Background removal error:', error)
    res.status(500).json({
      error: 'Failed to remove background: ' + error.message
    })
  }
})

// Additional Formats Endpoint (Favicon & Profile Picture)
app.post('/api/logos/:id/formats', requireAuth, expensiveOperationLimiter, async (req, res) => {
  console.log('🔍 Additional formats endpoint called')

  try {
    const { id } = req.params
    const { formats, logoUrl: providedLogoUrl } = req.body
    const clerkUserId = req.auth.userId

    if (!formats || !Array.isArray(formats)) {
      return res.status(400).json({ error: 'formats array is required' })
    }

    // Verify premium status
    const isPremium = await verifyPremiumUser(clerkUserId)
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium subscription required for additional formats' })
    }

    // Use logoUrl from request body, or try to get from database as fallback
    let imageUrl = providedLogoUrl

    if (!imageUrl) {
      console.log(`🔍 Looking up logo ${id} in database...`)

      // Get logo from database as fallback
      await connectToDatabase()
      const { rows } = await sql`
        SELECT logo_url FROM saved_logos
        WHERE id = ${id} AND clerk_user_id = ${clerkUserId} LIMIT 1
      `

      if (!rows[0]) {
        return res.status(404).json({ error: 'Logo not found and no logoUrl provided' })
      }

      imageUrl = rows[0].logo_url
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL found for this logo' })
    }

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
