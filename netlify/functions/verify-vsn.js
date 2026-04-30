/**
 * Verify VSN Code Function
 * Checks if the provided VSN code is valid
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { vsnCode } = body;

    if (!vsnCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'VSN code is required' })
      };
    }

    // Get valid VSN codes from environment variable
    const vsnCodesEnv = process.env.VSN_CODES;

    if (!vsnCodesEnv) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'VSN system not configured' })
      };
    }

    // Split the comma-separated codes and trim whitespace
    const validCodes = vsnCodesEnv.split(',').map(code => code.trim());

    // Check if entered code matches any valid code (case-insensitive)
    const isValid = validCodes.some(code => 
      code.toLowerCase() === vsnCode.trim().toLowerCase()
    );

    if (isValid) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'VSN code verified successfully' 
        })
      };
    } else {
      // Delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid VSN. Please contact support.' 
        })
      };
    }

  } catch (error) {
    console.error('VSN verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
