# Chittipata OTP Backend (Node.js)

A tiny Express server to send and verify 6‑digit OTPs.

## Quick Start (Windows)

1) Install dependencies:
```
npm install
```

2) Copy `.env.example` to `.env`, then edit variables. For testing without SMS:
```
OTP_PROVIDER=TEST
ALLOWED_ORIGIN=https://chitfund-cn.github.io
```

3) Run:
```
npm start
```
The server prints `OTP server running on :8080...`.

4) Open `demo.html` in your browser to test.  
Change `BACKEND_URL` at the top of `demo.html` if needed.

## Endpoints

- `POST /send-otp` body: `{ mobile, name?, planAmount?, tenure?, email?, address? }`  
- `POST /verify-otp` body: `{ mobile, otp }`

## Notes
- In production, use Redis/DB for OTP storage.
- Add CAPTCHA to reduce abuse.
