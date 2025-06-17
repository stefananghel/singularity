import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

const mongoUri = 'mongodb+srv://esim:0qEXUQQs7937xYrp@esim.c05ujrx.mongodb.net/esim';

export default async function handler(req, res) {
  let client;
  let result = [];

  try {
    client = await MongoClient.connect(mongoUri, {});
    const db = client.db('esim');
    const tenantCollection = db.collection('tenant');

    const tenants = await tenantCollection.find({}, {}).toArray();
    const fetchPromises = tenants.map(async (tenant) => {
      const url = 'https://' + tenant.URL;
      if (!url || url === 'https://travel.esimvault.cloud') {
        return null;
      }

      if (tenant.telco_vision_configuration) {
        const { source_account_id, destination_account_id, token } = tenant.telco_vision_configuration;
        const apiUrl = `https://ocs-api.telco-vision.com:7443/ocs-custo/main/v1?token=${token}`;
        const requestData = {
          listSubscriber: {
            accountId: destination_account_id
          }
        };

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'accept': '*/*',
              'Content-Type': 'text/plain'
            },
            body: JSON.stringify(requestData)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('', tenant.name, ": ", data.listSubscriber.nbFound);
          return { tenant: tenant.name, count: data.listSubscriber.nbFound };
        } catch (error) {
          console.error('Error calling API:', error);
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    result = results.filter(r => r !== null);
    //sort by count
    result =result.sort((a, b) => b.count - a.count);

    res.status(200).json({result});

  } catch (error) {
    console.error('Error occurred while generating prompts:', error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
