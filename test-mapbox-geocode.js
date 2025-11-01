import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';
import dotenv from 'dotenv';

dotenv.config();

const geocodingClient = mbxGeocoding({ accessToken: process.env.VITE_MAPBOX_TOKEN });

async function testGeocode() {
  const testAddress = '6 Chome-10-1 Ginza, Chuo City, Tokyo 104-0061, Japan';

  console.log(`Testing geocoding for: "${testAddress}"`);
  console.log('');

  try {
    const response = await geocodingClient
      .forwardGeocode({
        query: testAddress,
        countries: ['JP'],
        limit: 1,
      })
      .send();

    if (response && response.body && response.body.features && response.body.features.length > 0) {
      const [longitude, latitude] = response.body.features[0].center;
      const placeName = response.body.features[0].place_name;

      console.log('✅ Geocoding successful!');
      console.log(`   Place: ${placeName}`);
      console.log(`   Coordinates: [${latitude}, ${longitude}]`);
      console.log('');
    } else {
      console.log('⚠️  No results found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeocode();
