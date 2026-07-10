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
    const response = await fetch('https://api.dexscreener.com/latest/dex/chains/solana', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`DexScreener returned ${response.status}`);
    }

    const text = await response.text();
    
    // Check if response is HTML
    if (text.trim().startsWith('<!DOCTYPE')) {
      throw new Error('Received HTML instead of JSON');
    }

    const data = JSON.parse(text);

    if (!data.pairs || data.pairs.length === 0) {
      throw new Error('No pairs found');
    }

    // Filter for memecoins (exclude Wrapped SOL and major tokens)
    const memecoinKeywords = ['dog', 'shib', 'pepe', 'bonk', 'floki', 'woj', 'doge', 'cat', 'moon', 'rocket', 'mars', 'safe', 'meme', 'baby', 'husky', 'samo', 'slerf', 'bome', 'wif', 'popcat', 'myro', 'meow'];
    
    // Exclude these common tokens
    const excludeTokens = ['Wrapped SOL', 'SOL', 'USDC', 'USDT', 'RAY', 'ORCA', 'JUP', 'JTO', 'PYTH', 'BONK'];
    
    // Also exclude tokens with SOL in the name (like Wrapped SOL)
    const isMemecoin = (pair) => {
      const name = pair.baseToken?.name || '';
      const symbol = pair.baseToken?.symbol || '';
      const address = pair.baseToken?.address || '';
      
      // Skip if it's Wrapped SOL or similar
      if (name.includes('Wrapped') || name === 'SOL' || symbol === 'SOL') {
        return false;
      }
      
      // Skip if in exclude list
      if (excludeTokens.includes(name) || excludeTokens.includes(symbol)) {
        return false;
      }
      
      // Check if it's a memecoin based on keywords
      const lowerName = name.toLowerCase();
      const lowerSymbol = symbol.toLowerCase();
      
      return memecoinKeywords.some(keyword => 
        lowerName.includes(keyword) || lowerSymbol.includes(keyword)
      );
    };

    // Filter and sort by volume or market cap
    const memecoins = data.pairs
      .filter(isMemecoin)
      .sort((a, b) => {
        // Sort by volume (higher is better for memecoins)
        const volumeA = parseFloat(a.volume?.h24) || 0;
        const volumeB = parseFloat(b.volume?.h24) || 0;
        return volumeB - volumeA;
      })
      .slice(0, 20)
      .map(pair => ({
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || 'N/A',
        address: pair.baseToken?.address || '',
        price: parseFloat(pair.priceUsd) || 0,
        change24h: parseFloat(pair.priceChange?.h24) || 0,
        volume24h: parseFloat(pair.volume?.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        marketCap: pair.marketCap || 0,
        logo: pair.baseToken?.image || 'https://via.placeholder.com/40',
        url: pair.url || '',
        // Additional info for better filtering
        fdv: pair.fdv || 0
      }));

    // If no memecoins found, fallback to filtering by market cap
    if (memecoins.length === 0) {
      console.log('No memecoins found by keyword, falling back to market cap filter');
      
      const filteredByCap = data.pairs
        .filter(pair => {
          const name = pair.baseToken?.name || '';
          const symbol = pair.baseToken?.symbol || '';
          const marketCap = pair.marketCap || 0;
          
          // Exclude Wrapped SOL and major tokens
          if (name.includes('Wrapped') || name === 'SOL' || symbol === 'SOL') return false;
          if (excludeTokens.includes(name) || excludeTokens.includes(symbol)) return false;
          
          // Filter for smaller market caps (under $100M) - typical for memecoins
          return marketCap > 0 && marketCap < 100000000;
        })
        .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 20)
        .map(pair => ({
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || 'N/A',
          address: pair.baseToken?.address || '',
          price: parseFloat(pair.priceUsd) || 0,
          change24h: parseFloat(pair.priceChange?.h24) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          marketCap: pair.marketCap || 0,
          logo: pair.baseToken?.image || 'https://via.placeholder.com/40',
          url: pair.url || '',
          fdv: pair.fdv || 0
        }));
      
      if (filteredByCap.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            data: filteredByCap,
            source: 'dexscreener',
            filter: 'market_cap'
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: memecoins,
        source: 'dexscreener',
        filter: 'memecoin_keywords'
      })
    };
  } catch (error) {
    console.error('Error in get-memcoins:', error.message);
    
    // Return mock memecoin data as fallback
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: getMockMemecoins(),
        note: 'Using mock data - DexScreener API error',
        error: error.message
      })
    };
  }
};

// Mock data for when API fails
function getMockMemecoins() {
  return [
    { name: 'Dogecoin', symbol: 'DOGE', address: 'mock1', price: 0.12, change24h: 2.5, volume24h: 1000000, liquidity: 500000, marketCap: 17000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Shiba Inu', symbol: 'SHIB', address: 'mock2', price: 0.00002, change24h: 1.8, volume24h: 800000, liquidity: 300000, marketCap: 12000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Pepe', symbol: 'PEPE', address: 'mock3', price: 0.00001, change24h: -0.5, volume24h: 600000, liquidity: 200000, marketCap: 4000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Bonk', symbol: 'BONK', address: 'mock4', price: 0.00003, change24h: 5.2, volume24h: 400000, liquidity: 150000, marketCap: 2000000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Floki', symbol: 'FLOKI', address: 'mock5', price: 0.00015, change24h: 3.1, volume24h: 300000, liquidity: 100000, marketCap: 1500000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'Slerf', symbol: 'SLERF', address: 'mock6', price: 0.0008, change24h: 15.7, volume24h: 500000, liquidity: 80000, marketCap: 80000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'BOME', symbol: 'BOME', address: 'mock7', price: 0.002, change24h: -3.2, volume24h: 200000, liquidity: 50000, marketCap: 50000000, logo: 'https://via.placeholder.com/40', url: '' },
    { name: 'WIF', symbol: 'WIF', address: 'mock8', price: 0.5, change24h: 8.9, volume24h: 700000, liquidity: 120000, marketCap: 120000000, logo: 'https://via.placeholder.com/40', url: '' }
  ];
}
