/**
 * promptBuilder.ts — shared prompt logic for HeroProgressive + App.tsx
 */

export interface LogoFormData {
  businessName: string
  industry:     string
  description:  string
  logoType:     'wordmark' | 'lettermark' | 'combination' | 'pictorial' | 'abstract'
  style:        string
  colors:       string       // e.g. "cyan and violet" (empty means no fixed color)
  colorUsageRules?:  string       // optional free-form color guidance
  hasBackground: boolean
  backgroundValue?: string   // 'none' | 'white' | 'solid' | 'gradient' | 'glass' | 'dark'
  tagline?:     string       // optional tagline text
  dimension?:   string       // "2D" | "3D"
}

export interface DesignBrief {
  brand_essence:       string
  mood:                string[]
  preserve:            string[]
  avoid:               string[]
  new_direction:       string
  typography_intent:   string | null
  visual_metaphors:    string[]
  composition:         string | null
  reference_role:      'preserve' | 'context' | 'reject'
}

const SINGLE = 'CRITICAL: Generate ONLY ONE logo design per image. Do NOT show multiple variations in one image.'
const CORE_AVOID = `AVOID: badges, generic emblems, clipart look, heavy 3D bevels, mockup scenes, watermarks, and UI framing elements.`

function safe(value: string | undefined, fallback: string): string {
  const v = (value || '').trim()
  return v.length ? v : fallback
}

function getLogoTypeInstruction(logoType: LogoFormData['logoType'], businessName: string): string {
  const name = safe(businessName, 'the brand name')

  const instructions: Record<LogoFormData['logoType'], string> = {
    wordmark:
      `WORDMARK ONLY: Render the full business name exactly as readable text: "${name}". Typography-only. No icon, no symbol, no standalone mark.`,
    lettermark:
      `LETTERMARK ONLY: Create a stylized initials/monogram mark derived from the business name. Do not render the full business name. No standalone pictorial icon.`,
    combination:
      `COMBINATION MARK: Include BOTH a distinct icon/symbol and the readable business name "${name}" in one balanced lockup. Not icon-only. Not text-only.`,
    pictorial:
      'PICTORIAL ONLY: Icon/symbol only. Zero text, letters, words, or monogram.',
    abstract:
      'ABSTRACT ONLY: Non-literal abstract geometric/organic symbol only. Zero text and no literal object depiction.'
  }

  return instructions[logoType]
}

function getBackgroundInstruction(hasBackground: boolean, backgroundValue?: string): string {
  // Gemini doesn't support true transparency - default to white for 'none' or missing
  const effectiveBg = (!hasBackground || backgroundValue === 'none') ? 'white' : (backgroundValue || 'white');

  const bgMap: Record<string, string> = {
    white: `BACKGROUND: Solid pure white background (#FFFFFF only).
- NOT off-white, NOT cream, NOT beige.
- NO texture, NO pattern, NO gradient, NO vignette.
- Solid flat white only.`,
    neon: `BACKGROUND: Dark background with vibrant neon glow effect.
- Use deep black or dark charcoal base.
- Add electric neon accents (cyan, magenta, lime, or orange glow).
- The glow should emanate from or around the logo elements.
- High contrast between dark bg and bright neon elements.`,
    solid: `BACKGROUND: Solid flat color background.
- Use the primary brand color as a flat solid fill.
- NO gradient, NO texture, NO pattern.`,
    gradient: `BACKGROUND: Subtle smooth gradient.
- Use brand colors in a soft gradient.
- Must be subtle and not overpower the logo.`,
    glass: `BACKGROUND: Soft frosted glass effect.
- Subtle blur/depth effect only.
- Keep minimal and modern.`,
    dark: `BACKGROUND: Dark near-black solid background (#0a0a0a to #1a1a1a).
- Solid dark color only, NO patterns.
- Logo must have strong contrast.`,
  }

  return bgMap[effectiveBg] || bgMap['white']
}

function getStyleInstruction(f: LogoFormData): string {
  const style = safe(f.style, 'modern, clean, professional')
  const dimension = f.dimension ? ` ${f.dimension} style.` : ''
  return `Style direction: ${style}.${dimension}`
}

