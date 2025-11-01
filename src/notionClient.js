/**
 * Fetches locations from the backend API
 * The backend server handles Notion API calls to keep API keys secure
 */
export async function fetchLocationsFromNotion() {
  try {
    // Use relative URL for production (Vercel), fallback to localhost for dev
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/locations`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.locations.length} locations from backend API`);
    return data.locations;
  } catch (error) {
    console.error('Error fetching from backend API:', error);
    throw error;
  }
}
