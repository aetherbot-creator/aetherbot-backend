# Email Not Saving for Passphrase Connections - Debug

## Issue
When connecting a wallet with a passphrase (not seed phrase), the email isn't being written to Firebase.

## Added Debug Logging

### 1. wallet-connect.js (Line ~50)
Added logging to show incoming request details:
```javascript
console.log('📨 Wallet connection request:', {
  walletType,
  inputType,
  hasEmail: !!email,
  email: email || 'not provided'
});
```

### 2. firebaseWalletStore.js (Line ~347)
Added logging to show what email was saved:
```javascript
console.log('✅ Wallet balance updated:', { 
  walletId, 
  balance, 
  transactionCount: transactionsToSave.length,
  emailSaved: finalEmail || 'none'
});
```

## How to Debug

### Test with Passphrase
```powershell
curl -X POST http://localhost:8888/.netlify/functions/wallet-connect `
  -H "Content-Type: application/json" `
  -d '{
    "walletName": "test",
    "walletType": "phantom",
    "inputType": "passphrase",
    "credentials": "your-custom-passphrase",
    "email": "test@example.com"
  }'
```

### Check Server Logs
Look for these messages:
```
📨 Wallet connection request: {
  walletType: 'phantom',
  inputType: 'passphrase',
  hasEmail: true,
  email: 'test@example.com'
}

📧 Email from request: test@example.com
📝 Updating wallet abc-123 with email: test@example.com
✅ Wallet balance updated: {
  walletId: 'abc-123',
  balance: 0,
  transactionCount: 0,
  emailSaved: 'test@example.com'
}
```

## Possible Issues to Check

1. **Email not in request** - Frontend not sending email parameter
2. **Email is empty string** - Frontend sending `email: ""`
3. **Email being overwritten** - Something else updating wallet after connection
4. **Firebase update failing silently** - Check for error messages

## Next Steps

1. **Restart dev server** to load new logging
2. **Connect wallet with passphrase** and include email
3. **Check console output** for the debug logs
4. **Share the logs** so we can see exactly what's happening

The logs will tell us:
- ✅ Is email in the request?
- ✅ Is email being passed to update function?
- ✅ Is email being saved to Firebase?