function getColorInstruction(colors: string, colorUsageRules?: string): string {
  const fixed = safe(colors, '')
  const notes = safe(colorUsageRules, '')

  if (fixed && notes) return `Color constraints: ${fixed}. Additional color usage rules: ${notes}.`
  if (fixed) return `Color constraints: ${fixed}.`
  if (notes) return `No fixed palette selected. Follow these color usage rules: ${notes}.`

  return 'No fixed color selected. Choose the best palette from brand context and style direction.'
}

function buildPromptScaffold(f: LogoFormData): string {
  const businessName = safe(f.businessName, 'Untitled')
  const industry = safe(f.industry, 'Not specified')
  const description = safe(f.description, 'Not specified')

  const lines: string[] = [
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
    '',
    CORE_AVOID,
    'Output quality: clean centered composition, strong legibility at small sizes.'
  ]

  return lines.join('\n')
}

export function buildBasePrompt(f: LogoFormData): string {
  return buildPromptScaffold(f)
}

export function buildPromptVariations(f: LogoFormData): string[] {
  const base = buildPromptScaffold(f)

  const mk = (variation: string) => `${base}\n${SINGLE}\nCREATIVE DIRECTION: ${variation}`

  return [
    mk('Modern and clean with balanced geometry and high readability.'),
    mk('Geometric minimalism with strong negative space discipline.'),
    mk('Bold, confident silhouette with high visual impact at small sizes.'),
    mk('Elegant premium direction with refined spacing and visual hierarchy.'),
    mk('Distinctive and ownable concept that avoids generic stock-logo patterns.'),
  ]
}

export function buildRefinementPrompts(
  f: LogoFormData,
  feedback: string,
  count: 1 | 3 | 5,
  previousFeedback: string[] = []
): string[] {
  const base = buildPromptScaffold(f)

  const prior = previousFeedback
    .map(v => v?.trim())
    .filter(Boolean)
    .map((v, i) => `${i + 1}) ${v}`)
    .join(' | ')

  const memory = prior
    ? `Previous approved directions to preserve unless explicitly overridden: ${prior}.`
    : 'No prior approved directions.'

  const latest = feedback.trim()
    ? `LATEST CHANGES (highest priority): ${feedback.trim()}`
    : 'LATEST CHANGES: keep previous design intent and improve quality subtly.'

  const prompt = [
    base,
    SINGLE,
    memory,
    latest,
    'Keep the current concept unchanged EXCEPT for requested edits above.',
    'Do not alter logo type, background rule, or brand text rules unless explicitly requested.'
  ].join('\n')

  return Array.from({ length: count }, () => prompt)
}

// ── Phase 1: Director Agent prompts ──────────────────────────────────────────
// Uses structured design brief from /api/interpret-brief instead of raw text

interface VariationProfile {
  label: string
  signature: string
  directives: string[]
}

