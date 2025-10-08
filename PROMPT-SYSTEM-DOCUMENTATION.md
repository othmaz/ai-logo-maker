# Logo Generation Prompt System Documentation

## Overview

This document details the complete prompt engineering system used for AI logo generation in Craft Your Logo. The system uses a multi-layered approach combining base prompts, variation strategies, and refinement techniques.

---

## System Architecture

### Flow Diagram

```
User Input → buildBasePrompt() → createPromptVariations() → Server Enhancement → Gemini API
     ↓
Selected Logos → refinePromptFromSelection() → Server Enhancement → Gemini API
```

---

## 1. Base Prompt Construction

**Location**: `client/src/App.tsx` - `buildBasePrompt()` (lines 118-133)

### Purpose
Creates the foundational prompt from user-provided business information.

### Input Parameters (FormData)
- `businessName`: Company/business name (required)
- `industry`: Business industry/category (optional)
- `description`: Business description (optional)

### Logic
```typescript
const buildBasePrompt = (formData: FormData): string => {
  const { businessName, industry, description } = formData

  let prompt = `Create a logo for "${businessName}".`

  if (industry && description) {
    prompt += ` ${description}.`
  } else if (description) {
    prompt += ` ${description}.`
  } else if (industry) {
    prompt += ` A ${industry} business.`
  }

  return prompt
}
```

### Example Outputs
- Minimal: `"Create a logo for "TechFlow"."`
- With industry: `"Create a logo for "TechFlow". A software development business."`
- Full: `"Create a logo for "TechFlow". Innovative cloud-based project management platform."`

---

## 2. Initial Generation - Prompt Variations

**Location**: `client/src/App.tsx` - `createPromptVariations()` (lines 135-180)

### Purpose
Generates 5 distinct prompt variations for diverse logo options in the first generation round.

### Input Parameters (FormData)
- `businessName`, `industry`, `description` (via basePrompt)
- `colors`: User-specified color preferences
- `hasBackground`: Boolean for background preference
- `aestheticDirections`: Custom style notes from user
- `uploadedImages`: Array of reference images
- `logoType`: 'wordmark' | 'pictorial'

### Prompt Components

#### 1. Logo Type Instruction
```typescript
const logoTypeInstruction = logoType === 'wordmark'
  ? 'FOCUS ON WORDMARK: Create text-based logos with beautiful typography, custom letterforms, and minimal or no symbols. The company name should be the primary design element. '
  : 'FOCUS ON PICTORIAL: Create icon-based or symbol-based logos with ABSOLUTELY NO TEXT OR WORDS. Design a memorable symbol, icon, or pictorial mark that represents the business. DO NOT include the business name, letters, or any text whatsoever - only pure visual symbols/icons. '
```

**Key Changes Made**:
- Pictorial mode now explicitly prohibits ALL text/words
- Uses all-caps "ABSOLUTELY NO TEXT" for emphasis
- Repeats the no-text instruction multiple times

#### 2. Background Style
```typescript
const backgroundStyle = hasBackground
  ? 'Include a subtle solid color or gentle gradient background. Keep the background very minimal and not distracting. '
  : 'IMPORTANT: Use completely WHITE background (#FFFFFF) with no gradients, no patterns, no textures. '
```

#### 3. Aesthetic Style
```typescript
const aestheticStyle = aestheticDirections
  ? `Additional style notes: ${aestheticDirections}. `
  : ''
```

#### 4. Custom Image Inspiration
```typescript
const customImageInspiration = uploadedImages.length > 0
  ? `The user has provided ${uploadedImages.length} custom reference image${uploadedImages.length > 1 ? 's' : ''} showing their preferred design style. `
  : ''
```

#### 5. No Tagline Instruction
```typescript
const noTaglineInstruction = 'IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements. '
```

### The 5 Variations

#### Variation 1: Modern Brand Wordmark
**Focus**: Contemporary typography like major brands
```
${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}
Create a clean, modern wordmark like contemporary big brands. Use a sophisticated,
custom typeface with perfect letter spacing. Simple, elegant typography.
${backgroundStyle}${colors ? `Consider ${colors} but prioritize readability and elegance.` : 'Use minimal colors - could be black on white or single accent color.'}
${noTaglineInstruction}
```

#### Variation 2: Minimal Symbol + Text
**Focus**: Geometric symbol with typography
```
${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}
Design a simple geometric symbol paired with clean typography. Minimal iconic element with the wordmark.
${backgroundStyle}${colors ? `Use ${colors} sparingly and strategically.` : 'Keep colors minimal and purposeful.'}
${noTaglineInstruction}
```

#### Variation 3: Pure Typography Focus
**Focus**: Typography-only approach
```
${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}
Focus entirely on beautiful, modern typography. No symbols or icons - just perfectly crafted lettering.
${backgroundStyle}${colors ? `Incorporate ${colors} in the text treatment.` : 'Use sophisticated color choices.'}
${noTaglineInstruction}
```

