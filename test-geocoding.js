import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = notionPkg;
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

async function testGeocoding() {
  const dataSourceId = process.env.VITE_NOTION_DATABASE_ID;

  console.log('Fetching locations from Notion...');
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });

  console.log('\n📊 Location Analysis:\n');

  let withCoords = 0;
  let withoutCoords = 0;
  let missingLocations = [];

  response.results.forEach(page => {
    const properties = page.properties;
    const name = properties.Nombre?.title?.[0]?.plain_text || 'Unnamed Location';
    const latitudeText = properties.Latitude?.rich_text?.[0]?.plain_text;
    const longitudeText = properties.Longitude?.rich_text?.[0]?.plain_text;
    const address = properties.Address?.rich_text?.[0]?.plain_text || '';

    const latitude = latitudeText ? parseFloat(latitudeText) : null;
    const longitude = longitudeText ? parseFloat(longitudeText) : null;

    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      withCoords++;
    } else {
      withoutCoords++;
      missingLocations.push({ name, address });
    }
  });

  console.log(`✅ Locations WITH coordinates: ${withCoords}`);
  console.log(`⚠️  Locations WITHOUT coordinates: ${withoutCoords}`);

  if (missingLocations.length > 0) {
    console.log('\n🔍 Locations that will be geocoded:\n');
    missingLocations.forEach(loc => {
      console.log(`  - ${loc.name}`);
      console.log(`    Address: ${loc.address || 'NO ADDRESS'}`);
      console.log('');
    });
  }
}

testGeocoding().catch(console.error);
