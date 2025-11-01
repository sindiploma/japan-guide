import mapboxgl from 'mapbox-gl';

/**
 * Initialize Mapbox map centered on Barcelona with globe view
 */
export function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxgl.accessToken) {
    throw new Error('VITE_MAPBOX_TOKEN is not set in environment variables');
  }

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [2.1734, 41.3851], // Barcelona, Spain
    zoom: 1.5, // Zoomed out to see full globe
    projection: 'globe', // Enable globe projection
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
 * Initialize drag-to-dismiss functionality for the location card
 */
function initializeDragToDismiss() {
  const card = document.getElementById('location-card');
  const handle = card.querySelector('.card-handle');

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  // Handle both touch and mouse events
  const startDrag = (e) => {
    isDragging = true;
    startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    card.style.transition = 'none';
  };

  const onDrag = (e) => {
    if (!isDragging) return;

    currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const deltaY = currentY - startY;

    // Only allow dragging down
    if (deltaY > 0) {
      // Prevent pull-to-refresh on mobile
      e.preventDefault();
      card.style.transform = `translateY(${deltaY}px)`;
      // Add visual feedback - reduce opacity as user drags
      const opacity = Math.max(0.5, 1 - (deltaY / 300));
      card.style.opacity = opacity;
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;

    const deltaY = currentY - startY;
    card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';

    // Dismiss if dragged down more than 100px
    if (deltaY > 100) {
      // Animate to fully dismissed position
      card.style.transform = 'translateY(100%)';
      card.style.opacity = '0';

      // After animation completes, remove active class and reset styles
      setTimeout(() => {
        card.classList.remove('active');
        card.style.transform = '';
        card.style.opacity = '';
        card.style.transition = '';
      }, 300);
    } else {
      // Snap back to original position
      card.style.transform = 'translateY(0)';
      card.style.opacity = '1';
    }
  };

  // Touch events
  handle.addEventListener('touchstart', startDrag, { passive: true });
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', endDrag);

  // Mouse events
  handle.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);

  // Add cursor pointer to handle
  handle.style.cursor = 'grab';
  handle.addEventListener('mousedown', () => {
    handle.style.cursor = 'grabbing';
  });
  document.addEventListener('mouseup', () => {
    handle.style.cursor = 'grab';
  });
}

/**
 * Show location details in bottom card
 */
export async function showLocationCard(location, map, isSearchResult = false) {
  const card = document.getElementById('location-card');
  const pinColor = location.typeColor ? getNotionColor(location.typeColor) : '#FF0000';

  // Update card content
  document.getElementById('card-title').textContent = location.name;

  // Build chips
  const chipsContainer = document.getElementById('card-chips');
  chipsContainer.innerHTML = '';

  // Add search result badge if it's from Google Places
  if (isSearchResult) {
    const searchChip = document.createElement('span');
    searchChip.className = 'chip chip-search-result';
    searchChip.textContent = 'Search Result';
    chipsContainer.appendChild(searchChip);
  }

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

  // Add "Add to Map" button for search results
  let actionsContainer = document.getElementById('card-actions');
  if (!actionsContainer) {
    actionsContainer = document.createElement('div');
    actionsContainer.id = 'card-actions';
    actionsContainer.className = 'card-actions';
    card.querySelector('.card-content').appendChild(actionsContainer);
  }

  actionsContainer.innerHTML = '';

  if (isSearchResult) {
    const addButton = document.createElement('button');
    addButton.className = 'btn-add-to-map';
    addButton.textContent = 'Add to Map';
    addButton.onclick = () => addSearchResultToNotion(location);
    actionsContainer.appendChild(addButton);
  }

  // Show the card with animation
  card.classList.add('active');
}

/**
 * Add a search result to Notion database
 */
