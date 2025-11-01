import notionPkg from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = notionPkg;
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY,
});

async function testIds() {
  const databaseId = '20d44281-35c3-80a8-be31-d75be4c49320';
  const viewId = '20d44281-35c3-80a0-b916-000c98e2743a';

  console.log('Testing database ID:', databaseId);
  try {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
    });
    console.log('✅ Database ID works!');
  } catch (error) {
    console.log('❌ Database ID failed:', error.message);
  }

  console.log('\nTesting view ID:', viewId);
  try {
    const response = await notion.dataSources.query({
      data_source_id: viewId,
    });
    console.log('✅ View ID works!');
  } catch (error) {
    console.log('❌ View ID failed:', error.message);
  }
}

testIds();
