/**
 * Navigation menu functionality
 */

import { showLocationCard } from './map.js';

let currentPanel = null;
let mapInstance = null;
let activeCategories = new Set(); // Track which categories are active
let categoriesInitialized = false; // Track if categories have been initialized

/**
 * Get a human-friendly category label from Google Places types
 */
function getPlaceCategory(types) {
  if (!types || types.length === 0) return null;

  // Priority order - first match wins
  const categoryMap = {
    // Geographic areas
    'sublocality': 'Neighborhood',
    'sublocality_level_1': 'Neighborhood',
    'sublocality_level_2': 'Neighborhood',
    'locality': 'City',
    'administrative_area_level_1': 'Prefecture',
    'political': 'Area',

    // Tourist attractions
    'tourist_attraction': 'Tourist Attraction',
    'museum': 'Museum',
    'art_gallery': 'Art Gallery',
    'landmark': 'Landmark',
    'park': 'Park',
    'amusement_park': 'Amusement Park',
    'aquarium': 'Aquarium',
    'zoo': 'Zoo',

    // Food & Drink
    'restaurant': 'Restaurant',
    'cafe': 'Cafe',
    'bar': 'Bar',
    'bakery': 'Bakery',
    'meal_takeaway': 'Takeaway',
    'food': 'Food',

    // Shopping
    'shopping_mall': 'Shopping Mall',
    'department_store': 'Department Store',
    'store': 'Store',
    'clothing_store': 'Clothing Store',
    'book_store': 'Bookstore',
    'convenience_store': 'Convenience Store',

    // Accommodation
    'lodging': 'Hotel',
    'hotel': 'Hotel',

    // Transport
    'train_station': 'Train Station',
    'subway_station': 'Subway Station',
    'transit_station': 'Transit Station',
    'airport': 'Airport',
    'bus_station': 'Bus Station',

    // Religious
    'place_of_worship': 'Place of Worship',
    'church': 'Church',
    'mosque': 'Mosque',
    'synagogue': 'Synagogue',
    'hindu_temple': 'Temple',

    // Entertainment
    'night_club': 'Night Club',
    'movie_theater': 'Movie Theater',
    'casino': 'Casino',

    // Health & Wellness
    'spa': 'Spa',
    'gym': 'Gym',
    'hospital': 'Hospital',

    // Services
    'bank': 'Bank',
    'atm': 'ATM',
    'post_office': 'Post Office',

    // General
    'point_of_interest': 'Point of Interest',
    'establishment': 'Establishment',
  };

  // Find first matching type
  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }

  return null;
}

/**
 * Initialize navigation menu
 */
export function initializeNavigation(map, locations) {
  mapInstance = map;

  const categoriesButton = document.getElementById('nav-categories');
  const searchButton = document.getElementById('nav-search');

  // Categories button handler
  categoriesButton.addEventListener('click', () => {
    togglePanel('categories', categoriesButton, locations, map);
  });

  // Search button handler
  searchButton.addEventListener('click', () => {
    togglePanel('search', searchButton, locations, map);
  });
}

/**
 * Toggle panel visibility
 */
function togglePanel(panelName, button, locations = null, map = null) {
  // Remove active class from all buttons
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));

  // If clicking the same panel, close it
  if (currentPanel === panelName) {
    closePanel();
    return;
  }

  // Set active button
  button.classList.add('active');

  // Close existing panel
  closePanel();

  // Create and show new panel
  currentPanel = panelName;

  switch (panelName) {
    case 'categories':
      showCategoriesPanel(locations, map);
      break;
    case 'search':
      showSearchPanel(locations, map);
      break;
  }
}

/**
 * Close current panel
 */
function closePanel() {
  const container = document.getElementById('nav-panel-container');
  const existingPanel = container?.querySelector('.nav-panel');
  if (existingPanel) {
    existingPanel.classList.add('closing');
    setTimeout(() => existingPanel.remove(), 200);
  }
  currentPanel = null;
}

/**
 * Show categories panel
 */
function showCategoriesPanel(locations, map) {
  const panel = createPanel('Categories');

  // Get unique categories
  const categories = {};

  locations.forEach(location => {
    if (location.type) {
      if (!categories[location.type]) {
        categories[location.type] = {
          color: location.typeColor,
          count: 0
        };
      }
      categories[location.type].count++;
      // Initialize all categories as active only on first load
      if (!categoriesInitialized) {
        activeCategories.add(location.type);
      }
    }
  });

  // Mark categories as initialized after first load
  if (!categoriesInitialized) {
    categoriesInitialized = true;
  }

  // Import color function from map.js
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

  const categoriesContent = `
    <div class="categories-header">
      <button class="category-toggle-all" id="toggle-all-categories">Toggle All</button>
    </div>
    <div class="categories-list">
      ${Object.entries(categories)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => {
          const color = notionColors[data.color] || notionColors.default;
          const isActive = activeCategories.has(name);
          return `
            <label class="category-item ${isActive ? 'active' : ''}" data-category="${name}">
              <input type="checkbox" class="category-checkbox" ${isActive ? 'checked' : ''}>
              <div class="category-color" style="background: ${color}"></div>
              <div class="category-info">
                <div class="category-name">${name}</div>
                <div class="category-count">${data.count} location${data.count > 1 ? 's' : ''}</div>
              </div>
            </label>
          `;
        })
        .join('')}
    </div>
  `;

  panel.querySelector('.panel-content').innerHTML = categoriesContent;
  document.getElementById('nav-panel-container').appendChild(panel);

  // Add toggle all handler
  const toggleAllBtn = panel.querySelector('#toggle-all-categories');
  toggleAllBtn.addEventListener('click', () => {
    const allActive = activeCategories.size === Object.keys(categories).length;

    if (allActive) {
      // Deactivate all
      activeCategories.clear();
      panel.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.category-checkbox').checked = false;
      });
    } else {
      // Activate all
      Object.keys(categories).forEach(cat => activeCategories.add(cat));
      panel.querySelectorAll('.category-item').forEach(item => {
        item.classList.add('active');
        item.querySelector('.category-checkbox').checked = true;
      });
    }

    updateMapFilters(map);
  });

  // Add click handlers for categories
  panel.querySelectorAll('.category-item').forEach(item => {
    const checkbox = item.querySelector('.category-checkbox');
    const category = item.dataset.category;

    // Handle clicks on the entire label (which includes the checkbox)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeCategories.add(category);
        item.classList.add('active');
      } else {
        activeCategories.delete(category);
        item.classList.remove('active');
      }

      updateMapFilters(map);
    });
  });
}