#### Variation 4: Geometric Minimalism
**Focus**: Simple geometric shapes
```
${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}
Use very simple geometric shapes - circles, squares, triangles. Clean, mathematical precision.
${backgroundStyle}${colors ? `Work ${colors} into the geometric elements.` : 'Use bold but minimal color palette.'}
${noTaglineInstruction}
```

#### Variation 5: Lettermark/Monogram
**Focus**: Initials-based design
```
${basePrompt} ${logoTypeInstruction}${aestheticStyle}${customImageInspiration}
Create a sophisticated lettermark or monogram using initials. Contemporary and refined.
${backgroundStyle}${colors ? `Use ${colors} in the lettermark design.` : 'Choose premium, professional colors.'}
${noTaglineInstruction}
```

---

## 3. Refinement Prompts (Rounds 2-3+)

**Location**: `client/src/App.tsx` - `refinePromptFromSelection()` (lines 182-228)

### Purpose
Refines selected logos based on user feedback while maintaining core design elements.

### Input Parameters
- `selectedLogos`: Array of Logo objects (with image data)
- `formData`: Same as initial generation
- `feedback`: Optional user refinement instructions

### Prompt Components

#### 1. Logo Type Instruction (Refinement)
```typescript
const logoTypeInstruction = logoType === 'wordmark'
  ? 'MAINTAIN WORDMARK FOCUS: This must remain a text-based logo with typography as the primary element. '
  : 'MAINTAIN PICTORIAL FOCUS: This must remain an icon/symbol-based logo with ABSOLUTELY NO TEXT OR WORDS - only visual symbols/icons. '
```

#### 2. Background Style (Critical)
```typescript
const backgroundStyle = hasBackground
  ? 'Keep subtle background if present. '
  : 'CRITICAL: Background must be completely WHITE (#FFFFFF) with NO gradients, NO colors, NO patterns. '
```

#### 3. Aesthetic Style
```typescript
const aestheticStyle = aestheticDirections
  ? `Style requirements: ${aestheticDirections}. `
  : ''
```

#### 4. Color Instruction
```typescript
const colorInstruction = colors
  ? `Color palette: ${colors}. `
  : 'Use appropriate professional colors. '
```

#### 5. User Feedback Integration
```typescript
const feedbackText = feedback && feedback.trim()
  ? `User refinement request: ${feedback.trim()}. `
  : ''
```

#### 6. Reference Image Context
```typescript
const referenceContext = 'REFINEMENT MODE: A reference image has been provided showing the selected logo. Study this image carefully and use it as the exact design foundation. '
```

### The 5 Refinement Prompts

All follow the same structure with slight variations:

```
${basePrompt} ${referenceContext}${logoTypeInstruction}${backgroundStyle}
${colorInstruction}${aestheticStyle}${feedbackText}[VARIATION_SPECIFIC_INSTRUCTION]
```

**Variation-Specific Instructions**:
1. "Keep the EXACT same layout, typography, composition, and design structure from the reference image while applying only the requested modifications."
2. "Preserve all core design elements from the reference image and apply the user's changes without altering the fundamental structure."
3. "Use the reference image as the base design and implement the requested changes while maintaining the same visual approach."
4. "Keep the design foundation from the reference image intact and apply the specific modifications requested by the user."
5. "Maintain the visual identity from the reference image while incorporating the user's refinement instructions."

---

## 4. Server-Side Enhancement

**Location**: `server/server.js` - `/api/generate` endpoint (lines 178-190)

### Initial Generation Enhancement
```javascript
let enhancedPrompt = `Create a professional, high-quality logo design. ${prompt}.
The logo should be clean, memorable, and suitable for business use.
Use high contrast colors, clear typography if text is included, and ensure the design works well at different sizes.
Style: modern and professional.
Format: square logo suitable for business applications.
IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements.`
```

### Refinement Enhancement
```javascript
if (referenceImages && referenceImages.length > 0) {
  enhancedPrompt = `${prompt} Keep the exact same design, layout, typography, and structure as shown in the provided image.
  Apply only the specific changes requested while preserving everything else identical to the reference image.`
}
```

---

## 5. Known Issues & Recent Fixes

### Issue 1: Pictorial Logos Showing Text ✅ FIXED
**Problem**: Pictorial logos sometimes included business names/text despite selection

**Root Cause**: Prompt used "minimal text" and "keep text secondary" which allowed some text

**Fix Applied** (lines 155-157, 192-194):
- Changed to "ABSOLUTELY NO TEXT OR WORDS"
- Added explicit "DO NOT include the business name, letters, or any text whatsoever"
- Repeated in both initial and refinement prompts

### Issue 2: Background Consistency
**Status**: Partially addressed

