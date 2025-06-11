const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const router = express.Router();

// Middleware to check JWT
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

// Add gold asset
router.post('/add', authMiddleware, async (req, res) => {
  const { type, weight, total_price, purchase_date } = req.body;
  if (!type || !weight || !total_price || !purchase_date) return res.status(400).json({ error: 'All fields required' });
  const weightNum = parseFloat(weight);
  const totalPriceNum = parseFloat(total_price);
  if (weightNum <= 0) return res.status(400).json({ error: 'Weight must be positive' });
  const pricePerGram = totalPriceNum / weightNum;
  await prisma.goldAsset.create({
    data: {
      type,
      weight: weightNum,
      purchase_price: pricePerGram,
      purchase_date: new Date(purchase_date),
      userId: req.user.id
    }
  });
  res.json({ message: 'Gold asset added' });
});

// Remove gold asset
router.delete('/remove/:id', authMiddleware, async (req, res) => {
  await prisma.goldAsset.delete({ where: { id: Number(req.params.id), userId: req.user.id } });
  res.json({ message: 'Gold asset removed' });
});

// List gold assets
router.get('/list', authMiddleware, async (req, res) => {
  const assets = await prisma.goldAsset.findMany({ where: { userId: req.user.id } });
  res.json(assets);
});

module.exports = router;
