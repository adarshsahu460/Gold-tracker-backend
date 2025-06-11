const express = require('express');
const prisma = require('../db');
const jwt = require('jsonwebtoken');
const { getGoldPricePerGram } = require('../utils/goldPriceUpdater');

const router = express.Router();

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Dashboard: invested, current value, net profit
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  // Get all assets
  const assets = await prisma.goldAsset.findMany({ where: { userId } });
  // Get latest gold prices (no cache, always fresh)
  const prices = await require('../utils/goldPriceUpdater').getGoldPricePerGram();
  const price24K = prices._24k ?? null;
  const price22K = prices._22k ?? null;
  const price18K = prices._18k ?? null;
  let invested = 0, current = 0;
  assets.forEach(a => {
    invested += parseFloat(a.weight) * parseFloat(a.purchase_price);
    current += parseFloat(a.weight) * (price24K || 0); // Use 24K for current value
  });
  res.json({ invested, current, net: current - invested, price24K, price22K, price18K });
});

module.exports = router;