**Current Approach**:
- Uses "IMPORTANT" and "CRITICAL" prefixes
- Specifies exact hex color (#FFFFFF)
- Explicitly prohibits gradients/patterns

**Potential Improvement**: May need even more explicit negation

---

## 6. Prompt Engineering Best Practices Used

### 1. **Explicit Negation**
- "DO NOT include..."
- "ABSOLUTELY NO..."
- Uses all-caps for emphasis

### 2. **Repetition**
- Key constraints repeated multiple times
- Different phrasings of same requirement

### 3. **Specificity**
- Exact color codes (#FFFFFF)
- Concrete examples ("circles, squares, triangles")
- Style references ("like contemporary big brands")

### 4. **Hierarchical Instructions**
- CRITICAL > IMPORTANT > MAINTAIN > regular instructions
- Priority signaling through formatting

### 5. **Context Anchoring**
- "REFINEMENT MODE" prefix
- "Study this image carefully"
- Reference to "exact design foundation"

---

## 7. Recommendations for Improvement

### High Priority

1. **Pictorial Logo Enforcement**
   - Consider adding negative examples
   - May need post-processing validation
   - Could use image analysis to detect text

2. **Background Consistency**
   - Test if "NO background" works better than "WHITE background"
   - Consider post-processing to force white background

3. **Color Accuracy**
   - Current: "Consider ${colors}"
   - Better: "MUST use these exact colors: ${colors}"

### Medium Priority

4. **Variation Diversity**
   - Some variations feel similar (1 & 3, 2 & 4)
   - Could introduce more distinct styles (vintage, tech, organic, etc.)

5. **Refinement Consistency**
   - All 5 refinement prompts are very similar
   - Could reduce to 2-3 or make them more distinct

6. **Typography Control**
   - No explicit font family guidance
   - Could add "avoid script fonts" or "use sans-serif only"

### Low Priority

7. **Industry-Specific Templates**
   - Could have specialized prompts for tech, food, medical, etc.

8. **A/B Testing Framework**
   - Track which variations users select most
   - Optimize prompts based on selection data

---

## 8. Testing Checklist

When modifying prompts, test:

- [ ] Wordmark with company name
- [ ] Pictorial with no text requirement
- [ ] White background enforcement
- [ ] Color palette adherence
- [ ] Refinement maintains core design
- [ ] User feedback integration
- [ ] Custom aesthetic directions
- [ ] Reference image influence
- [ ] 3+ round refinements
- [ ] Mobile/small size clarity

---

## 9. Version History

### v1.3 (Current - 2025-10-08)
- ✅ Fixed pictorial text issue
- Added "ABSOLUTELY NO TEXT" enforcement
- Updated refinement prompts to maintain no-text rule

### v1.2
- Added custom image inspiration support
- Improved background control with hex codes

### v1.1
- Introduced 5-variation system
- Added refinement mode with reference images

### v1.0
- Initial prompt system
- Basic wordmark/pictorial distinction

---

## 10. API Model Configuration

**Model**: `imagen-3.0-generate-001` (Google Gemini)
**Parameters**:
- Temperature: Not explicitly set (uses default)
- Output format: PNG image
- Image size: 1024x1024 (square)
- Number of variations: 5 per request

---

## Appendix A: Full Example Flow

### User Input
```json
{
  "businessName": "CloudSync",
  "industry": "technology",
  "description": "Cloud storage and file synchronization service",
  "logoType": "pictorial",
  "colors": "blue and white",
  "hasBackground": false,
  "aestheticDirections": "minimalist and modern"
}
```

### Generated Base Prompt
```
Create a logo for "CloudSync". Cloud storage and file synchronization service.
```

### Full Variation 1 Prompt
```
Create a logo for "CloudSync". Cloud storage and file synchronization service.
FOCUS ON PICTORIAL: Create icon-based or symbol-based logos with ABSOLUTELY NO TEXT OR WORDS.
Design a memorable symbol, icon, or pictorial mark that represents the business.
DO NOT include the business name, letters, or any text whatsoever - only pure visual symbols/icons.
Additional style notes: minimalist and modern.
Create a clean, modern wordmark like contemporary big brands. Use a sophisticated, custom typeface with perfect letter spacing.
Simple, elegant typography.
IMPORTANT: Use completely WHITE background (#FFFFFF) with no gradients, no patterns, no textures.
Consider blue and white but prioritize readability and elegance.
IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements.
```

### Server Enhancement
```
Create a professional, high-quality logo design. Create a logo for "CloudSync".
Cloud storage and file synchronization service. [... full variation prompt ...].
The logo should be clean, memorable, and suitable for business use.
Use high contrast colors, clear typography if text is included, and ensure the design works well at different sizes.
Style: modern and professional. Format: square logo suitable for business applications.
IMPORTANT: Do not include any taglines, slogans, or descriptive text below the logo - only the business name and/or icon elements.
```

---

## Appendix B: Contact & Updates

For questions or suggestions about the prompt system:
- Update this document when making prompt changes
- Test thoroughly before deploying
- Document any AI model behavior changes

**Last Updated**: 2025-10-08
**Maintained By**: Development Team
