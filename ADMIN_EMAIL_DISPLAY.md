# Admin Dashboard - Email Display Update

## Changes Made

Added email field display to the admin dashboard in **two locations**:

### 1. Wallets Table (Main View)
- Added "Email" column header between "Wallet Address" and "Type"
- Displays user email or "Not provided" in gray if empty
- Updated colspan from 6 to 7 for loading/empty states

### 2. Wallet Details Modal (View Details)
- Added "Email" row at the top of the details section (right after Address)
- Shows email value or "Not provided" in gray if empty

## Visual Display

### Table View
```
| Wallet Address | Email              | Type    | SOL  | Aetherbot | Logins | Actions |
|----------------|--------------------|---------| -----|-----------|--------|---------|
| Gx7x...xxx     | user@example.com   | solflare| 0.00 | 100.00    | 5      | Buttons |
| 8Kzp...yyy     | Not provided       | phantom | 0.00 | 0.00      | 1      | Buttons |
```

### Details Modal
```
📊 Wallet Details

Address: Gx7x...xxx
Email: user@example.com
Type: solflare
Input: passphrase
SOL: 0.0000
Aetherbot: 100.00
...
```

## Testing

1. **Start your dev server**: `npm run dev`
2. **Login to admin dashboard**: http://localhost:8888/admin.html
   - Username: admin
   - Password: admin123
3. **View wallets table**: Email column should now be visible
4. **Click "View" on any wallet**: Email should appear in the details modal

## Notes

- Email field shows "Not provided" (in gray) if the wallet has no email stored
- Email is displayed in full (not truncated) for admin visibility
- Existing wallets without email will show "Not provided" until user updates their info
- New wallet connections with email parameter will display the email immediately

## Files Modified

- `public/admin.html` (3 sections)
  - Table header: Added Email column
  - Table body: Display email value or placeholder
  - Details modal: Show email in details view
