# Solo Refine System Fixes

## Issues Identified

### 1. **Solo refine requires selection**
- **Problem**: `startSingleLogoRefinement()` sets `selectedLogos([logo])` line 1170, but the logo must already be in current `logos` array
- **Impact**: When refining a logo from a previous round, it may not work properly
- **Fix**: Ensure the focused logo is always available, don't require it to be "selected"

### 2. **Round-based limits instead of credit-based**
- **Problem**: Blocking happens at `currentRound >= 3` (lines 2669, 2692, 2718, 2754)
- **Impact**: Solo refine uses 1 credit but still shows "round 3" message
- **Current**: "Continue refining beyond 3 rounds"
- **Should be**: "Continue refining - 15 credits used"

### 3. **Confusing round numbering**
- **Problem**: When solo refining, new generations get inserted with wrong round numbers
- **Impact**: Round display order is inconsistent
- **Example**: Do 3 rounds → solo refine from round 1 → it appears as "round 2" between round 1 and 2

### 4. **Premium message is round-focused**
- **Problem**: Lines 2674, 2762 say "beyond 3 rounds"
- **Should say**: "You've used all 15 free credits"

## Proposed Solutions

### Solution 1: Credit-Based Gating (Not Round-Based)

**Current Logic**:
```typescript
{currentRound >= 3 && !isPremiumUser() && (
  <overlay>Premium Feature - Continue refining beyond 3 rounds</overlay>
)}
```

**New Logic**:
```typescript
{usage.remaining <= 0 && !isPremiumUser() && (
  <overlay>Premium Feature - You've used all 15 free credits</overlay>
)}
```

### Solution 2: Fix Solo Refine to Not Require Selection

**Current**:
```typescript
const startSingleLogoRefinement = (logo: Logo) => {
  setFocusedLogo(logo)
  setRefinementMode('single')
  setSelectedLogos([logo]) // ← Requires logo to be in current round
  ...
}
```

**New**:
```typescript
const startSingleLogoRefinement = (logo: Logo) => {
  setFocusedLogo(logo)
  setRefinementMode('single')
  // Don't set selectedLogos - we'll use focusedLogo directly
  ...
}
```

Then in `refinePromptFromSelection()`:
```typescript
const refinePromptFromSelection = (
  _selectedLogos: Logo[],
  formData: FormData,
  feedback?: string,
  focusedLogo?: Logo | null // ← Add this parameter
): string[] => {
  // Use focusedLogo if in single mode, otherwise use selectedLogos
  const logoToRefine = focusedLogo || _selectedLogos[0]
  ...
}
```

### Solution 3: Separate Round Tracking for Solo Refine

Instead of incrementing `currentRound` for solo refines, track them separately:

```typescript
interface GenerationRound {
  round: number
  logos: Logo[]
  selectedLogos: Logo[]
  isSoloRefine?: boolean // ← Add this
  soloRefineOf?: number  // ← Which round was this refining?
}
```

**Display logic**:
- Normal rounds: "Round 1", "Round 2", "Round 3"
- Solo refines: "Iteration of Logo #X" (don't call it a "round")

### Solution 4: Update All Premium Messages

**Find and replace**:
- "beyond 3 rounds" → "You've used all 15 free credits"
- "Continue refining beyond 3 rounds" → "Get unlimited credits to keep refining"
- "round 3+" → "after 15 credits"

## Implementation Priority

1. **HIGH**: Change round-based gating to credit-based gating
2. **HIGH**: Update premium prompt messages
3. **MEDIUM**: Fix solo refine selection requirement
4. **LOW**: Improve round numbering/display (cosmetic)

## Files to Modify

1. `client/src/App.tsx`
   - Lines 2669-2676: Premium overlay condition
   - Lines 2692: Textarea disabled condition
   - Lines 2718: Refine button condition
   - Lines 2754-2762: Upgrade button condition and text
   - Lines 1167-1180: `startSingleLogoRefinement` function
   - Lines 182-229: `refinePromptFromSelection` to accept focusedLogo
   - Lines 874-881: Generation logic to use focusedLogo

2. Update messages:
   - "Continue refining beyond 3 rounds" → "Get unlimited credits"
   - "Premium Feature" description

## Testing Checklist

- [ ] Generate 3 normal rounds (uses 3 credits)
- [ ] Solo refine a logo (uses 1 credit, total 4)
- [ ] Verify can continue until 15 credits used
- [ ] Verify upgrade prompt appears at credit 16, not round 3
- [ ] Solo refine from round 1, verify it doesn't mess up round numbering
- [ ] Solo refine works without needing to select logo first
- [ ] Premium users can refine unlimited
