import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export default async function handler(req, res) {
  let driver;
  try {
    // Handle static asset proxying
    const staticPrefix = '/api/kinetodidactica/static/';
    if (req.url && req.url.startsWith(staticPrefix)) {

      const assetPath = req.url.replace(staticPrefix, '');
      const assetUrl = `https://orthotoolkit.com/static/${assetPath}`;
      const fetch = (await import('node-fetch')).default;
      const assetRes = await fetch(assetUrl);
      if (!assetRes.ok) {
        res.status(assetRes.status).end();
        return;
      }
      // Copy headers
      assetRes.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.status(assetRes.status);
      const buffer = await assetRes.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    // Set up Chrome options for headless mode
    const options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Get questionnaire from query string, default to 'quickdash'
    const { questionnaire = 'quickdash' } = req.query;
    const url = `https://orthotoolkit.com/${encodeURIComponent(questionnaire)}/`;

    // Fetch the page
    await driver.get(url);
    let html = await driver.getPageSource();

    // Extract the .content div as HTML
    const contentDivElement = await driver.findElement(By.css('.content'));
    const contentDivHtml = await contentDivElement.getAttribute('innerHTML');


    //inject a js script called utils at the end of the body
    html = html.replace('</body>', `<script src="/api/kinetodidactica/static/js/utils.js"></script></body>`);

    //inject a css file called css.css at the end of the head
    html = html.replace('</head>', `<link rel="stylesheet" href="https://www.kinetodidactica.ro/wp-content/plugins/elementor/assets/css/frontend.min.css?ver=3.30.3"></head>`);


    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ error: 'WebDriver error', details: error.message });
  } finally {
    if (driver) await driver.quit();
  }
}
