/**
 * Toggle Bot Status Endpoint
 * User can toggle their own bot on/off
 */

const jwt = require('jsonwebtoken');
const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-use-crypto-randomBytes';

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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authorization required' }) };
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    const body = JSON.parse(event.body);
    const { botStatus } = body;

    if (!['running', 'paused'].includes(botStatus)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'botStatus must be running or paused' }) };
    }

    const walletStore = new FirebaseWalletStore();
    const wallet = await walletStore.getWalletById(decoded.walletId);

    if (!wallet) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Wallet not found' }) };
    }

    await walletStore.updateBotStatus(decoded.walletId, botStatus);

    console.log(`✅ Bot status updated for ${decoded.walletAddress}: ${botStatus}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, botStatus, message: `Bot ${botStatus === 'running' ? 'activated' : 'paused'} successfully` })
    };

  } catch (error) {
    console.error('Toggle bot error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
  }
};
