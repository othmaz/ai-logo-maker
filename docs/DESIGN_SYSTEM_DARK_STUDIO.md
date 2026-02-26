# Craft Your Logo — Dark Studio Design System

## Vibe
**Premium Design Studio** — Dark glass cockpit for creative professionals. Think Linear meets Apple Pro Display, not cyberpunk rave.

## Color Architecture

### Base Environment
```
--bg-primary: #0a0a0f        (Deep void — almost black with subtle blue tint)
--bg-secondary: #12121a      (Elevated surfaces)
--bg-tertiary: #1a1a25       (Input fields, hover states)
```

### Glass Surfaces (The Core)
```
Primary Card:
- bg: rgba(255, 255, 255, 0.03)
- backdrop-blur: 24px (blur-3xl)
- border: 1px solid rgba(255, 255, 255, 0.06)
- shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)

Interactive/Secondary:
- bg: rgba(255, 255, 255, 0.06)
- backdrop-blur: 16px (blur-2xl)
- border: 1px solid rgba(255, 255, 255, 0.1)
```

### Accent (Cyan — Subtle)
```
--accent-primary: #0891b2    (cyan-600 — calm, professional)
--accent-glow: rgba(8, 145, 178, 0.3)
--accent-subtle: rgba(8, 145, 178, 0.1)

Gradients:
- Primary button: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)
- Hover glow: 0 0 20px rgba(8, 145, 178, 0.3)
```

### Typography
```
Headlines: Inter, system-ui (clean, modern)
- H1: text-4xl font-bold tracking-tight text-white
- H2: text-2xl font-semibold text-white
- Body: text-sm text-gray-300
- Muted: text-xs text-gray-500

Accent text: cyan-400 for highlights, not neon
```

## Component Patterns

### Studio Card (Main Container)
```tsx
className="relative overflow-hidden rounded-2xl
  bg-white/[0.03] backdrop-blur-3xl
  border border-white/[0.06]
  shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]"
```

### Primary CTA Button
```tsx
className="relative px-6 py-3 rounded-xl font-medium text-white
  bg-gradient-to-r from-cyan-600 to-cyan-500
  hover:from-cyan-500 hover:to-cyan-400
  shadow-[0_0_20px_rgba(8,145,178,0.3)]
  transition-all duration-200
  active:scale-[0.98]"
```

### Secondary Button
```tsx
className="px-4 py-2 rounded-lg font-medium text-gray-300
  bg-white/[0.06] hover:bg-white/[0.1]
  border border-white/[0.1] hover:border-white/[0.15]
  backdrop-blur-xl
  transition-all duration-200"
```

### Input Field
```tsx
className="w-full px-4 py-3 rounded-xl bg-[#1a1a25]
  border border-white/[0.08] focus:border-cyan-500/50
  text-white placeholder-gray-500
  focus:outline-none focus:ring-1 focus:ring-cyan-500/30
  transition-all duration-200"
```

### Logo Result Card
```tsx
className="group relative overflow-hidden rounded-2xl
  bg-white/[0.02] backdrop-blur-2xl
  border border-white/[0.05] hover:border-cyan-500/30
  transition-all duration-300
  hover:shadow-[0_0_30px_rgba(8,145,178,0.15)]"
```

## Trust Signals Layout

### Payment Section
- Shield icon + "Secure SSL Encryption" microcopy
- Stripe logo (grayscale, subtle)
- "One-time payment. No subscription." explicit copy
- Lock icon on pay button

### Header/Nav
- Minimal logo + app name
- Clean user menu (no retro terminal styling)
- Subtle "Premium" badge for paid users

## Animation Principles

- **Hover**: Subtle scale (1.02) + border glow
- **Page transitions**: Fade only (200ms), no bouncy entrances
- **Loading**: Cyan pulse ring, not retro terminal spinner
- **Success**: Gentle checkmark draw, not celebration confetti

## What We Remove

- ❌ Phosphate font (too niche)
- ❌ Retro-mono class (breaks trust)
- ❌ Neon pink/purple accents (too playful)
- ❌ Animated grid backgrounds (distracting)
- ❌ "RETRO" "CYBER" "TERMINAL" vibes

## What We Keep (Functional)

- ✅ The generation flow (it works)
- ✅ Multi-format downloads
- ✅ Heart/save interactions (but restyle)
- ✅ Progress indicators (but calmer)
