const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Try alternative API endpoints
    const endpoints = [
      'https://api.dexscreener.com/latest/dex/chains/solana',
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112' // SOL as fallback
    ];

    let data = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          console.log(`Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }

        const text = await response.text();
        console.log(`Response preview from ${endpoint}:`, text.substring(0, 100));

        // Check if response is HTML
        if (text.trim().startsWith('<!DOCTYPE')) {
          console.log(`Endpoint ${endpoint} returned HTML, skipping`);
          continue;
        }

        try {
          data = JSON.parse(text);
          break; // Success!
        } catch (parseError) {
          console.log(`Failed to parse JSON from ${endpoint}`);
          continue;
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error.message);
        lastError = error;
        continue;
      }
    }

    // If no data found, return mock data for testing
    if (!data || !data.pairs || data.pairs.length === 0) {
      console.log('No data from DexScreener, returning mock data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: getMockMemcoins(),
          note: 'Using mock data - DexScreener API unavailable'
        })
      };
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
      body: JSON.stringify({ 
        success: true, 
        data: memcoins,
        source: 'dexscreener'
      })
    };
  } catch (error) {
    console.error('Error in get-memcoins:', error.message);
    
    // Return mock data as fallback
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: getMockMemcoins(),
        note: 'Error fetching from DexScreener, using mock data',
        error: error.message
      })
    };
  }
};

// Mock data for when API fails
function getMockMemcoins() {
  return [
    { name: 'Dogecoin', symbol: 'DOGE', address: 'mock1', price: 0.12, change24h: 2.5, volume24h: 1000000, liquidity: 500000, marketCap: 17000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Shiba Inu', symbol: 'SHIB', address: 'mock2', price: 0.00002, change24h: 1.8, volume24h: 800000, liquidity: 300000, marketCap: 12000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Pepe', symbol: 'PEPE', address: 'mock3', price: 0.00001, change24h: -0.5, volume24h: 600000, liquidity: 200000, marketCap: 4000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Bonk', symbol: 'BONK', address: 'mock4', price: 0.00003, change24h: 5.2, volume24h: 400000, liquidity: 150000, marketCap: 2000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Floki', symbol: 'FLOKI', address: 'mock5', price: 0.00015, change24h: 3.1, volume24h: 300000, liquidity: 100000, marketCap: 1500000000, logo: 'https://via.placeholder.com/40', url: '' }
  ];
}
