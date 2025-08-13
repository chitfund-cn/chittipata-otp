require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const app = express();

// --- simple in-memory store (for production, use Redis or a database) ---
const store = new Map(); // key: mobile, value: { otp, expiresAt, attempts }

const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: ORIGIN === "*" ? true : ORIGIN, methods: ["POST", "OPTIONS"] }));
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 15, // 15 requests per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Simple health endpoint
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "chittipata-otp", originAllowed: ORIGIN });
});

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSms(mobile, message) {
  const provider = (process.env.OTP_PROVIDER || "TEST").toUpperCase();

  if (provider === "TEST") {
    console.log(`[TEST SMS] ${mobile}: ${message}`);
    return { ok: true };
  }

  if (provider === "2FACTOR") {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    if (!apiKey) throw new Error("Missing TWOFACTOR_API_KEY");
    // 2Factor basic SMS endpoint
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(
      mobile
    )}/${encodeURIComponent(message)}`;
    const res = await axios.get(url);
    const ok = res?.data?.Status === "Success";
    if (!ok) console.error("2Factor error:", res?.data);
    return { ok, raw: res?.data };
  }

  if (provider === "MSG91") {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) throw new Error("Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID");
    // MSG91 flow API
    const res = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      {
        template_id: templateId,
        recipients: [
          {
            mobiles: mobile,
            // If your template expects custom variable for OTP, map it:
            otp: message.match(/\d{4,8}/)?.[0] || "",
          },
        ],
      },
      { headers: { authkey: authKey, "content-type": "application/json" } }
    );
    const ok = !!res?.data;
    if (!ok) console.error("MSG91 error:", res?.data);
    return { ok, raw: res?.data };
  }

  throw new Error("Unsupported OTP_PROVIDER");
}

// --- Send OTP ---
app.post("/send-otp", async (req, res) => {
  try {
    const { mobile, name, planAmount, tenure, email, address } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "mobile is required" });

    const otp = genOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    store.set(mobile, { otp, expiresAt, attempts: 0 });

    const text = `Chittipata OTP ${otp}. Valid 5 mins. Do not share.`;
    const sent = await sendSms(mobile, text);
    if (!sent.ok) return res.status(500).json({ error: "Failed to send OTP", details: sent.raw });

    res.json({ ok: true, message: "OTP sent" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Verify OTP ---
app.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body || {};
  if (!mobile || !otp) return res.status(400).json({ error: "mobile and otp are required" });

  const row = store.get(mobile);
  if (!row) return res.status(400).json({ error: "No OTP issued for this mobile" });

  if (Date.now() > row.expiresAt) {
    store.delete(mobile);
    return res.status(400).json({ error: "OTP expired" });
  }

  row.attempts = (row.attempts || 0) + 1;
  if (row.attempts > 5) {
    store.delete(mobile);
    return res.status(429).json({ error: "Too many attempts. OTP reset." });
  }

  if (row.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

  store.delete(mobile);
  return res.json({ ok: true, message: "OTP verified" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`OTP server running on :${port}. Allowed origin: ${ORIGIN}`));
