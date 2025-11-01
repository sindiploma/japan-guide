import notionPkg from '@notionhq/client';

const { Client } = notionPkg;

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
    const { name, address, latitude, longitude, pageId, cachedPhotos } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    // If we have cached photos, return them immediately
    if (cachedPhotos) {
      try {
        const photos = JSON.parse(cachedPhotos);
        if (photos.length > 0) {
          console.log(`✅ Using cached photos for "${name}"`);
          return res.status(200).json({ photos, cached: true });
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
      return res.status(200).json({ photos: [], error: errorData.error?.message });
    }

    const textSearchData = await textSearchResponse.json();

    if (!textSearchData.places || textSearchData.places.length === 0) {
      return res.status(200).json({ photos: [] });
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
        const notion = new Client({
          auth: process.env.VITE_NOTION_API_KEY,
        });

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

    res.status(200).json({ photos: photoData, cached: false });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    res.status(500).json({ error: error.message, photos: [] });
  }
}
