import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = notionPkg;
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

async function debugProperties() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: process.env.VITE_NOTION_DATABASE_ID,
      page_size: 1, // Just get one entry to see the structure
    });

    if (response.results.length > 0) {
      const firstPage = response.results[0];

      console.log('Available properties in your database:\n');
      console.log('Property Names:', Object.keys(firstPage.properties));
      console.log('\nProperty Details:\n');

      for (const [key, value] of Object.entries(firstPage.properties)) {
        console.log(`- ${key}: ${value.type}`);

        // Show sample value
        if (value.type === 'title' && value.title?.[0]) {
          console.log(`  Sample: "${value.title[0].plain_text}"`);
        } else if (value.type === 'number' && value.number !== null) {
          console.log(`  Sample: ${value.number}`);
        } else if (value.type === 'rich_text' && value.rich_text?.[0]) {
          console.log(`  Sample: "${value.rich_text[0].plain_text}"`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugProperties();
