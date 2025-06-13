const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');
const goldRoutes = require('./routes/gold');
const dashboardRoutes = require('./routes/dashboard');
const { updateGoldPrices } = require('./utils/goldPriceUpdater');

dotenv.config();

const app = express();

const allowedOrigins = [
  'https://gold-tracker-frontend-m4fzp2ueg-adarshsahu460s-projects.vercel.app',
  'https://gold-tracker.adarshsahu.site'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

const prisma = new PrismaClient();
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/gold', goldRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Schedule gold price update at 12 AM every day
cron.schedule('0 0 * * *', () => updateGoldPrices(prisma));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
