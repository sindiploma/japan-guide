# Japan Map - Notion Integration

A Vite-powered JavaScript application that displays locations from a Notion database on an interactive Mapbox map.

## Features

- Interactive Mapbox map centered on Japan
- Fetch location data from Notion database
- Display custom markers with clustering support
- Google Places API integration for location photos
- Bottom card with location details and photo slider
- Responsive design with SCSS styling
- Auto-fit map bounds to show all locations
- Automatic geocoding for addresses without coordinates

## Prerequisites

1. **Mapbox Account**: Get your access token from [Mapbox](https://account.mapbox.com/access-tokens/)
2. **Notion Integration**: Create an integration at [Notion Integrations](https://www.notion.so/my-integrations)
3. **Google Places API**: Get your API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the **Places API (New)** in your Google Cloud project
   - Create an API key and optionally restrict it to Places API only
4. **Notion Database**: Create a database with the following properties:
   - `Nombre` (Title) - Name of the location
   - `Latitude` (Text) - Latitude coordinate (optional if Address is provided)
   - `Longitude` (Text) - Longitude coordinate (optional if Address is provided)
   - `Address` (Text) - Address for geocoding and photo search
   - `Notes` (Text) - Optional description
   - `Type` (Select) - Location type with color coding
   - `Group` (Select) - Optional grouping/category
   - `Photos` (Text) - **Auto-populated** - Cached photo URLs from Google Places (saves API costs)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env` (or create `.env` file)
   - Fill in your API keys and configuration:
     ```env
     # Mapbox API Token
     VITE_MAPBOX_TOKEN=your_mapbox_token

     # Notion API Key
     VITE_NOTION_API_KEY=your_notion_api_key

     # Notion Data Source ID
     VITE_NOTION_DATABASE_ID=your_database_id

     # Google Places API Key
     GOOGLE_PLACES_API_KEY=your_google_places_api_key

     # Server Configuration
     PORT=3000
     VITE_API_URL=http://localhost:3000
     ```

3. **Connect Notion database**:
   - Share your Notion database with your integration
   - Copy the database ID from the URL

## Development

You need to run **both** servers:

1. **Start the backend server** (handles Notion API calls):
   ```bash
   npm run server
   ```

2. **Start the frontend dev server** (in a new terminal):
   ```bash
   npm run dev
   ```

3. **Open your browser**: http://localhost:5173/

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
japan-map/
├── src/
│   ├── main.js           # Application entry point
│   ├── map.js            # Mapbox map initialization and markers
│   ├── notionClient.js   # Frontend API client
│   └── styles.scss       # SCSS styles
├── server.js             # Express backend for Notion API calls
├── index.html            # HTML template
├── .env                  # Environment variables (keep secure!)
└── package.json          # Project dependencies
```

## How It Works

1. **Backend server** fetches location data from your Notion database via the Notion API
2. **Automatic geocoding**: If coordinates are missing but an address exists, the backend uses Mapbox Geocoding API to get coordinates and saves them back to Notion
3. **Frontend** requests locations from the backend API endpoint
4. **Mapbox map** initializes centered on Japan with clustering enabled
5. **Markers** are added to the map with color coding based on location type
6. **Click clusters** to zoom in and expand them
7. **Click markers** to view location details in a bottom card with:
   - Location name, type, and group tags
   - Photos fetched from Google Places API (horizontal scrollable slider)
   - Address and description
   - Coordinates
8. Map automatically flies to and centers on the selected location

## Architecture

- **Frontend (Vite)**: Runs on http://localhost:5173/ - Serves the web app
- **Backend (Express)**: Runs on http://localhost:3000/ (configurable via `PORT` env var) - Handles API calls securely
- **Notion API**: Backend fetches data using the Notion SDK v5 (dataSources.query)
- **Mapbox Geocoding API**: Converts addresses to coordinates automatically
- **Google Places API**: Fetches location photos using place search and details endpoints

## API Endpoints

The backend server provides the following endpoints:

- `GET /api/locations` - Fetches all locations from Notion with automatic geocoding
- `GET /api/place-photo` - Fetches photos for a location from Google Places
  - Query params: `name`, `address`, `latitude`, `longitude`

## Troubleshooting

- **No map showing**: Check that your `VITE_MAPBOX_TOKEN` is valid
- **No markers appearing**: Verify that your Notion database has locations with valid coordinates or addresses
- **API errors**: Ensure your Notion integration has access to the database
- **Photos not loading**:
  - Verify your `GOOGLE_PLACES_API_KEY` is set correctly in `.env`
  - Make sure Places API (New) is enabled in Google Cloud Console
  - Check that the API key has proper permissions
- **Backend not connecting**: Verify both servers are running (frontend on 5173, backend on 3000)
- **CORS errors**: Ensure the backend server is running before starting the frontend

## Environment Variables

All environment variables should be set in the `.env` file:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_MAPBOX_TOKEN` | Mapbox API token for map rendering | Yes |
| `VITE_NOTION_API_KEY` | Notion integration API key | Yes |
| `VITE_NOTION_DATABASE_ID` | Notion database ID | Yes |
| `GOOGLE_PLACES_API_KEY` | Google Places API key for photos | Yes |
| `PORT` | Backend server port (default: 3000) | No |
| `VITE_API_URL` | Backend API URL (default: http://localhost:3000) | No |

## Technologies Used

- **Vite** - Fast build tool and dev server
- **Mapbox GL JS** - Interactive map rendering
- **Notion SDK** - Notion API integration
- **Google Maps Services** - Places API for photos
- **Express** - Backend API server
- **SCSS** - Styling with variables and nesting

## Deployment Options

This project is configured for easy deployment to the cloud with a **free tier**.

### Option 1: Vercel (Recommended) ⭐

**Pros**: Free, instant responses (no cold starts), automatic HTTPS, global CDN

## Deployment to Vercel (Free Tier - Recommended)

This project is configured to deploy to [Vercel](https://vercel.com) with serverless functions.

### Step 1: Push to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/japan-map.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Vercel

1. **Sign up** at [Vercel.com](https://vercel.com) (free account)

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Environment Variables**:

   Click "Environment Variables" and add:
   - `VITE_MAPBOX_TOKEN` = your Mapbox token
   - `VITE_NOTION_API_KEY` = your Notion API key
   - `VITE_NOTION_DATABASE_ID` = your Notion database ID
   - `GOOGLE_PLACES_API_KEY` = your Google Places API key

4. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment

### Step 3: Access Your App

Your app will be live at: `https://your-project-name.vercel.app`

The API endpoints will be:
- `https://your-project-name.vercel.app/api/locations`
- `https://your-project-name.vercel.app/api/place-photo`

### Important Notes:

- ✅ **No cold starts** - Instant responses every time
- ✅ **100% Free** for personal projects
- ✅ **Automatic HTTPS** and global CDN
- ✅ **Auto-deploy** on every push to main branch
- ✅ **Custom domain** - Add your own domain for free

### Troubleshooting:

- Check deployment logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `.env` file is NOT in git (it's in `.gitignore`)
- API functions are in `/api` folder

---

### Option 2: Render (Alternative Free Option)

**Note**: Render has a 30-second cold start on free tier. See below for setup.
