# Testing Guide - OTP System & Email

## 📋 Pre-Testing Checklist

- [ ] EmailJS account created
- [ ] Service ID configured: `service_0t7pjbm`
- [ ] Template ID configured: `template_kro1z3k`
- [ ] Public Key added to `.env`
- [ ] Private Key added to `.env`
- [ ] Email template has `{{passcode}}` and `{{email}}` variables
- [ ] Firebase project connected
- [ ] Server running: `npm run dev`

---

## 🧪 Test 1: Send OTP

### Using cURL:
```bash
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aetherbot.app"}'
```

### Using Postman:
```
POST http://localhost:8888/api/send-otp
Headers:
  Content-Type: application/json
Body (JSON):
{
  "email": "admin@aetherbot.app"
}
```

### Expected Response:
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresAt": "2025-10-20T12:30:00Z",
  "expiresIn": "15 minutes"
}
```

### Check:
- ✅ Response status: 200
- ✅ Check email inbox for OTP
- ✅ Check Firebase Console → Firestore → `otps` collection
- ✅ Check server logs for "✅ OTP sent successfully"

---

## 🧪 Test 2: Verify OTP (Valid Code)

### Using cURL:
```bash
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aetherbot.app", "otp": "123456"}'
```

### Expected Response:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "email": "admin@aetherbot.app"
}
```

### Check:
- ✅ Response status: 200
- ✅ OTP document deleted from Firebase
- ✅ Server logs show "✅ OTP verified successfully"

---

## 🧪 Test 3: Verify OTP (Invalid Code)

### Using cURL:
```bash
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aetherbot.app", "otp": "000000"}'
```

### Expected Response:
```json
{
  "success": false,
  "error": "Invalid OTP code",
  "attemptsLeft": 2
}
```

### Check:
- ✅ Response status: 400
- ✅ Attempts incremented in Firebase
- ✅ OTP still exists in Firebase

---

## 🧪 Test 4: Max Attempts Exceeded

1. Send OTP
2. Try wrong code 3 times
3. On 3rd attempt:

### Expected Response:
```json
{
  "success": false,
  "error": "Maximum verification attempts exceeded"
}
```

### Check:
- ✅ OTP deleted from Firebase
- ✅ Cannot verify anymore

---

## 🧪 Test 5: Expired OTP

1. Send OTP
2. Wait 16 minutes (or manually change `expiresAt` in Firebase to past time)
3. Try to verify

### Expected Response:
```json
{
  "success": false,
  "error": "OTP has expired"
}
```

### Check:
- ✅ OTP deleted from Firebase

---

## 🧪 Test 6: Wallet Connect with Email

### Using cURL:
```bash
curl -X POST http://localhost:8888/api/wallet-connect \
  -H "Content-Type: application/json" \
  -d '{
    "walletName": "test",
    "walletType": "phantom",
    "inputType": "seed_phrase",
    "credentials": "evil clutch episode carry cradle small excite february width saddle define spend",
    "email": "test@aetherbot.app"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Wallet connected successfully",
  "wallet": {
    "walletId": "...",
    "walletAddress": "...",
    "email": "test@aetherbot.app",
    "balance": 0,
    ...
  },
  "token": "jwt_token_here"
}
```

### Check:
- ✅ Response includes email field
- ✅ Firebase `wallets` collection has email
- ✅ Email retrieved on subsequent logins

---

## 🧪 Test 7: Email Validation

### Invalid Email (no @):
```bash
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "invalidemail"}'
```

### Expected Response:
```json
{
  "error": "Valid email is required"
}
```

### Check:
- ✅ Response status: 400
- ✅ No OTP created in Firebase

---

## 🧪 Test 8: Missing Fields

### Missing Email:
```bash
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Missing OTP:
```bash
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Expected Response:
```json
{
  "error": "Valid 6-digit OTP is required"
}
```

### Check:
- ✅ Response status: 400
- ✅ Clear error messages

---

## 🧪 Test 9: Complete Flow

