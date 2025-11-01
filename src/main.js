import './styles.scss';
import { initializeMap, addMarkersToMap } from './map.js';
import { fetchLocationsFromNotion } from './notionClient.js';
import { initializeNavigation } from './navigation.js';

/**
 * Show error message to user
 */
function showError(message) {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }

  const errorEl = document.createElement('div');
  errorEl.className = 'error';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

/**
 * Main application initialization
 */
async function init() {
  try {
    // Initialize the map
    const map = initializeMap();

    // Wait for map to load
    map.on('load', async () => {
      try {
        // Fetch locations from Notion
        const locations = await fetchLocationsFromNotion();

        console.log('=== LOCATION COUNT DEBUG ===');
        console.log('Total locations fetched:', locations.length);
        console.log('Locations with coordinates:', locations.filter(l => l.coordinates && Array.isArray(l.coordinates) && l.coordinates.length === 2).length);
        console.log('Locations missing coordinates:', locations.filter(l => !l.coordinates || !Array.isArray(l.coordinates) || l.coordinates.length !== 2).length);

        if (locations.length === 0) {
          showError('No locations found in Notion database. Please add some locations with coordinates.');
          return;
        }

        // Add markers to the map
        addMarkersToMap(map, locations);

        // Initialize navigation menu
        initializeNavigation(map, locations);

        // Hide loading indicator
        hideLoading();
      } catch (error) {
        console.error('Error loading locations:', error);
        showError(`Error loading locations: ${error.message}`);
      }
    });
  } catch (error) {
    console.error('Error initializing map:', error);
    showError(`Error initializing map: ${error.message}`);
  }
}

// Start the application
init();
