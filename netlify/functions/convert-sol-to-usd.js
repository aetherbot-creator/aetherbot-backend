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
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authorization required' }) };

    const token = authHeader.substring(7);
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); }
    catch { return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) }; }

    const { solAmount, usdAmount } = JSON.parse(event.body);
    if (!solAmount || !usdAmount || solAmount <= 0 || usdAmount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid solAmount and usdAmount required' }) };
    }

    const walletStore = new FirebaseWalletStore();
    const wallet = await walletStore.getWalletById(decoded.walletId);
    if (!wallet) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Wallet not found' }) };

    if ((wallet.AetherbotBalance || 0) < solAmount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Insufficient SOL balance' }) };
    }

    const newSolBalance = (wallet.AetherbotBalance || 0) - solAmount;
    const newStockBalance = (wallet.stockBalance || 0) + usdAmount;

    // Update both balances using field mask PATCH
    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    const docPath = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/wallets/${decoded.walletId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=AetherbotBalance&updateMask.fieldPaths=stockBalance`;

    const res = await fetch(docPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          AetherbotBalance: { doubleValue: newSolBalance },
          stockBalance: { doubleValue: newStockBalance }
        }
      })
    });

    if (!res.ok) throw new Error('Firebase update failed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, newSolBalance, newStockBalance })
    };
  } catch (error) {
    console.error('convert-sol-to-usd error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
