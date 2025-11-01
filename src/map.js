import mapboxgl from 'mapbox-gl';

/**
 * Initialize Mapbox map centered on Japan
 */
export function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxgl.accessToken) {
    throw new Error('VITE_MAPBOX_TOKEN is not set in environment variables');
  }

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [138.2529, 36.2048], // Center of Japan
    zoom: 5,
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  return map;
}

/**
 * Convert Notion color names to hex colors
 * Using Notion's actual color palette
 */
function getNotionColor(notionColorName) {
  const notionColors = {
    'gray': '#787774',
    'brown': '#9F6B53',
    'orange': '#D9730D',
    'yellow': '#CB912F',
    'green': '#448361',
    'blue': '#337EA9',
    'purple': '#9065B0',
    'pink': '#C14C8A',
    'red': '#D44C47',
    'default': '#FF0000',
  };

  return notionColors[notionColorName] || notionColors.default;
}

/**
 * Fetch photos for a location from Google Places API
 * Uses cached photos from Notion if available
 */
async function fetchLocationPhotos(location) {
  try {
    // Use relative URL for production (Vercel), fallback to localhost for dev
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const params = new URLSearchParams({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      pageId: location.id, // Pass Notion page ID to save photos
    });

    if (location.address) {
      params.append('address', location.address);
    }

    // Pass cached photos if we have them
    if (location.photos && location.photos.length > 0) {
      params.append('cachedPhotos', JSON.stringify(location.photos));
    }

    const response = await fetch(`${apiUrl}/api/place-photo?${params}`);
    const data = await response.json();

    if (data.cached) {
      console.log(`Using cached photos for ${location.name}`);
    } else if (data.photos && data.photos.length > 0) {
      console.log(`Fetched ${data.photos.length} new photos for ${location.name}`);
    }

    return data.photos || [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

/**
 * Show location details in bottom card
 */
async function showLocationCard(location, map) {
  const card = document.getElementById('location-card');
  const pinColor = location.typeColor ? getNotionColor(location.typeColor) : '#FF0000';

  // Update card content
  document.getElementById('card-title').textContent = location.name;

  // Build chips
  const chipsContainer = document.getElementById('card-chips');
  chipsContainer.innerHTML = '';
  if (location.type) {
    const typeChip = document.createElement('span');
    typeChip.className = 'chip chip-type';
    typeChip.style.backgroundColor = pinColor;
    typeChip.style.borderColor = pinColor;
    typeChip.textContent = location.type;
    chipsContainer.appendChild(typeChip);
  }
  if (location.group) {
    const groupChip = document.createElement('span');
    groupChip.className = 'chip chip-group';
    groupChip.textContent = location.group;
    chipsContainer.appendChild(groupChip);
  }

  document.getElementById('card-address').textContent = location.address || '';
  document.getElementById('card-description').textContent = location.description || '';
  document.getElementById('card-coordinates').textContent = `Lat: ${location.latitude}, Lng: ${location.longitude}`;

  // Fetch and display photos
  const photosContainer = document.getElementById('card-photos');
  photosContainer.innerHTML = '<div class="photos-loading">Loading photos...</div>';

  const photos = await fetchLocationPhotos(location);

  if (photos.length > 0) {
    photosContainer.innerHTML = '';
    const photosSlider = document.createElement('div');
    photosSlider.className = 'photos-slider';

    photos.forEach((photo, index) => {
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = `${location.name} - Photo ${index + 1}`;
      img.className = 'location-photo';
      img.loading = 'lazy';
      photosSlider.appendChild(img);
    });

    photosContainer.appendChild(photosSlider);
  } else {
    photosContainer.innerHTML = '<div class="no-photos">No photos available</div>';
  }

  // Show the card with animation
  card.classList.add('active');
}

/**
 * Hide location card
 */
function hideLocationCard() {
  const card = document.getElementById('location-card');
  card.classList.remove('active');
}

/**
 * Add markers to the map from location data with clustering
 */
export function addMarkersToMap(map, locations) {
  // Close card when clicking on map
  map.on('click', (e) => {
    // Only close if clicking on the map itself, not on a marker
    const features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
    if (!features.length) {
      hideLocationCard();
    }
  });

  // Convert locations to GeoJSON format
  const geojson = {
    type: 'FeatureCollection',
    features: locations.map(location => {
      console.log('Processing location:', JSON.stringify({
        id: location.id,
        name: location.name,
        address: location.address,
        coordinates: location.coordinates
      }, null, 2));
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: location.coordinates,
        },
        properties: {
          id: location.id,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          description: location.description,
          address: location.address,
          group: location.group,
          type: location.type,
          typeColor: location.typeColor,
          coordinates: location.coordinates,
          pinColor: location.typeColor ? getNotionColor(location.typeColor) : '#FF0000',
          locationName: location.name, // Explicitly set label name to avoid conflicts
        },
      };
    }),
  };

  // Add a GeoJSON source with clustering enabled
  map.addSource('locations', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 10, // Max zoom to cluster points on (stops clustering at zoom 11+)
    clusterRadius: 50, // Radius of each cluster when clustering points
  });

  // Add cluster circles layer
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'locations',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#BC002D', // Japan flag red for all clusters
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20, // Radius for < 10 points
        10,
        30, // Radius for 10-30 points
        30,
        40, // Radius for >= 30 points
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  // Add cluster count labels
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'locations',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
      'text-size': 14,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  // Add unclustered points layer
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'locations',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'pinColor'],
      'circle-radius': 10,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#fff',
    },
  });

  // Add labels for unclustered points
  map.addLayer({
    id: 'unclustered-point-labels',
    type: 'symbol',
    source: 'locations',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'locationName'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': 12,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-optional': true,
      'text-padding': 2,
      'symbol-spacing': 250,
    },
    paint: {
      'text-color': '#333333',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
      'text-halo-blur': 0.5,
    },
  });

  // Click on cluster to zoom in
  map.on('click', 'clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['clusters'],
    });
    const clusterId = features[0].properties.cluster_id;
    map.getSource('locations').getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      }
    );
  });

  // Click on unclustered point to show details
  map.on('click', 'unclustered-point', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const properties = e.features[0].properties;

    // Find the full location object
    const location = locations.find(loc => loc.id === properties.id);
    if (location) {
      showLocationCard(location, map);
    }
  });

  // Change cursor on hover over clusters
  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });

  // Change cursor on hover over unclustered points
  map.on('mouseenter', 'unclustered-point', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'unclustered-point', () => {
    map.getCanvas().style.cursor = '';
  });

  console.log(`Added ${locations.length} locations to the map with clustering enabled`);

  // Fit map to show all markers if there are any
  if (locations.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(location => {
      bounds.extend(location.coordinates);
    });

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12,
    });
  }
}
