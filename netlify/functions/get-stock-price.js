/**
 * Get Stock Price Endpoint
 * Fetches real stock prices from Alpha Vantage
 * Supports single ticker or multiple tickers
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Alpha Vantage API key not configured' }) };
    }

    // Get ticker(s) from query string
    // e.g. /get-stock-price?ticker=AAPL
    // e.g. /get-stock-price?tickers=AAPL,MSFT,GOOGL
    const { ticker, tickers } = event.queryStringParameters || {};

    if (!ticker && !tickers) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker or tickers query parameter required' }) };
    }

    // Build list of tickers to fetch
    const tickerList = tickers ? tickers.split(',').map(t => t.trim().toUpperCase()) : [ticker.toUpperCase()];

    // Fetch prices for all tickers
    const results = {};
    for (const sym of tickerList) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        const quote = data['Global Quote'];
        if (!quote || !quote['05. price']) {
          results[sym] = { error: 'No data available', ticker: sym };
          continue;
        }

        results[sym] = {
          ticker: sym,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePct: parseFloat(quote['10. change percent'].replace('%', '')),
          open: parseFloat(quote['02. open']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          volume: parseInt(quote['06. volume']),
          previousClose: parseFloat(quote['08. previous close']),
          lastUpdated: quote['07. latest trading day']
        };

        console.log(`✅ Fetched ${sym}: $${results[sym].price}`);

        // Alpha Vantage free tier: 5 requests/minute
        // Add small delay between requests if multiple tickers
        if (tickerList.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (err) {
        console.error(`❌ Failed to fetch ${sym}:`, err.message);
        results[sym] = { error: err.message, ticker: sym };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results,
        fetchedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get stock price error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
