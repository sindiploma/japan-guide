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
    const { query } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({ places: [] });
    }

    if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
      return res.status(500).json({ error: 'Google Places API key is not configured' });
    }

    console.log(`🔍 Searching Google Places for: "${query}"`);

    // Use the new Places API (New) - Text Search endpoint
    const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const textSearchResponse = await fetch(textSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        maxResultCount: 10,
        // Restrict search to Japan only
        locationRestriction: {
          rectangle: {
            low: {
              latitude: 24.0,  // Southern tip of Japan (Ryukyu Islands)
              longitude: 122.0  // Western edge
            },
            high: {
              latitude: 46.0,  // Northern tip (Hokkaido)
              longitude: 154.0  // Eastern edge
            }
          }
        }
      })
    });

    if (!textSearchResponse.ok) {
      const errorData = await textSearchResponse.json();
      console.error('Places API error:', errorData);
      return res.status(200).json({ places: [], error: errorData.error?.message });
    }

    const textSearchData = await textSearchResponse.json();

    if (!textSearchData.places || textSearchData.places.length === 0) {
      return res.status(200).json({ places: [] });
    }

    // Format the places data for frontend
    const places = textSearchData.places.map(place => {
      // Get the first photo if available
      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=100`;
      }

      return {
        id: place.id,
        name: place.displayName?.text || 'Unnamed Place',
        address: place.formattedAddress || '',
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        coordinates: [place.location?.longitude, place.location?.latitude],
        types: place.types || [],
        photoUrl: photoUrl,
        // Mark this as a search result (not from Notion)
        isSearchResult: true
      };
    });

    console.log(`✅ Found ${places.length} places for "${query}"`);
    res.status(200).json({ places });
  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({ error: error.message, places: [] });
  }
}
