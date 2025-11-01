import notionPkg from '@notionhq/client';

const { Client } = notionPkg;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields: name, latitude, longitude' });
    }

    const dataSourceId = process.env.VITE_NOTION_DATABASE_ID;

    if (!dataSourceId) {
      return res.status(500).json({ error: 'VITE_NOTION_DATABASE_ID is not configured' });
    }

    if (!process.env.VITE_NOTION_API_KEY) {
      return res.status(500).json({ error: 'VITE_NOTION_API_KEY is not configured' });
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.VITE_NOTION_API_KEY,
    });

    console.log(`📍 Adding new location to Notion: "${name}"`);

    // Create a new page in the Notion database
    const response = await notion.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: dataSourceId,
      },
      properties: {
        Nombre: {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        Address: {
          rich_text: [
            {
              text: {
                content: address || '',
              },
            },
          ],
        },
        Latitude: {
          rich_text: [
            {
              text: {
                content: latitude.toString(),
              },
            },
          ],
        },
        Longitude: {
          rich_text: [
            {
              text: {
                content: longitude.toString(),
              },
            },
          ],
        },
      },
    });

    console.log(`✅ Added location "${name}" to Notion with ID: ${response.id}`);
    res.status(200).json({ success: true, id: response.id });
  } catch (error) {
    console.error('Error adding location to Notion:', error);
    res.status(500).json({ error: error.message });
  }
}
