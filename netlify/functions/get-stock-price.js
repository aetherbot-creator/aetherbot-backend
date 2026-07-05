/**
 * Get Stock Price Endpoint (Finnhub-backed)
 *
 * Fetches live quotes for a comma-separated list of tickers using Finnhub's
 * /quote endpoint. Finnhub's free tier allows 60 calls/minute, so fetching
 * ~12 tickers per dashboard refresh is comfortably within limits.
 *
 * Query params:
 *   tickers - comma-separated list, e.g. "AAPL,MSFT,GOOGL"
 *
 * Response shape (matches what the frontend expects):
 * {
 *   success: true,
 *   data: {
 *     AAPL: { price, change, changePct },
 *     MSFT: { error: "..." },   // per-ticker errors don't fail the whole request
 *     ...
 *   }
 * }
 */

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (!FINNHUB_API_KEY) {
    console.error('💥 Missing FINNHUB_API_KEY environment variable');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfiguration: missing Finnhub API key' })
    };
  }

  try {
    const tickersParam = event.queryStringParameters?.tickers || '';
    const tickers = tickersParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty "tickers" query parameter' })
      };
    }

    console.log(`📈 Fetching quotes for ${tickers.length} tickers from Finnhub`);

    // Finnhub's free tier has no batch-quote endpoint, so we call /quote
    // once per ticker. 60 req/min free-tier limit comfortably covers a
    // typical watchlist (e.g. 12 tickers refreshed every few minutes).
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;
          const res = await fetch(url);

          if (!res.ok) {
            if (res.status === 429) {
              return [ticker, { error: 'Rate limited by Finnhub. Try again shortly.' }];
            }
            return [ticker, { error: `Finnhub returned status ${res.status}` }];
          }

          const quote = await res.json();

          // Finnhub returns all zeros for an unknown/invalid symbol
          if (
            quote.c === 0 &&
            quote.h === 0 &&
            quote.l === 0 &&
            quote.o === 0
          ) {
            return [ticker, { error: 'No data returned for this ticker' }];
          }

          return [
            ticker,
            {
              price: quote.c,       // current price
              change: quote.d,      // change
              changePct: quote.dp   // percent change
            }
          ];
        } catch (err) {
          console.error(`⚠️  Failed to fetch ${ticker}:`, err.message);
          return [ticker, { error: err.message }];
        }
      })
    );

    const data = Object.fromEntries(results);

    console.log('✅ Stock prices fetched:', Object.keys(data).length, 'tickers');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data })
    };
  } catch (error) {
    console.error('💥 get-stock-price error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
