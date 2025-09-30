# 🎨 AI Logo Maker - Features Guide

## Overview

AI Logo Maker uses Google Gemini AI to generate professional logos in minutes. This guide covers the credits system and refinement workflows.

---

## 💳 Credits System

### How Credits Work

**Every user gets 15 free credits:**
- 1 credit = 1 logo generation (batch of 5 logos)
- Anonymous users: 15 free credits
- Signed-in free users: 15 free credits
- Premium users (€9.99): Unlimited credits

### Tracking Your Credits

**Free Users:**
- Credits counter displayed throughout the app
- "X credits remaining" shown before each generation
- After 15 credits used → upgrade prompt appears
- Credits tracked in database for signed-in users
- LocalStorage for anonymous users

**Premium Users:**
- No credit limits
- "Unlimited credits" badge
- Full access to all features
- One-time payment of €9.99

### Credit Deduction

Credits are deducted when you:
- ✅ Generate initial 5 logos (1 credit)
- ✅ Refine logos with feedback (1 credit per refinement round)
- ✅ Use single-logo iterative refinement (1 credit per iteration)

Credits are NOT deducted for:
- ❌ Saving logos to collection
- ❌ Downloading logos
- ❌ Using premium export features (requires premium, not credits)

---

## 🔄 Refinement Workflows

### Batch Refinement Mode (Default)

**Best for:** Exploring multiple design directions

**How to use:**
1. Generate initial 5 logos
2. Review all options
3. (Optional) Select 1-2 favorite logos by clicking them
4. Provide feedback in the feedback box
5. Click "Refine Selected" button
6. 5 new logos generated incorporating your feedback

**Features:**
- Select up to 2 logos to focus refinement
- Or provide general feedback without selecting any
- AI considers your selected logos + feedback
- Generate new variations across different styles
- 3 total refinement rounds available

**Example Feedback:**
- "I like logos #2 and #4 but make the text bolder"
- "Try warmer colors and a more playful style"
- "The geometric shapes are good but simplify them"

---

### Single-Logo Iterative Refinement Mode

**Best for:** Perfecting one specific design

**How to use:**
1. Generate initial 5 logos
2. Find one you really like
3. Hover over that logo
4. Click the ✨ "Refine This" button
5. Mode activates with visual banner
6. Provide specific feedback for that logo
7. Click "Refine Selected" button
8. 5 new variations of that specific logo generated
9. Repeat steps 6-8 until perfect

**Features:**
- Focus on one logo design
- Iterate round after round on same design
- Visual banner shows which logo you're refining
- Can switch to different logo anytime
- Can exit mode and return to batch refinement

**Visual Indicators:**
- ✨ Button highlights in cyan when logo is focused
- Banner shows thumbnail of focused logo
- "Iterating on Logo #X" message
- "Exit Mode" button to return to batch

**Example Workflow:**
1. Initial generation produces 5 logos
2. You like logo #3's overall concept
3. Click ✨ on logo #3 → enters single-logo mode
4. Round 1: "Make the colors more vibrant"
   - Generates 5 variations with brighter colors
5. Round 2: "Perfect! Now make the text slightly larger"
   - Generates 5 variations with larger text
6. Round 3: "Try rotating the icon 45 degrees"
   - Generates 5 variations with rotated icon
7. Found the perfect logo!

**When to Use Single-Logo Mode:**
- ✅ You found a design you love but needs tweaks
- ✅ Want to explore variations of one specific concept
- ✅ Need to iterate on details (colors, fonts, spacing)
- ✅ Prefer focused refinement over exploration

**When to Use Batch Mode:**
- ✅ First time generating logos
- ✅ Want to explore different styles
- ✅ Not sure which direction to go
- ✅ Want variety in each round

---

## 🎯 Logo Generation Tips

### Initial Generation

**Provide clear business details:**
- Business name (required)
- Industry (helps AI understand context)
- Description (be specific about what you do)
- Colors (if you have brand colors)
- Style preferences (modern, classic, playful, etc.)

**Upload reference images (optional):**
- Up to 3 reference images
- Shows AI your preferred style
- Can be logos you like, color palettes, or design inspiration

**Choose logo type:**
- **Wordmark:** Text-focused, minimal symbols (like Google, Coca-Cola)
- **Pictorial:** Icon-focused, minimal text (like Apple, Twitter)

### Refinement Tips

**Be specific in feedback:**
- ❌ "Make it better"
- ✅ "Make the text bolder and use darker blue"

- ❌ "I don't like it"
- ✅ "The icon is too complex, simplify to 3-4 shapes max"

- ❌ "Change colors"
- ✅ "Replace orange with forest green (#228B22)"

**Iterative approach:**
- Make one type of change per round
- Don't request too many changes at once
- Round 1: Fix colors
- Round 2: Adjust text
- Round 3: Fine-tune icon

**Use selection strategically:**
- Select logos that are close to what you want
- AI will use them as visual reference
- Don't select if you want completely new directions

---

## 💎 Premium Features

