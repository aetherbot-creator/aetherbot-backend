/**
 * Admin Toggle Bot Status Endpoint
 * Admin can toggle any user's bot on/off
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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Admin authorization required' }) };

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const authResult = verifyAdminToken(token);

    if (!authResult.verified) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized admin access' }) };
    }

    const body = JSON.parse(event.body);
    const { walletId, botStatus } = body;

    if (!walletId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'walletId is required' }) };
    if (!['running', 'paused'].includes(botStatus)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'botStatus must be running or paused' }) };
    }

    const walletStore = new FirebaseWalletStore();
    await walletStore.updateBotStatus(walletId, botStatus);

    console.log(`✅ Admin updated bot status for wallet ${walletId}: ${botStatus}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, walletId, botStatus, message: `Bot ${botStatus === 'running' ? 'activated' : 'paused'} successfully` })
    };

  } catch (error) {
    console.error('Admin toggle bot error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
  }
};
