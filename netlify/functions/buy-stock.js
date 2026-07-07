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

    const { ticker, shares, price, totalCost } = JSON.parse(event.body);
    if (!ticker || !shares || !price || !totalCost) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker, shares, price, totalCost required' }) };
    }

    const walletStore = new FirebaseWalletStore();
    const wallet = await walletStore.getWalletById(decoded.walletId);
    if (!wallet) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Wallet not found' }) };

    if ((wallet.stockBalance || 0) < totalCost) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Insufficient stock wallet balance' }) };
    }

    const newStockBalance = (wallet.stockBalance || 0) - totalCost;
    const holdings = wallet.stockHoldings || {};
    const existing = holdings[ticker];
    if (existing) {
      const newShares = existing.shares + shares;
      holdings[ticker] = {
        shares: newShares,
        avgPrice: ((existing.avgPrice * existing.shares) + (price * shares)) / newShares
      };
    } else {
      holdings[ticker] = { shares, avgPrice: price };
    }

    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    const docPath = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/wallets/${decoded.walletId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=stockBalance&updateMask.fieldPaths=stockHoldings`;

    const res = await fetch(docPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          stockBalance: { doubleValue: newStockBalance },
          stockHoldings: {
            mapValue: {
              fields: Object.fromEntries(
                Object.entries(holdings).map(([t, h]) => [t, {
                  mapValue: {
                    fields: {
                      shares: { integerValue: h.shares },
                      avgPrice: { doubleValue: h.avgPrice }
                    }
                  }
                }])
              )
            }
          }
        }
      })
    });

    if (!res.ok) throw new Error('Firebase update failed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, newStockBalance, holdings })
    };
  } catch (error) {
    console.error('buy-stock error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
