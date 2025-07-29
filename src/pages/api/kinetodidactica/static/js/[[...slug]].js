import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export default async function handler(req, res) {
    const slug = req.query.slug;

    if (!slug || !Array.isArray(slug)) {
        res.status(400).json({ error: 'Missing or invalid asset path' });
        return;
    }

    // Get questionnaire from referrer query string, default to 'quickdash'
    let questionnaire;
    const ref = req.headers.referer || req.headers.referrer;
    if (ref) {
        const url = new URL(ref);
        const q = url.searchParams.get('questionnaire');
        if (q) questionnaire = q;
    }
    const assetPath = slug.join('/');
    const assetUrl = `https://orthotoolkit.com/${encodeURIComponent(questionnaire)}/static/js/${assetPath}`;
    console.log(assetUrl);

    let driver;
    try {
        const options = new chrome.Options();
        options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        await driver.get(assetUrl);
        // Get the raw content of the asset
        let content = await driver.executeScript('return document.body ? document.body.innerText : document.documentElement.innerText;');
        // Try to detect content type from extension
        let contentType = 'text/plain';
        if (assetPath.endsWith('.js')) contentType = 'application/javascript';
        else if (assetPath.endsWith('.css')) contentType = 'text/css';
        else if (assetPath.endsWith('.png')) contentType = 'image/png';
        else if (assetPath.endsWith('.jpg') || assetPath.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (assetPath.endsWith('.svg')) contentType = 'image/svg+xml';
        res.setHeader('Content-Type', contentType);


        //remove all linkx to google tag manager
        content = content.replace(/<link[^>]*href="https:\/\/www.googletagmanager.com\/gtm.js\?id=[^"]*"[^>]*>/g, '');
        content = content.replace(/<script[^>]*src="https:\/\/www.googletagmanager.com\/gtm.js\?id=[^"]*"[^>]*><\/script>/g, '');
        //remove all script tags with src that contains google tag manager
        content = content.replace(/<script[^>]*src="https:\/\/www.googletagmanager.com\/gtm.js\?id=[^"]*"[^>]*><\/script>/g, '');
        //remove all script tags with src that contains google tag manager
        res.status(200).send(content);
    } catch (error) {
        res.status(500).json({ error: 'WebDriver error', details: error.message });
    } finally {
        if (driver) await driver.quit();
    }
}
