const express = require('express');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST route to send OTP
let otpStore = {}; // Store OTPs temporarily

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('Email is required');

  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });

  otpStore[email] = otp; // Save OTP for verification

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to send OTP');
  }
});
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).send('Email and OTP are required');

  if (otpStore[email] === otp) {
    delete otpStore[email]; // Clear OTP after verification
    res.status(200).send({ success: true, message: 'OTP verified!' });
  } else {
    res.status(401).send({ success: false, message: 'Invalid OTP' });
  }
});
app.post('/send-payment-email', async (req, res) => {
  const { email, amount, tenure } = req.body;
  if (!email || !amount || !tenure) return res.status(400).send('Missing details');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Chittipata Payment Confirmation',
    text: `Dear user,\n\nYour payment of ₹${amount} for a ${tenure}-month plan has been received.\n\nThank you for choosing Chittipata!`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ success: true, message: 'Payment email sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to send email' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
