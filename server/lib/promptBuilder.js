const SINGLE = 'CRITICAL: Generate ONLY ONE logo design per image. Do NOT show multiple variations in one image.'
const CORE_AVOID = 'AVOID: badges, generic emblems, clipart look, heavy 3D bevels, mockup scenes, watermarks, and UI framing elements.'

const safe = (value, fallback) => {
  const v = String(value || '').trim()
  return v.length ? v : fallback
}

const hashString = (value) => {
  const input = String(value || '')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const asLabel = (value) => String(value || '').replace(/[-_]/g, ' ')

const DIMENSIONS_BY_LOGO_TYPE = {
  wordmark: {
    layout_structure: ['wordmark-horizontal', 'wordmark-stacked', 'wordmark-centered'],
    motif_family: ['letterform-based', 'negative-space-illusion'],
    form_language: ['geometric-pure', 'organic-fluid', 'angular-constructivist'],
    visual_weight: ['minimal-line', 'balanced-solid', 'heavy-bold'],
    color_treatment: ['monochrome', 'high-contrast-duo', 'soft-gradient'],
    typography_class: ['geometric-sans', 'humanist-sans', 'serif', 'script', 'display'],
  },
  lettermark: {
    layout_structure: ['centered-badge', 'standalone-mark', 'stacked-vertical'],
    motif_family: ['letterform-based', 'negative-space-illusion', 'abstract-geometry'],
    form_language: ['geometric-pure', 'angular-constructivist', 'negative-space'],
    visual_weight: ['minimal-line', 'balanced-solid', 'heavy-bold'],
    color_treatment: ['monochrome', 'high-contrast-duo', 'soft-gradient', 'vibrant-multi'],
    typography_class: ['geometric-sans', 'humanist-sans', 'serif', 'display'],
  },
  combination: {
    layout_structure: ['icon-left', 'stacked-vertical', 'integrated-overlap', 'separate-lockup', 'centered-badge'],
    motif_family: ['pictogram', 'abstract-geometry', 'letterform-based', 'negative-space-illusion', 'emblem-badge'],
    form_language: ['geometric-pure', 'organic-fluid', 'angular-constructivist', 'negative-space'],
    visual_weight: ['minimal-line', 'balanced-solid', 'heavy-bold'],
    color_treatment: ['monochrome', 'high-contrast-duo', 'soft-gradient', 'vibrant-multi'],
    typography_class: ['geometric-sans', 'humanist-sans', 'serif', 'display'],
    icon_text_relationship: ['separate', 'integrated', 'replaces-letter', 'encircles-text'],
  },
  pictorial: {
    layout_structure: ['standalone-mark', 'centered-badge', 'stacked-vertical'],
    motif_family: ['pictogram', 'abstract-geometry', 'negative-space-illusion', 'emblem-badge'],
    form_language: ['geometric-pure', 'organic-fluid', 'angular-constructivist', 'negative-space'],
    visual_weight: ['minimal-line', 'balanced-solid', 'heavy-bold'],
    color_treatment: ['monochrome', 'high-contrast-duo', 'soft-gradient', 'vibrant-multi'],
  },
  abstract: {
    layout_structure: ['standalone-mark', 'centered-badge', 'stacked-vertical'],
    motif_family: ['abstract-geometry', 'negative-space-illusion'],
    form_language: ['geometric-pure', 'organic-fluid', 'angular-constructivist', 'negative-space'],
    visual_weight: ['minimal-line', 'balanced-solid', 'heavy-bold'],
    color_treatment: ['monochrome', 'high-contrast-duo', 'soft-gradient', 'vibrant-multi'],
  },
}

const DIMENSION_ORDER = [
  'layout_structure',
  'motif_family',
  'form_language',
  'visual_weight',
  'color_treatment',
  'typography_class',
  'icon_text_relationship',
]

const TRANSLATION_MAP = {
  layout_structure: {
    'wordmark-horizontal': 'Use a horizontal wordmark arrangement with strong baseline stability.',
    'wordmark-stacked': 'Use a stacked text treatment with clear vertical hierarchy.',
    'wordmark-centered': 'Use a centered typographic arrangement with symmetric balance.',
    'icon-left': 'Place icon to the left of text in a horizontal lockup with clear spacing.',
    'stacked-vertical': 'Place icon above text in a centered vertical lockup.',
    'integrated-overlap': 'Integrate icon and text with controlled overlap while preserving readability.',
    'separate-lockup': 'Keep icon and text visually separate but systemically aligned.',
    'centered-badge': 'Use a centered compact badge-like composition.',
    'standalone-mark': 'Use a single standalone mark composition with no extra layout framing.',
  },
  motif_family: {
    'letterform-based': 'Build concept from letter-derived forms and typographic DNA.',
    'abstract-geometry': 'Use abstract geometric motif logic with ownable silhouette.',
    pictogram: 'Use a clear pictogram-style symbol concept.',
    'negative-space-illusion': 'Use a negative-space reveal as central motif device.',
    'emblem-badge': 'Use a restrained emblem/badge motif without ornate clutter.',
  },
  form_language: {
    'geometric-pure': 'Shape style: pure geometric forms, precise edges, measured curves.',
    'organic-fluid': 'Shape style: organic flowing curves, softer transitions, natural rhythm.',
    'angular-constructivist': 'Shape style: angular constructivist cuts and directional facets.',
    'negative-space': 'Shape style: strong positive/negative interplay with deliberate cutouts.',
  },
  visual_weight: {
    'minimal-line': 'Visual weight: light and airy with sparse forms and generous breathing room.',
    'balanced-solid': 'Visual weight: balanced mass with clean readable fill/line ratio.',
    'heavy-bold': 'Visual weight: bold dense mass with high-impact silhouette.',
  },
  color_treatment: {
    monochrome: 'Color treatment: monochrome with disciplined tonal range.',
    'high-contrast-duo': 'Color treatment: high-contrast duotone for clear hierarchy.',
    'soft-gradient': 'Color treatment: subtle smooth gradient with restrained transitions.',
    'vibrant-multi': 'Color treatment: vibrant multi-color palette while keeping clarity.',
  },
  typography_class: {
    'geometric-sans': 'Typography class: geometric sans with clean modern proportion.',
    'humanist-sans': 'Typography class: humanist sans with warm readable forms.',
    serif: 'Typography class: serif with controlled premium character.',
    script: 'Typography class: script with readable flowing rhythm.',
    display: 'Typography class: display style with distinctive personality and legibility.',
  },
  icon_text_relationship: {
    separate: 'Icon/text relationship: separate blocks with clear spacing.',
    integrated: 'Icon/text relationship: integrated into one cohesive lockup.',
    'replaces-letter': 'Icon/text relationship: icon replaces one letter while preserving readability.',
    'encircles-text': 'Icon/text relationship: icon frames or encircles text in a controlled way.',
  },
}

const getLogoTypeInstruction = (logoType, businessName) => {
  const name = safe(businessName, 'the brand name')
  const instructions = {
    wordmark: `WORDMARK ONLY: Render the full business name exactly once as readable text: "${name}". Typography-only. No icon, no symbol, no standalone mark.`,
    lettermark: 'LETTERMARK ONLY: Create a stylized initials/monogram mark derived from the business name. Do not render the full business name. No standalone pictorial icon.',
    combination: `COMBINATION MARK: Include BOTH a distinct icon/symbol and the readable business name "${name}" in one balanced lockup. Show the business name exactly once (no duplicates/tiling). Not icon-only. Not text-only.`,
    pictorial: 'PICTORIAL ONLY: Icon/symbol only. Zero text, letters, words, or monogram.',
    abstract: 'ABSTRACT ONLY: Non-literal abstract geometric/organic symbol only. Zero text and no literal object depiction.',
  }

  return instructions[logoType] || instructions.pictorial
}

const getBackgroundInstruction = (hasBackground, backgroundValue) => {
  const effectiveBg = (!hasBackground || backgroundValue === 'none') ? 'white' : (backgroundValue || 'white')

  const bgMap = {
    white: 'BACKGROUND: Solid pure white background (#FFFFFF only). No texture/pattern/gradient.',
    neon: 'BACKGROUND: Dark background with vibrant neon glow effect and high contrast.',
    solid: 'BACKGROUND: Solid flat color background using primary brand color.',
    gradient: 'BACKGROUND: Subtle smooth gradient using brand colors.',
    glass: 'BACKGROUND: Soft frosted glass effect with restrained depth.',
    dark: 'BACKGROUND: Dark near-black solid background (#0a0a0a to #1a1a1a).',
  }

  return bgMap[effectiveBg] || bgMap.white
}

const getStyleInstruction = (f) => {
  const style = safe(f.style, 'modern, clean, professional')
  const dimension = f.dimension ? ` ${f.dimension} style.` : ''
  return `Style direction: ${style}.${dimension}`
}

const getColorInstruction = (colors, colorUsageRules) => {
  const fixed = safe(colors, '')
  const notes = safe(colorUsageRules, '')

  if (fixed && notes) {
    return `Color constraints: ${fixed}. Additional color usage rules: ${notes}.`
  }

  if (fixed) {
    return `Color constraints: ${fixed}.`
  }

  if (notes) {
    return `No fixed palette selected. Follow these color usage rules: ${notes}.`
  }

  return 'No fixed color selected. Choose the best palette from brand context and style direction.'
}

const buildPromptScaffold = (f) => {
  const businessName = safe(f.businessName, 'Untitled')
  const industry = safe(f.industry, 'Not specified')
  const description = safe(f.description, 'Not specified')

  return [
    'Create ONE logo only (not a mockup, not multiple concepts).',
    'BRAND:',
    `- Name: "${businessName}"`,
    `- Industry: ${industry}`,
    `- Description: ${description}`,
    '',
    'HARD CONSTRAINTS (MUST FOLLOW):',
    `- Logo type: ${f.logoType}`,
    `- ${getLogoTypeInstruction(f.logoType, businessName)}`,
    `- ${getBackgroundInstruction(f.hasBackground, f.backgroundValue)}`,
    `- ${getColorInstruction(f.colors, f.colorUsageRules)}`,
    `- ${getStyleInstruction(f)}`,
    f.tagline
      ? `- Include tagline exactly as provided: "${f.tagline}" (and no additional text).`
      : '- Do not include tagline or descriptive text beyond required brand text for this logo type.',
    ['wordmark', 'combination'].includes(f.logoType)
      ? `- Text occurrence rule: Show business name "${businessName}" exactly once. No duplicated wordmark, no repeated rows/columns, no mirrored copies.`
      : null,
    '',
    CORE_AVOID,
    'Output quality: clean centered composition, strong legibility at small sizes.',
  ].filter(Boolean).join('\n')
}

const isInvalidVariantPlan = (logoType, plan) => {
  if (logoType === 'pictorial' && plan.motif_family === 'letterform-based') return true
  if (logoType === 'abstract' && ['letterform-based', 'pictogram', 'emblem-badge'].includes(plan.motif_family)) return true

  if (plan.form_language === 'negative-space' && plan.visual_weight === 'heavy-bold') return true
  if (plan.layout_structure === 'integrated-overlap' && logoType !== 'combination') return true
  if (plan.icon_text_relationship === 'replaces-letter' && !['combination', 'lettermark', 'wordmark'].includes(logoType)) return true

  if (['pictorial', 'abstract'].includes(logoType) && plan.typography_class) return true
  if (logoType === 'wordmark' && plan.icon_text_relationship) return true

  return false
}

const buildCandidates = (logoType) => {
  const dimensions = DIMENSIONS_BY_LOGO_TYPE[logoType] || DIMENSIONS_BY_LOGO_TYPE.pictorial

  const candidates = []
  for (const layout_structure of dimensions.layout_structure || ['standalone-mark']) {
    for (const motif_family of dimensions.motif_family || ['abstract-geometry']) {
      for (const form_language of dimensions.form_language || ['geometric-pure']) {
        for (const visual_weight of dimensions.visual_weight || ['balanced-solid']) {
          for (const color_treatment of dimensions.color_treatment || ['monochrome']) {
            const typographyClasses = dimensions.typography_class && dimensions.typography_class.length
              ? dimensions.typography_class
              : [null]
            const relationships = dimensions.icon_text_relationship && dimensions.icon_text_relationship.length
              ? dimensions.icon_text_relationship
              : [null]

            for (const typography_class of typographyClasses) {
              for (const icon_text_relationship of relationships) {
                const plan = {
                  layout_structure,
                  motif_family,
                  form_language,
                  visual_weight,
                  color_treatment,
                  ...(typography_class ? { typography_class } : {}),
                  ...(icon_text_relationship ? { icon_text_relationship } : {}),
                }

                if (!isInvalidVariantPlan(logoType, plan)) {
                  candidates.push(plan)
                }
              }
            }
          }
        }
      }
    }
  }

  return candidates
}

const variantDistance = (a, b) => {
  let score = 0
  for (const key of DIMENSION_ORDER) {
    const av = a[key] || null
    const bv = b[key] || null
    if (av !== bv) score += 1
  }
  return score
}

const rankCandidatesDeterministically = (candidates, seedText) => {
  return [...candidates].sort((a, b) => {
    const ah = hashString(`${seedText}|${JSON.stringify(a)}`)
    const bh = hashString(`${seedText}|${JSON.stringify(b)}`)
    return ah - bh
  })
}

const applyWordmarkLayoutPolicy = ({ plans, candidates, targetCount }) => {
  // Business rule: vertical/stacked layout can appear at most once, preferably as the 3rd variant.
  if (!Array.isArray(plans) || !plans.length) return plans

  const target = Math.max(1, Number(targetCount) || plans.length)
  const pool = Array.isArray(candidates) && candidates.length ? candidates : plans

  const nonVerticalPool = pool.filter((p) => p.layout_structure !== 'wordmark-stacked')
  const verticalPool = pool.filter((p) => p.layout_structure === 'wordmark-stacked')

  // If we only ask for 1-2 variants, never use vertical wordmark layouts.
  if (target < 3) {
    const selected = []
    for (const p of nonVerticalPool) {
      if (!selected.includes(p)) selected.push(p)
      if (selected.length >= target) break
    }
    return selected.length ? selected : plans.slice(0, target)
  }

  const selectedNonVertical = []
  for (const p of nonVerticalPool) {
    if (!selectedNonVertical.includes(p)) selectedNonVertical.push(p)
  }

  const preferredVertical = plans.find((p) => p.layout_structure === 'wordmark-stacked')
    || verticalPool[0]
    || null

  const result = []

  // First two slots should stay non-vertical.
  result.push(...selectedNonVertical.slice(0, 2))

  // Third slot can be vertical (at most one vertical variant overall).
  if (preferredVertical) {
    result.push(preferredVertical)
  } else if (selectedNonVertical[2]) {
    result.push(selectedNonVertical[2])
  }

  // Fill remaining slots from non-vertical pool only.
  for (const p of selectedNonVertical) {
    if (result.length >= target) break
    if (!result.includes(p)) result.push(p)
  }

  return result.slice(0, target)
}

const generateVariantPlans = ({ logoType, count, seedText = '' }) => {
  const normalizedCount = [1, 3, 5].includes(Number(count)) ? Number(count) : 1
  const candidates = rankCandidatesDeterministically(buildCandidates(logoType), `${logoType}|${seedText}`)

  if (!candidates.length) {
    return []
  }

  const picked = [candidates[0]]
  const target = Math.min(normalizedCount, candidates.length)

  while (picked.length < target) {
    let best = null
    let bestScore = -1

    for (const candidate of candidates) {
      if (picked.includes(candidate)) continue
      const minDistance = Math.min(...picked.map((p) => variantDistance(candidate, p)))
      if (minDistance > bestScore) {
        bestScore = minDistance
        best = candidate
      }
    }

    if (!best) break
    picked.push(best)
  }

  const policyAdjusted = logoType === 'wordmark'
    ? applyWordmarkLayoutPolicy({ plans: picked, candidates, targetCount: target })
    : picked

  return policyAdjusted.map((plan, index) => ({
    ...plan,
    variant_id: `v${index + 1}`,
    variant_label: `${asLabel(plan.layout_structure)} · ${asLabel(plan.motif_family)} · ${asLabel(plan.form_language)}`,
  }))
}

const normalizeIncomingVariantPlan = (plan, logoType) => {
  if (!plan || typeof plan !== 'object') return null

  const allowed = DIMENSIONS_BY_LOGO_TYPE[logoType] || DIMENSIONS_BY_LOGO_TYPE.pictorial
  const normalized = {}

  for (const key of Object.keys(allowed)) {
    const value = plan[key]
    if (!value) continue
    if (allowed[key].includes(value)) {
      normalized[key] = value
    }
  }

  if (!normalized.layout_structure || !normalized.motif_family || !normalized.form_language || !normalized.visual_weight || !normalized.color_treatment) {
    return null
  }

  if (isInvalidVariantPlan(logoType, normalized)) {
    return null
  }

  return normalized
}

const normalizeVariantPlans = ({ logoType, count, variantPlans, seedText }) => {
  if (Array.isArray(variantPlans) && variantPlans.length) {
    const cleaned = variantPlans
      .map((p) => normalizeIncomingVariantPlan(p, logoType))
      .filter(Boolean)

    if (cleaned.length >= count) {
      const policyAdjusted = logoType === 'wordmark'
        ? applyWordmarkLayoutPolicy({ plans: cleaned, candidates: cleaned, targetCount: count })
        : cleaned.slice(0, count)

      if (policyAdjusted.length >= count) {
        return policyAdjusted.slice(0, count).map((plan, index) => ({
          ...plan,
          variant_id: plan.variant_id || `v${index + 1}`,
          variant_label: plan.variant_label || `${asLabel(plan.layout_structure)} · ${asLabel(plan.motif_family)} · ${asLabel(plan.form_language)}`,
        }))
      }
    }
  }

  return generateVariantPlans({ logoType, count, seedText })
}

const buildVariantPlanDirectives = (plan, options = {}) => {
  const { lockColorTreatment = false } = options
  const lines = []

  for (const key of DIMENSION_ORDER) {
    if (lockColorTreatment && key === 'color_treatment') continue

    const value = plan[key]
    if (!value) continue

    const translated = TRANSLATION_MAP[key]?.[value]
    if (translated) {
      lines.push(`- ${translated}`)
    } else {
      lines.push(`- ${key}: ${asLabel(value)}`)
    }
  }

  return lines
}

const normalizeEditScope = (brief) => {
  const raw = String(brief?.edit_scope || brief?.editScope || '').toLowerCase().trim()
  if (['text_only', 'icon_only', 'both'].includes(raw)) return raw
  return null
}

const buildEditScopeContract = ({ brief, logoType }) => {
  const scope = normalizeEditScope(brief)
  if (!scope || scope === 'both') return null

  if (scope === 'text_only') {
    if (['wordmark', 'lettermark'].includes(logoType)) {
      return 'EDIT SCOPE CONTRACT (TEXT-ONLY): Change typography treatment only (letterform style, spacing, decorative text lines). Do not introduce a new icon/symbol concept.'
    }

    return 'EDIT SCOPE CONTRACT (TEXT-ONLY): Keep existing icon/symbol geometry and silhouette unchanged. Apply changes only to typography/text arrangement and decorative text lines.'
  }

  if (scope === 'icon_only') {
    if (['pictorial', 'abstract'].includes(logoType)) {
      return 'EDIT SCOPE CONTRACT (ICON-ONLY): Evolve symbol geometry only. Do not add any text/lettering.'
    }

    return 'EDIT SCOPE CONTRACT (ICON-ONLY): Keep existing text wording and typography style unchanged (except minimal fit/position adjustments). Apply visible changes to icon/symbol only.'
  }

  return null
}

const shouldLockColorAnchors = ({ brief, generationStage, formData }) => {
  if (generationStage !== 'refine') return false

  const preserveText = Array.isArray(brief?.preserve)
    ? brief.preserve.join(' ').toLowerCase()
    : ''
  const directionText = String(brief?.new_direction || '').toLowerCase()
  const hasColorIntentInBrief = /(color|colour|palette|gradient|neon)/.test(preserveText) || /(keep|preserve).{0,20}(color|colour|palette|gradient|neon)/.test(directionText)

  const explicitOverrideColor = String(
    brief?.mutable_overrides?.colors
    || brief?.delta?.overrides?.colors
    || ''
  ).trim()

  // If user has an explicit color override in refine, keep it anchored across batch.
  if (explicitOverrideColor) return true

  // Fallback signal from preserve/new_direction language.
  return hasColorIntentInBrief && !!String(formData?.colors || '').trim()
}

const buildBriefedRefinementPrompts = ({ formData, brief, count, variantPlans, generationStage = 'initial' }) => {
  if (![1, 3, 5].includes(count)) {
    throw new Error('variationCount must be one of: 1, 3, 5')
  }

  const base = buildPromptScaffold(formData)

  const mustChange = Array.isArray(brief.must_change)
    ? brief.must_change.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  const briefBlock = [
    'DESIGN BRIEF:',
    `- Brand Essence: ${brief.brand_essence || ''}`,
    `- Mood: ${Array.isArray(brief.mood) ? brief.mood.join(', ') : ''}`,
    Array.isArray(brief.preserve) && brief.preserve.length ? `- Preserve: ${brief.preserve.join(', ')}` : null,
    Array.isArray(brief.avoid) && brief.avoid.length ? `- Avoid: ${brief.avoid.join(', ')}` : null,
    `- Direction this round: ${brief.new_direction || ''}`,
    mustChange.length ? `- Must change this round: ${mustChange.join('; ')}` : null,
    brief.typography_intent ? `- Typography intent: ${brief.typography_intent}` : null,
    Array.isArray(brief.visual_metaphors) && brief.visual_metaphors.length ? `- Visual metaphors: ${brief.visual_metaphors.join(', ')}` : null,
    brief.composition ? `- Composition: ${brief.composition}` : null,
  ].filter(Boolean).join('\n')

  const refInstructions = {
    preserve: 'REFERENCE USE: Start from previous design and apply targeted edits only.',
    context: 'REFERENCE USE: Previous output is context only. Follow the brief first.',
    reject: 'REFERENCE USE: Ignore previous output style/layout. Create a fresh direction from the brief.',
  }

  const ref = refInstructions[brief.reference_role] || refInstructions.context

  const mustChangeContract = mustChange.length
    ? `MUST-CHANGE CONTRACT: Apply ALL listed edits visibly in this output. Treat these as hard constraints: ${mustChange.join('; ')}.`
    : null

  const editScopeContract = buildEditScopeContract({ brief, logoType: formData.logoType })

  const seedText = [
    formData.businessName,
    brief.brand_essence,
    brief.new_direction,
    Array.isArray(brief.mood) ? brief.mood.join('|') : '',
  ].join('|')

  const plans = normalizeVariantPlans({
    logoType: formData.logoType,
    count,
    variantPlans: variantPlans || brief?.variant_plans,
    seedText,
  })

  const colorAnchored = shouldLockColorAnchors({ brief, generationStage, formData })
  const lockedColorValue = String(
    brief?.mutable_overrides?.colors
    || brief?.delta?.overrides?.colors
    || formData?.colors
    || ''
  ).trim()

  if (count === 1) {
    const soloPlan = plans[0]
    const planLines = soloPlan ? [
      'STRUCTURAL PLAN:',
      ...buildVariantPlanDirectives(soloPlan, { lockColorTreatment: colorAnchored }),
    ] : []

    const colorAnchorLine = colorAnchored && lockedColorValue
      ? `COLOR ANCHOR (LOCKED): Keep this exact color treatment: ${lockedColorValue}. Do not revert to default form colors.`
      : null

    return [[
      base,
      SINGLE,
      briefBlock,
      ...planLines,
      colorAnchorLine,
      mustChangeContract,
      editScopeContract,
      ref,
      'Return one finalized candidate that best satisfies all hard constraints.',
    ].filter(Boolean).join('\n')]
  }

  const batchPlan = plans
    .map((plan, idx) => `${idx + 1}) ${plan.variant_label}`)
    .join('\n')

  const colorAnchorLine = colorAnchored && lockedColorValue
    ? `COLOR ANCHOR (LOCKED): Keep this exact color treatment across ALL variants: ${lockedColorValue}. Do not drift back to default or alternate palettes.`
    : null

  return plans.map((plan, idx) => {
    const profileDirectives = buildVariantPlanDirectives(plan, { lockColorTreatment: colorAnchored }).join('\n')

    return [
      base,
      SINGLE,
      briefBlock,
      colorAnchorLine,
      mustChangeContract,
      editScopeContract,
      'VARIATION SET CONTRACT: this output belongs to a multi-variation batch and must be visually distinct from sibling outputs.',
      `BATCH PLAN:\n${batchPlan}`,
      `THIS OUTPUT MUST MATCH VARIANT ${idx + 1}: ${plan.variant_label}.`,
      `VARIANT DIRECTIVES:\n${profileDirectives}`,
      colorAnchored
        ? 'DIVERSITY REQUIREMENT: maximize structural difference (layout, motif, form language, visual weight) while keeping the locked color treatment constant.'
        : 'DIVERSITY REQUIREMENT: maximize meaningful structural difference (layout, motif, form language, visual weight, color treatment) while obeying all hard constraints.',
      ref,
    ].filter(Boolean).join('\n')
  })
}

module.exports = {
  buildBriefedRefinementPrompts,
  generateVariantPlans,
}