### Included with Premium (€9.99)

**Unlimited Credits:**
- Generate as many logos as you want
- No 15-credit limit
- Refine infinitely until perfect

**Pro Export Pack:**
- **8K PNG** - Ultra high-resolution (8192x8192) for print
- **SVG Vector** - Infinite scalability, editable
- **Background Removed** - Transparent PNG for versatile use
- **Favicon** - 32x32 optimized for website tabs
- **Profile Picture** - 512x512 circular for social media

**Commercial Rights:**
- Full ownership of generated logos
- Use for business, products, marketing
- No attribution required
- Royalty-free forever

**Priority Support:**
- Email support: support@ailogomaker.com
- Faster response times
- Help with technical issues

### How to Download Premium Formats

1. Generate and refine your logo
2. Click the golden ↓ button on any logo
3. Download modal opens
4. Select desired formats:
   - Standard PNG (1024x1024) - Free
   - 8K PNG - Premium
   - Background Removed PNG - Premium
   - SVG Vector - Premium
   - Favicon - Premium
   - Profile Picture - Premium
5. Click "Download Selected"
6. Files process and download automatically

**Processing times:**
- Standard PNG: Instant
- 8K Upscaling: 10-30 seconds
- SVG Conversion: 5-15 seconds
- Background Removal: 5-20 seconds
- Favicon/Profile: Instant

---

## 🎨 Workflow Examples

### Example 1: Startup Logo

**Goal:** Modern tech startup logo

1. **Initial Generation:**
   - Business: "CloudSync"
   - Industry: "Cloud Storage"
   - Description: "Secure file synchronization for teams"
   - Colors: "Blue and white"
   - Type: Pictorial

2. **Round 1 (Batch Mode):**
   - Select logo #2 (simple cloud icon)
   - Feedback: "I love the minimalist cloud, but make it more dynamic with arrows or movement"
   - Result: 5 logos with cloud + motion elements

3. **Round 2 (Single-Logo Mode):**
   - Click ✨ on best logo from Round 1
   - Feedback: "Perfect shape! Now use gradient from light blue to navy"
   - Result: 5 color variations of that specific design

4. **Round 3 (Single-Logo Mode):**
   - Feedback: "Make the company name use a thinner, more modern font"
   - Result: Final perfected logo

5. **Download:**
   - 8K PNG for website
   - SVG for scalable use
   - Favicon for site tab

### Example 2: Restaurant Logo

**Goal:** Warm, inviting restaurant logo

1. **Initial Generation:**
   - Business: "The Golden Spoon"
   - Industry: "Fine Dining Restaurant"
   - Description: "French-inspired bistro with modern twist"
   - Colors: "Gold, burgundy, cream"
   - Type: Wordmark
   - Upload: Photo of restaurant interior

2. **Round 1 (Batch Mode):**
   - Don't select any logos
   - Feedback: "Too formal. Make more approachable and friendly while keeping elegant"
   - Result: 5 softer, more inviting options

3. **Round 2 (Single-Logo Mode):**
   - Click ✨ on logo with hand-drawn feel
   - Feedback: "This warmth is perfect! Add a small spoon icon integrated into the 'O'"
   - Result: 5 variations with spoon integration

4. **Round 3 (Single-Logo Mode):**
   - Feedback: "Love it! Make the gold slightly more muted for printability"
   - Result: Final logo with print-optimized colors

---

## 🚀 Best Practices

### Do's ✅

- Start with clear business information
- Use specific, actionable feedback
- Iterate one element at a time
- Save logos you like to your collection
- Try both batch and single-logo modes
- Download multiple formats for different uses

### Don'ts ❌

- Don't rush the refinement process
- Don't request contradictory changes in one round
- Don't skip the feedback - generic prompts = generic results
- Don't forget to save logos before closing browser
- Don't use all 15 credits on first iteration - refine!

---

## 🆘 Troubleshooting

**"Why did I lose a credit if I didn't like the results?"**
- Each generation request uses 1 credit regardless of output
- This covers AI processing costs
- Refine with feedback instead of regenerating from scratch

**"Can I get more free credits?"**
- Free tier is limited to 15 credits total
- Upgrade to premium for unlimited access
- One-time payment of €9.99

**"How do I switch between refinement modes?"**
- Click ✨ on any logo to enter single-logo mode
- Click "Exit Mode" to return to batch mode
- Modes can be switched anytime

**"My focused logo disappeared when I refined"**
- This is expected - refinement generates new variations
- The focused logo serves as the reference for new generation
- Save the original to your collection before refining if you want to keep it

**"Can I refine a saved logo later?"**
- Yes! Go to your saved logos gallery
- Click ✨ on any saved logo to start refining it
- Works the same as refining fresh generations

---

## 📧 Support

Need help? Contact us:
- **Email:** support@ailogomaker.com
- **Response time:** Within 24 hours (business days)
- **Premium users:** Priority support

---

**Last Updated:** 2025-09-30
**Version:** 2.0 (Credits System + Single-Logo Refinement)