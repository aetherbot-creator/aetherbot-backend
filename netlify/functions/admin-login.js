/**
 * Admin Login Function
 * Authenticates admin users with email/password and returns admin JWT token
 */

const { 
  validateAdminCredentials, 
  generateAdminToken, 
  verifySuperAdminApiKey 
} = require('./utils/auth');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    // Support both 'email' and 'username' for backward compatibility
    const email = body.email || body.username;
    const { password, apiKey } = body;

    // Validate input
    if (!email || !password || !apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email/Username, password, and apiKey are required' })
      };
    }

    // 1. Validate API Key first
    const isApiKeyValid = verifySuperAdminApiKey(apiKey);
    
    // 2. Validate Credentials
    const isCredsValid = validateAdminCredentials(email, password);

    if (!isApiKeyValid || !isCredsValid) {
      // Security: Delay response to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid admin credentials' })
      };
    }

    // Generate admin JWT token
    const token = generateAdminToken(email, {
      adminId: email,
      loginAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          token,
          email: email,
          role: 'super_admin',
          expiresIn: '24h',
          loginAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('Admin login error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An error occurred during authentication'
      })
    };
  }
};