function getVariationProfiles(logoType: LogoFormData['logoType'], count: 1 | 3 | 5): VariationProfile[] {
  const byType: Record<LogoFormData['logoType'], VariationProfile[]> = {
    wordmark: [
      {
        label: 'Expressive brush script',
        signature: 'high stroke contrast, steep slant, connected rhythm',
        directives: [
          'Use bold stroke contrast with clear thick-to-thin transitions.',
          'Keep a pronounced right slant and connected cursive rhythm.',
          'Use rounded terminals and smooth flowing joins.'
        ]
      },
      {
        label: 'Monoline marker handwrite',
        signature: 'uniform stroke width, moderate slant, separated letters',
        directives: [
          'Use mostly uniform stroke thickness (monoline feel).',
          'Keep only a mild slant and slightly wider tracking.',
          'Favor partially separated letterforms over full connections.'
        ]
      },
      {
        label: 'Upright handmade sans',
        signature: 'near-upright stance, chunky forms, low flourish',
        directives: [
          'Keep letters near-upright with minimal italic angle.',
          'Use broader, chunkier shapes with low ornamentation.',
          'Short, controlled terminals; prioritize blocky readability.'
        ]
      },
      {
        label: 'Angular pen script',
        signature: 'medium contrast, faceted curves, dynamic cuts',
        directives: [
          'Introduce subtle angular inflections in curves and joins.',
          'Use medium stroke contrast and tighter internal counters.',
          'Use sharper entry/exit cuts versus rounded swashes.'
        ]
      },
      {
        label: 'Condensed calligraphic',
        signature: 'narrow proportions, tall rhythm, compact spacing',
        directives: [
          'Use narrower letter widths with taller overall rhythm.',
          'Keep spacing compact but still clearly legible.',
          'Use concise calligraphic endings without large flourishes.'
        ]
      }
    ],
    lettermark: [
      {
        label: 'Geometric monogram',
        signature: 'clean geometry, even stroke, strict symmetry cues',
        directives: [
          'Build initials from geometric primitives with balanced symmetry.',
          'Use consistent stroke thickness and crisp intersections.'
        ]
      },
      {
        label: 'Calligraphic monogram',
        signature: 'stroke contrast, fluid motion, premium feel',
        directives: [
          'Use visible calligraphic contrast and flowing stroke motion.',
          'Keep endpoints refined and elegant.'
        ]
      },
      {
        label: 'Stencil monogram',
        signature: 'segmented forms, engineered aesthetic',
        directives: [
          'Use stencil-like cuts or strategic gaps in the structure.',
          'Keep the mark robust at small size with strong silhouette.'
        ]
      },
      {
        label: 'Inline-outline monogram',
        signature: 'double-line rhythm, layered depth in 2D',
        directives: [
          'Use inline/outline layering while preserving clean legibility.',
          'Keep the design flat (2D), no 3D extrusion.'
        ]
      },
      {
        label: 'Compact emblematic monogram',
        signature: 'dense lockup, strong negative-space control',
        directives: [
          'Create a compact interlocked monogram composition.',
          'Use deliberate negative space to keep letter recognition clear.'
        ]
      }
    ],
    combination: [
      {
        label: 'Symbol-left horizontal lockup',
        signature: 'clean icon + wordmark, balanced baseline',
        directives: [
          'Place symbol to the left of text in a horizontal lockup.',
          'Keep icon simple and tightly aligned to text baseline.'
        ]
      },
      {
        label: 'Stacked lockup',
        signature: 'icon above text, centered hierarchy',
        directives: [
          'Use a centered stacked composition (icon above text).',
          'Make hierarchy explicit with clear spacing blocks.'
        ]
      },
      {
        label: 'Integrated symbol-letter hybrid',
        signature: 'icon fused with initial while text remains readable',
        directives: [
          'Integrate symbol logic into one letter while keeping full name readable.',
          'Avoid full icon replacement of the name.'
        ]
      },
      {
        label: 'Badge-lite lockup',
        signature: 'contained but minimal frame, system-ready',
        directives: [
          'Use a very minimal container/frame to unify symbol and text.',
          'Avoid heavy emblem style; keep modern and lightweight.'
        ]
      },
      {
        label: 'Dynamic offset lockup',
        signature: 'asymmetric placement, bold visual rhythm',
        directives: [
          'Use intentional asymmetry between icon and text blocks.',
          'Preserve strong readability despite dynamic placement.'
        ]
      }
    ],
    pictorial: [
      {
        label: 'Geometric minimal icon',
        signature: 'clean primitive forms, high clarity silhouette',
        directives: [
          'Construct icon from simple geometric primitives.',
          'Prioritize unmistakable silhouette at tiny sizes.'
        ]
      },
      {
        label: 'Organic curved icon',
        signature: 'soft contours, friendly motion',
        directives: [
          'Use smooth organic curves and softer transitions.',
          'Maintain simple fill structure and avoid over-detail.'
        ]
      },
      {
        label: 'Angular tech icon',
        signature: 'faceted edges, precise engineered feel',
        directives: [
          'Use angular cuts and crisp directional edges.',
          'Keep icon compact and structurally coherent.'
        ]
      },
      {
        label: 'Negative-space icon',
        signature: 'hidden shape reveal via cutouts',
        directives: [
          'Use negative-space cutouts to reveal a secondary shape.',
          'Keep the main silhouette strong and uncluttered.'
        ]
      },
      {
        label: 'Emblematic flat icon',
        signature: 'solid filled mark, bold center of mass',
        directives: [
          'Use a bold filled icon with stable visual weight.',
          'Keep flat 2D styling, no shading or mockup context.'
        ]
      }
    ],
    abstract: [
      {
        label: 'Radial abstract form',
        signature: 'centered radial balance, smooth repetition',
        directives: [
          'Use radial or rotational balance with clean repetition.',
          'Keep geometry simple and ownable.'
        ]
      },
      {
        label: 'Directional abstract shard',
        signature: 'forward motion, asymmetrical tension',
        directives: [
          'Create a directional abstract mark with forward momentum.',
          'Use asymmetry deliberately while keeping cohesion.'
        ]
      },
      {
        label: 'Interlocking abstract loops',
        signature: 'continuous flow, modular rhythm',
        directives: [
          'Build abstract form from interlocking loop-like modules.',
          'Keep continuity clean and avoid clutter.'
        ]
      },
      {
        label: 'Monolithic abstract block',
        signature: 'single mass silhouette, carved interior',
        directives: [
          'Use a monolithic single-mass shape with carved internal structure.',
          'Prioritize bold silhouette over fine detail.'
        ]
      },
      {
        label: 'Minimal wave abstract',
        signature: 'flowing layered curves, calm premium feel',
        directives: [
          'Use layered wave-like curves with restrained complexity.',
          'Preserve high legibility in black-and-white form.'
        ]
      }
    ]
  }

  return byType[logoType].slice(0, count)
}

