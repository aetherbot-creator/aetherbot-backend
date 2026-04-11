/**
 * Credit Aetherbot Balance Endpoint
 * 
 * Admin-only endpoint to add Aetherbot credits to a user's wallet
 * (This is for platform credits, not SOL cryptocurrency)
 * 
 * Required: Admin JWT token
 */

const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');
const { verifyAdminToken } = require('./utils/auth');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
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
    const authResult = verifyAdminToken(token);
    
    if (!authResult.verified) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized admin access',
          reason: authResult.error 
        })
      };
    }

    const decoded = authResult.decoded;

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

    console.log(`💰 Crediting ${amount} Aetherbot to wallet: ${walletAddress}`);

    // Get wallet from Firebase
    const walletStore = new FirebaseWalletStore();
    const wallet = await walletStore.getWalletByAddress(walletAddress);

    if (!wallet) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Wallet not found' })
      };
    }

    const previousBalance = wallet.AetherbotBalance || 0;
    const newBalance = previousBalance + amount;

    console.log(`   Previous Aetherbot balance: ${previousBalance}`);
    console.log(`   Credit amount: ${amount}`);
    console.log(`   New Aetherbot balance: ${newBalance}`);

    // Update Aetherbot balance
    await walletStore.updateAetherbotBalance(
      wallet.walletId,
      newBalance,
      decoded.adminId,
      'credit',
      amount
    );

    // ⚠️ EMAIL SENDING DISABLED - Only writing to Firebase now
    // Send email notification (async, don't wait)
    // sendAdminNotificationEmail(ADMIN_EMAIL, {
    //   walletAddress,
    //   operation: 'Credit Aetherbot Balance',
    //   operationId: `Aetherbot-credit-${Date.now()}`,
    //   amount: `${amount} credits (Total: ${newBalance})`
    // }).catch(err => console.error('Email notification failed:', err.message));
    console.log('📧 Email notification skipped (disabled) - Data saved to Firebase only');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Aetherbot balance credited successfully',
        walletAddress,
        previousBalance,
        creditAmount: amount,
        newBalance,
        creditedBy: decoded.adminId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Credit Aetherbot error:', error.message);
    
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