async function addSearchResultToNotion(location) {
  const button = document.querySelector('.btn-add-to-map');
  const originalText = button.textContent;

  try {
    button.textContent = 'Adding...';
    button.disabled = true;

    // Use relative URL in production, localhost in development
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');
    const response = await fetch(`${apiUrl}/api/add-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add location');
    }

    button.textContent = 'Added!';
    button.classList.add('success');

    // Refresh the page after 1 second to show the new location
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Error adding location:', error);
    button.textContent = 'Error - Try Again';
    button.classList.add('error');
    button.disabled = false;

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('error');
    }, 2000);
  }
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
  // Initialize drag-to-dismiss functionality
  initializeDragToDismiss();

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

  console.log('=== MAP PLOTTING DEBUG ===');
  console.log('Total GeoJSON features created:', geojson.features.length);
  console.log('Sample feature:', JSON.stringify(geojson.features[0], null, 2));

  // Check for any features with invalid coordinates
  const invalidFeatures = geojson.features.filter(f => {
    const coords = f.geometry.coordinates;
    return !coords || !Array.isArray(coords) || coords.length !== 2 ||
           typeof coords[0] !== 'number' || typeof coords[1] !== 'number' ||
           isNaN(coords[0]) || isNaN(coords[1]);
  });

  if (invalidFeatures.length > 0) {
    console.warn('Found', invalidFeatures.length, 'features with invalid coordinates:', invalidFeatures);
  }

  // Check for duplicate coordinates
  const coordMap = new Map();
  geojson.features.forEach(f => {
    const key = f.geometry.coordinates.join(',');
    if (!coordMap.has(key)) {
      coordMap.set(key, []);
    }
    coordMap.get(key).push(f.properties.name);
  });

  const duplicates = Array.from(coordMap.entries()).filter(([_, names]) => names.length > 1);
  if (duplicates.length > 0) {
    console.warn('=== OVERLAPPING MARKERS FOUND ===');
    console.warn('Found', duplicates.length, 'coordinate positions with multiple markers:');
    duplicates.forEach(([coords, names]) => {
      console.warn(`  ${coords}: ${names.length} locations - ${names.join(', ')}`);
    });
    const totalOverlapping = duplicates.reduce((sum, [_, names]) => sum + names.length, 0);
    console.warn(`Total locations affected: ${totalOverlapping} out of ${geojson.features.length}`);
    console.warn('Applying small offsets to separate overlapping markers...');

    // Apply small offsets to overlapping markers
    const offsetDistance = 0.0008; // Small offset in degrees (roughly 80-90 meters)
    const coordCounts = new Map();

    geojson.features.forEach(feature => {
      const key = feature.geometry.coordinates.join(',');
      const count = coordMap.get(key).length;

      if (count > 1) {
        // Get current index for this coordinate
        if (!coordCounts.has(key)) {
          coordCounts.set(key, 0);
        }
        const index = coordCounts.get(key);
        coordCounts.set(key, index + 1);

        // Calculate offset in a circular pattern
        const angle = (index / count) * 2 * Math.PI;
        const offsetLng = Math.cos(angle) * offsetDistance;
        const offsetLat = Math.sin(angle) * offsetDistance;

        // Apply offset
        feature.geometry.coordinates[0] += offsetLng;
        feature.geometry.coordinates[1] += offsetLat;
      }
    });
  } else {
    console.log('No duplicate coordinates found - all markers are unique');
  }

  // Add a GeoJSON source with clustering enabled
  map.addSource('locations', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 8, // Max zoom to cluster points on (stops clustering at zoom 12+)
    clusterRadius: 50, // Radius of each cluster when clustering points (in pixels)
  });

  // Store the original geojson data globally for filtering
  window.mapLocationsData = {
    originalGeoJSON: geojson,
    map: map
  };

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

  console.log(`Added ${locations.length} locations to the map with clustering disabled`);

  // After layers are added, check how many features are being rendered
  setTimeout(() => {
    const renderedFeatures = map.querySourceFeatures('locations');
    console.log('=== RENDERED FEATURES CHECK ===');
    console.log('Total features in source:', renderedFeatures.length);
    console.log('Features on screen:', map.queryRenderedFeatures({ layers: ['unclustered-point'] }).length);
  }, 1000);

  // Animate to Japan and fit map to show all markers if there are any
  if (locations.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(location => {
      bounds.extend(location.coordinates);
    });

    // Animate to the bounds with a smooth transition
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12,
      duration: 4000, // 2 second animation
      essential: true, // This animation is considered essential for accessibility
    });
  }
}
