const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const otpStore = {}; // Temporary in-memory store

// ✅ Send OTP
app.post("/send-otp", async (req, res) => {
  const phone = req.body.phone;
  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore[phone] = otp;

  try {
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: "cLoqaDds02CNfuAytrPXTFJ3kWU8KOVIZSb54MhlYemQpRxgwi9JTgnkLKNyCwV4HsXe1lpjZSDmMQ05", // 🔑 Replace this
        variables_values: otp,
        route: "otp",
        numbers: phone,
      },
    });

    res.json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error("SMS Error:", error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ✅ Verify OTP
app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (otpStore[phone] && otpStore[phone] == otp) {
    delete otpStore[phone]; // Clear OTP after success
    res.json({ message: "OTP verified successfully!" });
  } else {
    res.status(400).json({ message: "Invalid OTP" });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
