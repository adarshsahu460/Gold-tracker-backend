const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db');

const router = express.Router();

// Helper: send OTP email
async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.OTP_EMAIL_USER,
      pass: process.env.OTP_EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.OTP_EMAIL_USER,
    to: email,
    subject: 'Your OTP for Gold Tracker Registration',
    text: `Your OTP is: ${otp}`,
  });
}

// Register route
router.post('/register', async (req, res) => {
  const { userid, password, email, region } = req.body;
  if (!userid || !password || !email || !region) return res.status(400).json({ error: 'All fields required' });
  const hashed = await bcrypt.hash(password, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  try {
    const user = await prisma.user.create({
      data: { userid, password: hashed, email, region, otp, otp_expires: otpExpires }
    });
    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent to email. Please verify.' });
  } catch (e) {
    res.status(400).json({ error: 'User already exists or DB error.' });
  }
});

// OTP verification
router.post('/verify-otp', async (req, res) => {
  const { userid, otp } = req.body;
  const user = await prisma.user.findUnique({ where: { userid } });
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Already verified' });
  if (user.otp !== otp || new Date() > user.otp_expires) return res.status(400).json({ error: 'Invalid or expired OTP' });
  await prisma.user.update({ where: { userid }, data: { is_verified: true, otp: null, otp_expires: null } });
  res.json({ message: 'Account verified. You can now login.' });
});

// Login route
router.post('/login', async (req, res) => {
  const { userid, password } = req.body;
  const user = await prisma.user.findUnique({ where: { userid } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  if (!user.is_verified) return res.status(400).json({ error: 'Account not verified' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, userid: user.userid, region: user.region }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

module.exports = router;
