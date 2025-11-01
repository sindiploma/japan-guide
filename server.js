import express from 'express';
import cors from 'cors';
import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';

dotenv.config();

const { Client } = notionPkg;
const geocodingClient = mbxGeocoding({ accessToken: process.env.VITE_MAPBOX_TOKEN });
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for the Vite dev server
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

// Geocode an address using Mapbox and save to Notion
async function geocodeAndSaveAddress(pageId, address) {
  try {
    const response = await geocodingClient
      .forwardGeocode({
        query: address,
        countries: ['JP'], // Limit to Japan
        limit: 1,
      })
      .send();

    if (response && response.body && response.body.features && response.body.features.length > 0) {
      const [longitude, latitude] = response.body.features[0].center;
      console.log(`✅ Geocoded "${address}" to [${latitude}, ${longitude}]`);

      // Save coordinates back to Notion
      try {
        await notion.pages.update({
          page_id: pageId,
          properties: {
            Latitude: {
              rich_text: [{ text: { content: latitude.toString() } }]
            },
            Longitude: {
              rich_text: [{ text: { content: longitude.toString() } }]
            }
          }
        });
        console.log(`💾 Saved coordinates to Notion for page ${pageId}`);
      } catch (saveError) {
        console.error(`⚠️  Could not save to Notion: ${saveError.message}`);
      }

      return { latitude, longitude };
    }

    console.log(`⚠️  No coordinates found for address: "${address}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error geocoding address "${address}":`, error.message);
    return null;
  }
}

// API endpoint to fetch locations from Notion
app.get('/api/locations', async (req, res) => {
  try {
    const dataSourceId = process.env.VITE_NOTION_DATABASE_ID;

    if (!dataSourceId) {
      return res.status(500).json({ error: 'VITE_NOTION_DATABASE_ID is not configured' });
    }

    console.log('Fetching locations from Notion...');
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
    });

    // Transform Notion data to location objects
    const locationsPromises = response.results.map(async (page) => {
      const properties = page.properties;

      const name = properties.Nombre?.title?.[0]?.plain_text || 'Unnamed Location';
      const latitudeText = properties.Latitude?.rich_text?.[0]?.plain_text;
      const longitudeText = properties.Longitude?.rich_text?.[0]?.plain_text;
      const description = properties.Notes?.rich_text?.[0]?.plain_text || '';
      const address = properties.Address?.rich_text?.[0]?.plain_text || '';
      const group = properties.Group?.select?.name || '';
      const type = properties.Type?.select?.name || '';
      const typeColor = properties.Type?.select?.color || '';
      const photosText = properties.Photos?.rich_text?.[0]?.plain_text || '';

      // Parse cached photos from Notion (stored as JSON string)
      let cachedPhotos = [];
      if (photosText) {
        try {
          cachedPhotos = JSON.parse(photosText);
        } catch (e) {
          console.log(`⚠️  Could not parse photos for "${name}"`);
        }
      }

      let latitude = latitudeText ? parseFloat(latitudeText) : null;
      let longitude = longitudeText ? parseFloat(longitudeText) : null;

      // If coordinates are missing but we have an address, geocode it and save to Notion
      if ((!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) && address) {
        console.log(`🔍 Geocoding missing coordinates for "${name}" with address: "${address}"`);
        const coords = await geocodeAndSaveAddress(page.id, address);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      }

      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        return {
          id: page.id,
          name,
          latitude,
          longitude,
          description,
          address,
          group,
          type,
          typeColor,
          coordinates: [longitude, latitude],
          photos: cachedPhotos, // Include cached photos
        };
      }

      return null;
    });

    const locations = (await Promise.all(locationsPromises)).filter(location => location !== null);

    console.log(`✅ Fetched ${locations.length} locations from Notion`);
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching from Notion:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get place photos from Google Places API (New)
app.get('/api/place-photo', async (req, res) => {
  try {
    const { name, address, latitude, longitude, pageId, cachedPhotos } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    // If we have cached photos, return them immediately
    if (cachedPhotos) {
      try {
        const photos = JSON.parse(cachedPhotos);
        if (photos.length > 0) {
          console.log(`✅ Using cached photos for "${name}"`);
          return res.json({ photos, cached: true });
        }
      } catch (e) {
        console.log(`⚠️  Could not parse cached photos for "${name}"`);
      }
    }

    if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
      return res.status(500).json({ error: 'Google Places API key is not configured' });
    }

    console.log(`🔍 Fetching new photos from Google Places for "${name}"`);

    // Use the new Places API (New) - Text Search endpoint
    const searchQuery = address ? `${name}, ${address}` : name;

    // Text Search using Places API (New)
    const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const textSearchResponse = await fetch(textSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        locationBias: latitude && longitude ? {
          circle: {
            center: {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude)
            },
            radius: 500.0
          }
        } : undefined
      })
    });

    if (!textSearchResponse.ok) {
      const errorData = await textSearchResponse.json();
      console.error('Places API error:', errorData);
      return res.json({ photos: [], error: errorData.error?.message });
    }

    const textSearchData = await textSearchResponse.json();

    if (!textSearchData.places || textSearchData.places.length === 0) {
      return res.json({ photos: [] });
    }

    const place = textSearchData.places[0];
    const photos = place.photos || [];

    // Return photo data with URLs using the new API format
    const photoData = photos.slice(0, 5).map(photo => {
      // Extract the photo reference name (format: places/{place_id}/photos/{photo_id})
      const photoName = photo.name;
      // Construct the photo URL using the new API
      const url = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=400`;

      return {
        name: photoName,
        width: photo.widthPx,
        height: photo.heightPx,
        url: url,
        attributions: photo.authorAttributions || []
      };
    });

    // Save photos to Notion if we have a pageId
    // Store only URLs to stay under Notion's 2000 char limit
    if (pageId && photoData.length > 0) {
      try {
        // Store simplified version with just URLs (much smaller)
        const simplifiedPhotos = photoData.map(p => ({ url: p.url }));
        const photosJson = JSON.stringify(simplifiedPhotos);

        // Check if it fits in Notion's 2000 char limit
        if (photosJson.length > 2000) {
          console.log(`⚠️  Photo data too large (${photosJson.length} chars), reducing to 3 photos`);
          const reducedPhotos = simplifiedPhotos.slice(0, 3);
          await notion.pages.update({
            page_id: pageId,
            properties: {
              Photos: {
                rich_text: [{ text: { content: JSON.stringify(reducedPhotos) } }]
              }
            }
          });
          console.log(`💾 Saved ${reducedPhotos.length} photos to Notion for "${name}"`);
        } else {
          await notion.pages.update({
            page_id: pageId,
            properties: {
              Photos: {
                rich_text: [{ text: { content: photosJson } }]
              }
            }
          });
          console.log(`💾 Saved ${simplifiedPhotos.length} photos to Notion for "${name}"`);
        }
      } catch (saveError) {
        console.error(`⚠️  Could not save photos to Notion: ${saveError.message}`);
      }
    }

    res.json({ photos: photoData, cached: false });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    res.status(500).json({ error: error.message, photos: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`📍 Locations API: http://localhost:${PORT}/api/locations`);
  console.log(`📷 Place Photos API: http://localhost:${PORT}/api/place-photo`);
});