export function buildBriefedRefinementPrompts(
  f: LogoFormData,
  brief: DesignBrief,
  count: 1 | 3 | 5
): string[] {
  const base = buildPromptScaffold(f)

  const briefBlock = [
    'DESIGN BRIEF:',
    `- Brand Essence: ${brief.brand_essence}`,
    `- Mood: ${(brief.mood || []).join(', ')}`,
    (brief.preserve || []).length ? `- Preserve: ${brief.preserve.join(', ')}` : null,
    (brief.avoid || []).length ? `- Avoid: ${brief.avoid.join(', ')}` : null,
    `- Direction this round: ${brief.new_direction}`,
    brief.typography_intent ? `- Typography intent: ${brief.typography_intent}` : null,
    (brief.visual_metaphors || []).length ? `- Visual metaphors: ${brief.visual_metaphors.join(', ')}` : null,
    brief.composition ? `- Composition: ${brief.composition}` : null,
  ].filter(Boolean).join('\n')

  const refInstructions: Record<DesignBrief['reference_role'], string> = {
    preserve: 'REFERENCE USE: Start from previous design and apply targeted edits only.',
    context:  'REFERENCE USE: Previous output is context only. Follow the brief first.',
    reject:   'REFERENCE USE: Ignore previous output style/layout. Create a fresh direction from the brief.'
  }

  const ref = refInstructions[brief.reference_role]

  if (count === 1) {
    return [
      [
        base,
        SINGLE,
        briefBlock,
        ref,
        'Return one finalized candidate that best satisfies all hard constraints.'
      ].join('\n')
    ]
  }

  const profiles = getVariationProfiles(f.logoType, count)
  const batchPlan = profiles
    .map((profile, idx) => `${idx + 1}) ${profile.label} — ${profile.signature}`)
    .join('\n')

  return profiles.map((profile, idx) => {
    const profileDirectives = profile.directives.map((line) => `- ${line}`).join('\n')

    return [
      base,
      SINGLE,
      briefBlock,
      'VARIATION SET CONTRACT: this output belongs to a multi-variation batch and must be visually distinct from sibling outputs.',
      `BATCH STYLE PLAN:\n${batchPlan}`,
      `THIS OUTPUT MUST MATCH PROFILE ${idx + 1}: ${profile.label}.`,
      `PROFILE DIRECTIVES:\n${profileDirectives}`,
      'DIVERSITY REQUIREMENT: change letter construction, stroke behavior, spacing rhythm, and overall silhouette relative to other profiles while still obeying hard constraints.',
      ref
    ].join('\n')
  })
}
