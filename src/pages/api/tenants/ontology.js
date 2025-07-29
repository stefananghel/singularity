import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

const mongoUri = 'mongodb+srv://esim:0qEXUQQs7937xYrp@esim.c05ujrx.mongodb.net/esim';

function generateProductDescriptions(products, tenant) {
  return products.map(product => {
    const countryNames = product.operators.map(operator => operator.countryName).join(', ');
    // Convert product.data from bytes to GB (assuming product.data is in bytes)
    const dataInGB = (product.data / (1024 ** 3)).toFixed(0);
    return `Product "${product.name}" with ID: ${product.id} is valid for ${product.validityDays} days, has the price of ${product.price} ${product.currency}, and offers a volume of ${dataInGB} GB in the following countries: ${countryNames}. You can buy it at https://${tenant.URL}/plan/${product.id}. It has the following description: ${product.description || 'No description available'}.`;
  });
}

export default async function handler(req, res) {
  let client;
  let result = {};

  try {
    client = await MongoClient.connect(mongoUri, {});
    const db = client.db('esim');
    const tenantCollection = db.collection('tenant');
    let tenant;
    //find tenant by url 
    if (req.query.url) {
      console.log('Finding tenant by URL:', req.query.url);
      tenant = await tenantCollection.findOne({ URL: req.query.url });
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
    }

    if (tenant) {
      const url = `https://${tenant.URL}/api/product`;
      console.log('Fetching data from URL:', url);
      const productsResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!productsResponse.ok) {
        throw new Error(`HTTP error! status: ${productsResponse.status}`);
      }

      const products = await productsResponse.json();
      const descriptions = generateProductDescriptions(products, tenant);
    result.tenant = tenant.name;
      result.products = descriptions;
      result.contactPage = `https://${tenant.URL}/contact`;
      result.faqPage = `https://${tenant.URL}/esim`;
      result.firstUse = `https://${tenant.URL}/faq/first-use`;
      result.guestCheckoutEnabled = tenant.guest_checkout || false;
      result.companyDescription = tenant.longFormDescription;
      result.socialMediaLinks = tenant.socialMediaLinks || {};
      result.supportEmail = tenant.supportEmail || '';
      result.suportPhone = tenant.supportPhone || '';

      return res.status(200).json({ result });
    }

  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ error: 'Database connection error' });
  }
}
