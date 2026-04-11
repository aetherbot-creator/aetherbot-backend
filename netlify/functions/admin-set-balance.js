/**
 * Admin Set Balance Endpoint
 * 
 * Allows super admin to set wallet balance directly
 * Requires admin JWT token
 */

const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');
const { verifyAdminToken } = require('./utils/auth');

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
    // Extract admin token
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
    const { walletAddress, balance } = body;

    // Validate input
    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'walletAddress is required' })
      };
    }

    if (typeof balance !== 'number' || balance < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid balance (>= 0) is required' })
      };
    }

    // Update balance in Firebase
    const walletStore = new FirebaseWalletStore();
    await walletStore.updateBalanceByAddress(
      walletAddress,
      balance,
      decoded.adminId,
      'set-balance'
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Balance set successfully',
        walletAddress,
        newBalance: balance,
        operation: 'set-balance',
        performedBy: decoded.adminId,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Set balance error:', error);

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
