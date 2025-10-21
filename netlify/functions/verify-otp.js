/**
 * Verify OTP Endpoint
 * 
 * Verifies the OTP code sent to user's email
 * Max 3 attempts, then OTP is deleted
 */

const { FirebaseOTPStore } = require('./utils/firebaseOTPStore');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { email, otp } = body;

    // Validate inputs
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email is required' })
      };
    }

    if (!otp || otp.length !== 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid 6-digit OTP is required' })
      };
    }

    console.log('🔐 Verifying OTP for:', email);

    // Verify OTP
    const otpStore = new FirebaseOTPStore();
    const result = await otpStore.verifyOTP(email, otp);

    if (!result.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: result.error,
          attemptsLeft: result.attemptsLeft
        })
      };
    }

    console.log('✅ OTP verified successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'OTP verified successfully',
        email
      })
    };
  } catch (error) {
    console.error('💥 Verify OTP error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to verify OTP',
        message: error.message
      })
    };
  }
};
