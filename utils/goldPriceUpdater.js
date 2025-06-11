const axios = require('axios');
const cheerio = require('cheerio');

async function fetchIBJARatesPerGram() {
  const url = 'https://ibjarates.com/';
  const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(html);
  let rate24k = null, rate22k = null, rate18k = null;
  // Select the gold slider div
  const goldDiv = $('.owl-carousel.allgold_slider.owl-loaded.owl-drag');
  if (goldDiv.length) {
    // Try to get the rates by span IDs directly (more robust)
    const val999 = goldDiv.find('span#GoldRatesCompare999').first().text().replace(/,/g, '');
    const val916 = goldDiv.find('span#GoldRatesCompare916').first().text().replace(/,/g, '');
    const val750 = goldDiv.find('span#GoldRatesCompare750').first().text().replace(/,/g, '');
    if (val999) rate24k = parseFloat(val999);
    if (val916) rate22k = parseFloat(val916);
    if (val750) rate18k = parseFloat(val750);
  }
  // Fallback: try to get the rates from anywhere in the page if not found in goldDiv
  if (!rate24k) {
    const fallback999 = $('span#GoldRatesCompare999').first().text().replace(/,/g, '');
    if (fallback999) rate24k = parseFloat(fallback999);
  }
  if (!rate22k) {
    const fallback916 = $('span#GoldRatesCompare916').first().text().replace(/,/g, '');
    if (fallback916) rate22k = parseFloat(fallback916);
  }
  if (!rate18k) {
    const fallback750 = $('span#GoldRatesCompare750').first().text().replace(/,/g, '');
    if (fallback750) rate18k = parseFloat(fallback750);
  }
  if (!rate24k && !rate22k && !rate18k) throw new Error('Could not parse IBJA rates from gold slider');
  return {
    _24k: rate24k,
    _22k: rate22k,
    _18k: rate18k,
  };
}

async function getGoldPricePerGram() {
  // Always fetch fresh from IBJA
  return await fetchIBJARatesPerGram();
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
  console.log('Gold price updated (IBJA per gram):', pricePerGram);
}

module.exports = { updateGoldPrices, getGoldPricePerGram };
