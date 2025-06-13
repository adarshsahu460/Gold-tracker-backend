const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const cron = require('node-cron');

// In-memory cache for gold price
let goldPriceCache = {
  value: null,
  lastUpdated: null
};

// Fetch and update cache every hour
async function updateGoldPriceCache() {
  try {
    const price = await fetchGoldRatesPerGram();
    goldPriceCache.value = price;
    goldPriceCache.lastUpdated = new Date();
    console.log('Gold price cache updated:', price);
  } catch (err) {
    console.error('Failed to update gold price cache:', err);
  }
}

// Schedule: every hour at minute 0
cron.schedule('0 * * * *', updateGoldPriceCache);

// Initial fetch on server start
updateGoldPriceCache();

async function fetchGoldRatesPerGram() {
  try {
    // Use recommended args for production (Render) and local
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run'
      ]
    });
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

    // Save the HTML for debugging
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
          label = label.replace('/g', '').trim(); // Remove "/g"
          const price = priceElement.textContent.trim().replace('₹', '').replace(',', ''); // Remove ₹ and commas
          // Map labels to keys (e.g., "24KGold" -> "24K")
          const key = label.replace('Gold', ''); // e.g., "24KGold" -> "24K"
          goldData[key] = parseFloat(price); // Convert to number
        }
      }

      return goldData;
    });

    // Close the browser
    await browser.close();

    // Format the output to match {_24k, _22k, _18k}
    const rate24k = goldData['24K'] || null;
    const rate22k = goldData['22K'] || null;
    const rate18k = goldData['18K'] || null;

    if (!rate24k && !rate22k && !rate18k) {
      throw new Error('Could not parse gold rates from gold-common-head elements');
    }
    return {
      _24k: rate24k,
      _22k: rate22k,
      _18k: rate18k,
    };
  } catch (error) {
    console.error('Error fetching gold rates:', error);
    throw error;
  }
}

// Return cached value
async function getGoldPricePerGram() {
  if (goldPriceCache.value) {
    return goldPriceCache.value;
  }
  // If cache is empty, fetch and update immediately
  await updateGoldPriceCache();
  return goldPriceCache.value;
}

async function updateGoldPrices(prisma) {
  const pricePerGram = await getGoldPricePerGram();
  const now = new Date();
  await prisma.goldValue.create({
    data: {
      date: now,
      price_per_gram: pricePerGram,
    },
  });
  console.log('Gold price updated (per gram):', pricePerGram);
}

// Store the maximum gold price per day at 23:59
cron.schedule('59 23 * * *', async () => {
  const pricePerGram = await getGoldPricePerGram();
  const now = new Date();
  // Set time to 23:59:00 for the record
  now.setHours(23, 59, 0, 0);
  // Use Prisma to upsert (update or insert) the max price for the day
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    // Find the max price for today (from cache or DB)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    // Get all prices for today
    const todayPrices = await prisma.goldValue.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    let maxPrice = pricePerGram._24k;
    todayPrices.forEach(p => {
      if (p.price_per_gram._24k > maxPrice) maxPrice = p.price_per_gram._24k;
    });
    // Upsert the max price for today at 23:59
    await prisma.goldValue.upsert({
      where: { date: now },
      update: { price_per_gram: { _24k: maxPrice, _22k: pricePerGram._22k, _18k: pricePerGram._18k } },
      create: { date: now, price_per_gram: { _24k: maxPrice, _22k: pricePerGram._22k, _18k: pricePerGram._18k } }
    });
    console.log('Max gold price for today stored at 23:59:', maxPrice);
  } catch (err) {
    console.error('Failed to store max gold price for today:', err);
  } finally {
    await prisma.$disconnect();
  }
});

module.exports = { updateGoldPrices, getGoldPricePerGram };