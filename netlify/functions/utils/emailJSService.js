/**
 * EmailJS Service
 * 
 * Sends OTP emails using EmailJS API
 * https://www.emailjs.com/docs/
 */

// ⚠️ CONFIGURATION - Set these in .env file
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_0t7pjbm';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_kro1z3k';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'FSb7MmR7IBiwnxm5u'; // Your public key
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || 'EGdmcr61APnzvXnyiL2Np'; // Your private key

/**
 * Send OTP email via EmailJS
 * @param {string} email - Recipient email address
 * @param {string} passcode - 6-digit OTP code
 * @returns {Promise<Object>} - Success/failure response
 */
async function sendOTPEmail(email, passcode) {
  try {
    console.log('📧 Sending OTP email via EmailJS...');
    console.log('   Service ID:', EMAILJS_SERVICE_ID);
    console.log('   Template ID:', EMAILJS_TEMPLATE_ID);
    console.log('   To:', email);
    console.log('   OTP:', passcode);

    // EmailJS REST API endpoint
    const url = 'https://api.emailjs.com/api/v1.0/email/send';

    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        passcode: passcode,
        email: email,
        to_email: email // Some templates might use this
      }
    };

    console.log('   Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('   Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ EmailJS failed:', errorText);
      throw new Error(`EmailJS API error (${response.status}): ${errorText}`);
    }

    const result = await response.text();
    console.log('✅ OTP email sent successfully:', result);

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('💥 OTP email error:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate a 6-digit OTP code
 * @returns {string} - 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  sendOTPEmail,
  generateOTP
};
