const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // DexScreener API - Get latest Solana tokens
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens?chainId=solana&order=liquidity');
    const data = await response.json();

    if (!data.pairs) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No data found' }) };
    }

    // Filter Solana tokens and format memcoins
    const memcoins = data.pairs.slice(0, 20).map(pair => ({
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      address: pair.baseToken.address,
      price: parseFloat(pair.priceUsd) || 0,
      change24h: parseFloat(pair.priceChange?.h24) || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      marketCap: pair.marketCap || 0,
      logo: pair.baseToken.image || 'https://via.placeholder.com/40',
      url: pair.url,
      chainId: pair.chainId
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: memcoins })
    };
  } catch (error) {
    console.error('Error fetching Solana memcoins:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
