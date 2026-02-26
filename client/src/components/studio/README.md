# Dark Studio Design System

## Overview
New visual direction for Craft Your Logo: **Premium dark glassmorphism** inspired by Domeo's operational glass utility, but inverted for a studio/agency feel.

## Key Principles

### From Domeo (adapted)
- **Glassmorphism DNA**: Translucent surfaces, backdrop blur, subtle borders
- **Consistency over novelty**: Reusable component patterns
- **Functional motion**: Only purposeful animations

### New for Logo Maker
- **Dark mode base**: Deep void (`#0a0a0f`) instead of light
- **Cyan accent**: Professional, calm (not neon rave)
- **Trust-first UI**: Explicit security signals for payments
- **Studio aesthetic**: Refined typography, generous whitespace

## Components

### `StudioCard`
Primary glass container:
```tsx
<StudioCard variant="default|elevated|subtle">
  Content
</StudioCard>
```

### `StudioButton`
Actions with cyan glow:
```tsx
<StudioButton variant="primary|secondary|ghost" size="sm|md|lg">
  Click me
</StudioButton>
```

### `StudioHeader`
Minimal nav with trust badges

### `LogoResultCard`
Glass card for generated logos with hover overlay

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#0a0a0f` | Page background |
| `--bg-elevated` | `#12121a` | Elevated surfaces |
| `--accent-cyan` | `#0891b2` | Primary actions |
| `glass-bg` | `rgba(255,255,255,0.03)` | Card backgrounds |
| `glass-border` | `rgba(255,255,255,0.06)` | Card borders |

## View the Demo

To preview the new design:

```tsx
// In App.tsx, temporarily import and render:
import { StudioDesignDemo } from './components/studio';

function App() {
  return <StudioDesignDemo />;
}
```

The demo shows three tabs:
1. **Form** — The generation input with new styling
2. **Results** — Logo grid with hover interactions
3. **Upgrade** — Payment page with trust signals

## Migration Path

### Phase 1: Foundation
- [ ] Import `dark-studio.css` in main.tsx
- [ ] Replace `retro-mono` classes with Inter font
- [ ] Update base background to `#0a0a0f`

### Phase 2: Components
- [ ] Replace header with `StudioHeader`
- [ ] Convert cards to `StudioCard`
- [ ] Update buttons to `StudioButton`

### Phase 3: Pages
- [ ] Redesign form page
- [ ] Redesign results grid
- [ ] Redesign upgrade/payment flow

### Phase 4: Polish
- [ ] Remove old CSS files (animations.css retro styles)
- [ ] Clean up unused classes
- [ ] Final contrast/legibility check

## What Changes

### Before (Retro)
- Phosphate font, neon gradients
- "CYBER" / "RETRO" vibes
- Terminal aesthetics
- Bright pink/purple accents

### After (Studio)
- Inter font, subtle cyan
- Premium SaaS feel
- Glass depth layers
- Trust/security signals

## Files

- `StudioCard.tsx` — Glass container primitive
- `StudioButton.tsx` — Action buttons
- `StudioHeader.tsx` — Navigation header
- `LogoResultCard.tsx` — Logo display
- `StudioDesignDemo.tsx` — Full preview page
- `dark-studio.css` — Global styles
- `DESIGN_SYSTEM_DARK_STUDIO.md` — Full spec
