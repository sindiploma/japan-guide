import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Client } = notionPkg;
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

async function testNotionConnection() {
  console.log('Testing Notion API connection...\n');
  console.log('Notion client properties:', Object.keys(notion));
  console.log('Notion databases:', notion.databases);

  // Check if API key is set
  if (!process.env.VITE_NOTION_API_KEY) {
    console.error('❌ VITE_NOTION_API_KEY is not set in .env file');
    process.exit(1);
  }

  console.log('✓ API Key found:', process.env.VITE_NOTION_API_KEY.substring(0, 10) + '...');

  // Check if database ID is set
  if (!process.env.VITE_NOTION_DATABASE_ID) {
    console.error('❌ VITE_NOTION_DATABASE_ID is not set in .env file');
    process.exit(1);
  }

  console.log('✓ Database ID found:', process.env.VITE_NOTION_DATABASE_ID);
  console.log('\nAttempting to query database using dataSources API (SDK v5)...\n');

  try {
    const response = await notion.dataSources.query({
      data_source_id: process.env.VITE_NOTION_DATABASE_ID,
    });

    console.log('✅ Successfully connected to Notion!');
    console.log(`\nFound ${response.results.length} entries in the database\n`);

    // Display each location
    response.results.forEach((page, index) => {
      const properties = page.properties;
      const name = properties.Nombre?.title?.[0]?.plain_text || 'Unnamed';
      const latitudeText = properties.Latitude?.rich_text?.[0]?.plain_text;
      const longitudeText = properties.Longitude?.rich_text?.[0]?.plain_text;
      const latitude = latitudeText ? parseFloat(latitudeText) : null;
      const longitude = longitudeText ? parseFloat(longitudeText) : null;
      const description = properties.Notes?.rich_text?.[0]?.plain_text || '';
      const address = properties.Address?.rich_text?.[0]?.plain_text || '';

      console.log(`${index + 1}. ${name}`);
      console.log(`   Coordinates: ${latitude}, ${longitude}`);
      if (address) {
        console.log(`   Address: ${address}`);
      }
      if (description) {
        console.log(`   Notes: ${description}`);
      }
      console.log('');
    });

    // Check for valid locations
    const validLocations = response.results.filter(page => {
      const latText = page.properties.Latitude?.rich_text?.[0]?.plain_text;
      const lngText = page.properties.Longitude?.rich_text?.[0]?.plain_text;
      const lat = latText ? parseFloat(latText) : null;
      const lng = lngText ? parseFloat(lngText) : null;
      return lat && lng && !isNaN(lat) && !isNaN(lng);
    });

    console.log(`Valid locations (with coordinates): ${validLocations.length}/${response.results.length}`);

  } catch (error) {
    console.error('❌ Error connecting to Notion:', error.message);
    console.error('\nPossible issues:');
    console.error('1. API key format is incorrect (should start with "ntn_" or "secret_")');
    console.error('2. Database ID is incorrect');
    console.error('3. Database is not shared with the integration');
    console.error('4. Integration does not have read access');
    process.exit(1);
  }
}

testNotionConnection();
