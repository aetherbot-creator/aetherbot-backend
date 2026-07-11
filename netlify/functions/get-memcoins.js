const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Fetch Solana tokens from CoinGecko
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=250&page=1&sparkline=false');

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `API returned ${response.status}` }) };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No Solana tokens found' }) };
    }

    const MAX_MARKET_CAP = 500000000; // 500 million

    // Filter for meme coins under 500M market cap
    const memcoins = data
      .filter(coin => {
        // Only include coins with market cap under 500M or no market cap
        return !coin.market_cap || coin.market_cap < MAX_MARKET_CAP;
      })
      .slice(0, 20)
      .map(coin => ({
        name: coin.name || 'Unknown',
        symbol: coin.symbol?.toUpperCase() || 'N/A',
        address: coin.id || '',
        price: coin.current_price || 0,
        change24h: coin.price_change_percentage_24h || 0,
        volume24h: coin.total_volume || 0,
        liquidity: coin.market_cap || 0,
        marketCap: coin.market_cap || 0,
        logo: coin.image || 'https://via.placeholder.com/40',
        url: `https://www.coingecko.com/en/coins/${coin.id}`
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: memcoins })
    };
  } catch (error) {
    console.error('Error fetching Solana meme coins:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
