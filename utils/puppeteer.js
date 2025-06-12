const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function parseGoldRatesPuppeteer() {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set browser-like headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br'
    });

    // Navigate to the page
    await page.goto('https://www.goodreturns.in/gold-rates/', { waitUntil: 'networkidle2' });

    // Wait for the gold-common-head elements to load
    await page.waitForSelector('.gold-common-head', { timeout: 10000 });

    // Get the full HTML and save it
    const htmlText = await page.content();
    await fs.writeFile('gold_rates_puppeteer.html', htmlText);
    console.log('HTML saved to gold_rates_puppeteer.html');

    // Extract prices from elements with class 'gold-common-head'
    const goldData = await page.evaluate(() => {
      const elements = document.querySelectorAll('.gold-common-head');
      if (!elements.length) {
        console.error('No elements with class gold-common-head found');
        return {};
      }

      const goldData = {};
      // Process elements in pairs (label, price)
      for (let i = 0; i < elements.length; i += 2) {
        const labelElement = elements[i];
        const priceElement = elements[i + 1];
        if (labelElement && priceElement) {
          let label = labelElement.textContent.trim().replace(/\s/g, ''); // Remove spaces
          label = label.replace('/g', '').trim(); // Remove "/g" and trim
          const price = priceElement.textContent.trim();
          // Map labels to keys (e.g., "24KGold" -> "24K")
          const key = label.replace('Gold', ''); // e.g., "24KGold" -> "24K"
          goldData[key] = price;
        }
      }

      return goldData;
    });

    console.log('Gold Prices:', goldData);

    // Close the browser
    await browser.close();

    return goldData;
  } catch (error) {
    console.error('Error parsing gold rates:', error);
    return {};
  }
}

// Execute the function
parseGoldRatesPuppeteer();