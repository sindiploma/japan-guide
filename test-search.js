import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = notionPkg;
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

async function searchSharedContent() {
  console.log('Searching for all content shared with this integration...\n');

  try {
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'data_source'
      }
    });

    console.log(`✅ Found ${response.results.length} data sources shared with this integration:\n`);

    if (response.results.length === 0) {
      console.log('⚠️  No databases are currently shared with this integration!');
      console.log('\nTo share a database:');
      console.log('1. Open your database in Notion');
      console.log('2. Click the "..." menu (top right)');
      console.log('3. Select "Add connections"');
      console.log('4. Choose "Japan Map" from the list');
      console.log('5. Click "Confirm"\n');
    } else {
      response.results.forEach((db, index) => {
        console.log(`${index + 1}. ${db.title?.[0]?.plain_text || 'Untitled'}`);
        console.log(`   ID: ${db.id}`);
        console.log(`   URL: ${db.url}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

searchSharedContent();
