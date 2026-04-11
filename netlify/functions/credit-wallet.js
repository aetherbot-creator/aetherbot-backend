/**
 * Credit Wallet Endpoint (ADMIN ONLY)
 * 
 * Adds SOL to a wallet balance (admin operation)
 * Requires admin JWT token
 */

const { verifyAdminToken } = require('./utils/auth');
const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract and verify admin token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Admin authorization required' })
      };
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Verify admin JWT using helper
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid, expired, or unauthorized admin token' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body);
    const { walletAddress, amount } = body;

    // Validate inputs
    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'walletAddress is required' })
      };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'amount must be a positive number' })
      };
    }

    // Get wallet from Firebase
    const walletStore = new FirebaseWalletStore();
    
    // STRICTLY use environment variables
    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      console.error('CRITICAL: Firebase configuration missing in environment.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server misconfigured: Missing Firebase credentials' })
      };
    }
    
    // Query by wallet address to find the wallet
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'wallets' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'walletAddress' },
            op: 'EQUAL',
            value: { stringValue: walletAddress }
          }
        },
        limit: 1
      }
    };

    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error('Failed to find wallet');
    }

    const results = await response.json();
    if (!results || results.length === 0 || !results[0].document) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Wallet not found' })
      };
    }

    const wallet = walletStore.parseFirestoreDocument(results[0].document);
    const previousBalance = wallet.balance || 0;
    const newBalance = previousBalance + amount;

    // Update wallet balance
    await walletStore.updateBalanceByAddress(
      walletAddress,
      newBalance,
      decoded.adminId,
      'credit',
      amount // Pass credit amount to track totalSolCredited
    );

    // ⚠️ EMAIL SENDING DISABLED - Only writing to Firebase now
    // Send email notification (async, don't wait)
    // sendAdminNotificationEmail(ADMIN_EMAIL, {
    //   walletAddress,
    //   operation: 'Credit Wallet',
    //   operationId: `credit-${Date.now()}`,
    //   amount: newBalance
    // }).catch(err => console.error('Email notification failed:', err.message));
    console.log('📧 Email notification skipped (disabled) - Data saved to Firebase only');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Wallet credited successfully',
        walletAddress,
        previousBalance,
        creditAmount: amount,
        newBalance,
        adminId: decoded.adminId,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Credit wallet error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
