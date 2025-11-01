# Quick Deployment Guide

## Vercel (Recommended - Free & Fast)

### Quick Steps:

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Ready for Vercel deployment"
   git remote add origin https://github.com/YOUR_USERNAME/japan-map.git
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repo
   - Add environment variables:
     - `VITE_MAPBOX_TOKEN`
     - `VITE_NOTION_API_KEY`
     - `VITE_NOTION_DATABASE_ID`
     - `GOOGLE_PLACES_API_KEY`
   - Click "Deploy"

3. **Done!** Your app will be live at `https://your-project.vercel.app`

### What's Included:

- ✅ Frontend (Vite static site)
- ✅ Backend APIs (Serverless functions in `/api` folder)
- ✅ No cold starts (instant responses)
- ✅ Free forever for personal projects
- ✅ Automatic HTTPS
- ✅ Auto-deploy on every git push

### Project Structure:

```
japan-map/
├── api/                    # Vercel serverless functions
│   ├── locations.js       # GET /api/locations
│   └── place-photo.js     # GET /api/place-photo
├── src/                   # Frontend source
├── dist/                  # Build output (auto-generated)
├── vercel.json           # Vercel configuration
└── server.js             # Local dev server (not used in production)
```

### Local Development:

```bash
# Run frontend (Vite dev server)
npm run dev

# Run backend (Express server for local development)
npm run server
```

In production, Vercel automatically uses the `/api` folder for serverless functions.

---

## Alternative: Render

If you prefer Render (has 30-sec cold start on free tier):
- Use `render.yaml` configuration
- Follow Render deployment steps in README.md
