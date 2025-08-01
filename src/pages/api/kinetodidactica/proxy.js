import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { questionnaire = 'test' } = req.query;
  const url = `http://localhost:3001/api/kinetodidactica/${encodeURIComponent(questionnaire)}/index.html`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).send('Error fetching proxied page');
      return;
    }
    const html = await response.text();
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Proxy error: ' + error.message);
  }
}

