const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Try the DexScreener API with proper headers
    const response = await fetch('https://api.dexscreener.com/latest/dex/chains/solana', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `DexScreener returned ${response.status}` }) };
    }

    const text = await response.text();
    
    // Log what we received for debugging
    console.log('DexScreener response preview:', text.substring(0, 100));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse DexScreener response:', text.substring(0, 200));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid response from DexScreener' }) };
    }

    if (!data.pairs || data.pairs.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No pairs found' }) };
    }

    const memcoins = data.pairs.slice(0, 20).map(pair => ({
      name: pair.baseToken?.name || 'Unknown',
      symbol: pair.baseToken?.symbol || 'N/A',
      address: pair.baseToken?.address || '',
      price: parseFloat(pair.priceUsd) || 0,
      change24h: parseFloat(pair.priceChange?.h24) || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      marketCap: pair.marketCap || 0,
      logo: pair.baseToken?.image || 'https://via.placeholder.com/40',
      url: pair.url || ''
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: memcoins })
    };
  } catch (error) {
    console.error('Error in get-memcoins:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
