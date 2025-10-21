/**
 * Send OTP Endpoint
 * 
 * Generates and sends a 6-digit OTP to user's email
 * OTP expires after 15 minutes
 */

const { sendOTPEmail, generateOTP } = require('./utils/emailJSService');
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
    const { email } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email is required' })
      };
    }

    console.log('📧 OTP request for:', email);

    // Generate 6-digit OTP
    const otp = generateOTP();
    console.log('🔢 Generated OTP:', otp);

    // Save OTP to Firebase (expires in 15 minutes)
    const otpStore = new FirebaseOTPStore();
    const saveResult = await otpStore.saveOTP(email, otp, 15);

    if (!saveResult.success) {
      throw new Error('Failed to save OTP');
    }

    // Send OTP via EmailJS
    const emailResult = await sendOTPEmail(email, otp);

    if (!emailResult.success) {
      // Clean up OTP if email fails
      await otpStore.deleteOTP(email);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send OTP email',
          details: emailResult.error
        })
      };
    }

    console.log('✅ OTP sent successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'OTP sent to your email',
        expiresAt: saveResult.expiresAt,
        expiresIn: '15 minutes'
      })
    };
  } catch (error) {
    console.error('💥 Send OTP error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send OTP',
        message: error.message
      })
    };
  }
};
