# Server Restart Instructions

## Issue
Port 3999 is already in use - you have another dev server running.

## Solution

### Option 1: Kill the Process (Recommended)
```powershell
# Find the process using port 3999
netstat -ano | findstr :3999

# Kill the process (replace <PID> with the number from the last column)
taskkill /PID <PID> /F

# Then restart the server
npm run dev
```

### Option 2: Use Task Manager
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Node.js" or "netlify" process
3. End the task
4. Run `npm run dev` again

### Option 3: Restart VS Code
Sometimes the easiest solution:
1. Close VS Code completely
2. Reopen it
3. Run `npm run dev`

## After Restarting

Once the server is running, you should see:
```
✓ Loaded function credit-aetherbot
```

Then:
1. **Hard refresh your browser** (Ctrl+Shift+R)
2. **Login to admin dashboard**
3. **Test the Snipe button** - it should work now!

## What Got Renamed

| Old Name | New Name |
|----------|----------|
| `credit-solsnipe.js` | `credit-aetherbot.js` |
| Endpoint: `/credit-solsnipe` | `/credit-aetherbot` |

The server must be restarted to load the renamed file.