/**
 * Show search panel
 */
function showSearchPanel(locations, map) {
  const panel = createPanel('Search Locations');

  const searchContent = `
    <div class="search-container">
      <input type="text" id="location-search" placeholder="Search for any place..." class="search-input">
      <div id="search-results" class="search-results"></div>
    </div>
  `;

  panel.querySelector('.panel-content').innerHTML = searchContent;
  document.getElementById('nav-panel-container').appendChild(panel);

  const searchInput = document.getElementById('location-search');
  const searchResults = document.getElementById('search-results');
  let searchTimeout = null;

  // Search using Google Places API
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.length < 2) {
      searchResults.innerHTML = '<div class="search-hint">Type at least 2 characters to search...</div>';
      return;
    }

    // Show loading state
    searchResults.innerHTML = '<div class="search-loading">Searching...</div>';

    // Debounce the search
    searchTimeout = setTimeout(async () => {
      try {
        // Use relative URL in production, localhost in development
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');
        const response = await fetch(`${apiUrl}/api/places-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.error) {
          searchResults.innerHTML = `<div class="search-error">Error: ${data.error}</div>`;
          return;
        }

        if (!data.places || data.places.length === 0) {
          searchResults.innerHTML = '<div class="search-no-results">No places found</div>';
          return;
        }

        // Display results
        searchResults.innerHTML = data.places
          .map(place => {
            const photoHtml = place.photoUrl
              ? `<img src="${place.photoUrl}" alt="${place.name}" class="search-result-photo">`
              : '';

            const category = getPlaceCategory(place.types);
            const categoryBadge = category
              ? `<span class="search-result-category">${category}</span>`
              : '';

            return `
              <button class="search-result-item" data-place-id="${place.id}">
                ${photoHtml}
                <div class="search-result-info">
                  <div class="search-result-name">
                    ${place.name}
                    ${categoryBadge}
                  </div>
                  <div class="search-result-meta">${place.address || 'No address available'}</div>
                </div>
              </button>
            `;
          })
          .join('');

        // Add click handlers
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const placeId = item.dataset.placeId;
            const place = data.places.find(p => p.id === placeId);
            if (place) {
              // Fly to location and show card
              flyToSearchResult(place, map);
              closePanel();
              document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            }
          });
        });
      } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="search-error">Error searching places. Please try again.</div>';
      }
    }, 500); // Wait 500ms after user stops typing
  });

  // Focus search input
  setTimeout(() => searchInput.focus(), 100);
}

/**
 * Create panel element
 */
function createPanel(title) {
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h3 class="panel-title">${title}</h3>
    </div>
    <div class="panel-content"></div>
  `;

  // Click outside to close handler
  setTimeout(() => {
    const handleClickOutside = (e) => {
      const navContainer = document.querySelector('.floating-nav-container');
      const isClickOnNavContainer = navContainer && navContainer.contains(e.target);

      if (!isClickOnNavContainer) {
        closePanel();
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.removeEventListener('click', handleClickOutside);
      }
    };

    // Add listener after a small delay to prevent immediate closing
    document.addEventListener('click', handleClickOutside);
  }, 100);

  return panel;
}

/**
 * Update map filters based on active categories
 * This updates the source data to properly work with clustering
 */
function updateMapFilters(map) {
  if (!map || !window.mapLocationsData) return;

  const { originalGeoJSON } = window.mapLocationsData;

  // Filter the features based on active categories
  let filteredFeatures;

  if (activeCategories.size === 0) {
    // If no categories selected, show nothing
    filteredFeatures = [];
  } else {
    // Filter to show only active categories (or items without a type)
    filteredFeatures = originalGeoJSON.features.filter(feature => {
      const type = feature.properties.type;
      return !type || activeCategories.has(type);
    });
  }

  // Create new GeoJSON with filtered features
  const filteredGeoJSON = {
    type: 'FeatureCollection',
    features: filteredFeatures
  };

  // Update the source data - this will re-cluster with only the visible points
  const source = map.getSource('locations');
  if (source) {
    source.setData(filteredGeoJSON);
  }
}

/**
 * Fly to a specific location
 */
function flyToLocation(location, map) {
  map.flyTo({
    center: location.coordinates,
    zoom: 15,
    duration: 1500
  });

  // Show location card after animation
  setTimeout(() => {
    showLocationCard(location, mapInstance);
  }, 1500);
}

/**
 * Fly to a search result from Google Places API
 */
function flyToSearchResult(place, map) {
  map.flyTo({
    center: place.coordinates,
    zoom: 15,
    duration: 1500
  });

  // Show location card for search result after animation
  setTimeout(() => {
    showLocationCard(place, mapInstance, true); // Pass true to indicate it's a search result
  }, 1500);
}
