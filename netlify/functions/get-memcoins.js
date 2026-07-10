bash
cat > /mnt/user-data/outputs/get-memcoins.js << 'EOF'
/**
 * Get Memcoins from DexScreener
 * Fetches top Solana tokens
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Correct DexScreener endpoint for top Solana pairs
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      // Fallback: try search endpoint for popular Solana memecoins
      const fallback = await fetch(
        'https://api.dexscreener.com/latest/dex/search?q=solana',
        { headers: { 'Accept': 'application/json' } }
      );
      const fbData = await fallback.json();
      const pairs = (fbData.pairs || [])
        .filter(p => p.chainId === 'solana')
        .slice(0, 20);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: formatPairs(pairs) })
      };
    }

    const data = await response.json();
    const pairs = (data.pairs || []).slice(0, 20);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: formatPairs(pairs) })
    };

  } catch (error) {
    console.error('Error in get-memcoins:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function formatPairs(pairs) {
  return pairs.map(pair => ({
    name: pair.baseToken?.name || 'Unknown',
    symbol: pair.baseToken?.symbol || 'N/A',
    address: pair.baseToken?.address || '',
    price: parseFloat(pair.priceUsd) || 0,
    change24h: parseFloat(pair.priceChange?.h24) || 0,
    volume24h: pair.volume?.h24 || 0,
    liquidity: pair.liquidity?.usd || 0,
    marketCap: pair.marketCap || 0,
    logo: pair.info?.imageUrl || 'https://via.placeholder.com/40',
    url: pair.url || ''
  }));
}
EOF
echo "Done"
