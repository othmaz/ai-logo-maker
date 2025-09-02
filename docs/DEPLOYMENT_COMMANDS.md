# Deployment Commands

## After creating GitHub repository, run these commands:

```bash
# Add GitHub repository as remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## For Railway Deployment:

1. **Go to [railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Set environment variables:**
   - `GEMINI_API_KEY` = your Google Gemini API key
   - `RAILWAY_PUBLIC_DOMAIN` = auto-set by Railway

4. **Deploy settings:**
   - Root Directory: `/` (root of the repository)
   - Build Command: `npm run build`
   - Start Command: `npm start`

## For Vercel Deployment:

1. **Go to [vercel.com](https://vercel.com)**
2. **Import from GitHub**
3. **Framework Preset:** Vite
4. **Root Directory:** `/` (root of the repository)
5. **Environment Variables:**
   - `GEMINI_API_KEY` = your Google Gemini API key

## Environment Variables Needed:
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)