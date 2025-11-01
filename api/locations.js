import notionPkg from '@notionhq/client';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';

const { Client } = notionPkg;

// Geocode an address using Mapbox and save to Notion
async function geocodeAndSaveAddress(notion, pageId, address, mapboxToken) {
  try {
    const geocodingClient = mbxGeocoding({ accessToken: mapboxToken });
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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const dataSourceId = process.env.VITE_NOTION_DATABASE_ID;
    const mapboxToken = process.env.VITE_MAPBOX_TOKEN;

    if (!dataSourceId) {
      return res.status(500).json({ error: 'VITE_NOTION_DATABASE_ID is not configured' });
    }

    if (!process.env.VITE_NOTION_API_KEY) {
      return res.status(500).json({ error: 'VITE_NOTION_API_KEY is not configured' });
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.VITE_NOTION_API_KEY,
    });

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
      if ((!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) && address && mapboxToken) {
        console.log(`🔍 Geocoding missing coordinates for "${name}" with address: "${address}"`);
        const coords = await geocodeAndSaveAddress(notion, page.id, address, mapboxToken);
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
    res.status(200).json({ locations });
  } catch (error) {
    console.error('Error fetching from Notion:', error);
    res.status(500).json({ error: error.message });
  }
}