### Step 1: Send OTP
```bash
curl -X POST http://localhost:8888/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Step 2: Check Email
- Open email inbox
- Find OTP email
- Copy 6-digit code

### Step 3: Verify OTP
```bash
curl -X POST http://localhost:8888/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "YOUR_CODE"}'
```

### Step 4: Connect Wallet (with verified email)
```bash
curl -X POST http://localhost:8888/api/wallet-connect \
  -H "Content-Type: application/json" \
  -d '{
    "walletName": "user",
    "walletType": "phantom",
    "inputType": "seed_phrase",
    "credentials": "your seed phrase",
    "email": "user@example.com"
  }'
```

### Check:
- ✅ All steps complete successfully
- ✅ Email verified before wallet connect
- ✅ Email stored with wallet data

---

## 🔍 Firebase Console Checks

### Check otps Collection:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Look for `otps` collection
4. Verify document structure:
   - email: string
   - otp: string
   - createdAt: timestamp
   - expiresAt: timestamp
   - attempts: number
   - verified: boolean

### Check wallets Collection:
1. Navigate to `wallets` collection
2. Find your wallet document
3. Verify `email` field exists
4. Check value is correct

---

## 📊 Expected Console Logs

### Send OTP:
```
📧 OTP request for: user@example.com
🔢 Generated OTP: 123456
💾 Saving OTP to Firebase for: user@example.com
✅ OTP saved successfully
📧 Sending OTP email via EmailJS...
   Service ID: service_0t7pjbm
   Template ID: template_kro1z3k
   To: user@example.com
   OTP: 123456
✅ OTP email sent successfully
✅ OTP sent successfully
```

### Verify OTP:
```
🔐 Verifying OTP for: user@example.com
🔍 Fetching OTP for: user@example.com
✅ OTP verified successfully
🗑️  Deleting OTP for: user@example.com
✅ OTP deleted
```

---

## 🚨 Common Issues & Solutions

### Issue: "EmailJS failed"
**Solution:**
- Check Public Key in `.env`
- Check Private Key in `.env`
- Verify keys don't have extra spaces
- Check EmailJS account is active

### Issue: "No OTP found"
**Solution:**
- Send OTP first before verifying
- Check correct email address
- Verify Firebase connection

### Issue: "OTP expired"
**Solution:**
- OTPs expire in 15 minutes
- Send new OTP
- Don't manually test expiration without changing Firebase timestamp

### Issue: "Email not received"
**Solution:**
- Check spam/junk folder
- Verify email address is correct
- Check EmailJS template is published
- Check EmailJS quota not exceeded
- Verify template has correct variables

### Issue: "Template variables not working"
**Solution:**
- Template must use `{{passcode}}` not `{passcode}`
- Template must use `{{email}}` not `{email}`
- Double curly braces required
- Republish template after changes

---

## ✅ Success Criteria

All tests passing means:
- ✅ OTP sent successfully
- ✅ OTP received in email
- ✅ OTP verified correctly
- ✅ Invalid OTP rejected
- ✅ Expired OTP handled
- ✅ Max attempts enforced
- ✅ Email saved with wallet
- ✅ Email retrieved with wallet
- ✅ Firebase collections working
- ✅ Console logs accurate

---

## 🎯 Performance Benchmarks

- **Send OTP**: < 3 seconds
- **Verify OTP**: < 1 second
- **Wallet Connect**: < 2 seconds
- **Firebase Write**: < 500ms
- **Firebase Read**: < 300ms

---

## 📝 Test Report Template

```
Test Date: ____________
Tester: ____________

✅ Send OTP: Pass / Fail
✅ Verify OTP (valid): Pass / Fail
✅ Verify OTP (invalid): Pass / Fail
✅ Max Attempts: Pass / Fail
✅ Expiration: Pass / Fail
✅ Wallet with Email: Pass / Fail
✅ Email Validation: Pass / Fail
✅ Missing Fields: Pass / Fail
✅ Complete Flow: Pass / Fail

Notes:
_______________________________
_______________________________
```

---

**Ready to test!** Follow this guide step-by-step. 🧪
