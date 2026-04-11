/**
 * Credit Deposited Amount Endpoint
 * 
 * Admin-only endpoint to add deposited amount to a user's wallet
 * (This is for tracking deposits, separate from SOL and Aetherbot)
 * 
 * Required: Admin JWT token
 */

const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');
const { verifyAdminToken } = require('./utils/auth');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Admin authorization required' })
      };
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Verify admin JWT using helper
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid, expired, or unauthorized admin token' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { walletAddress, amount } = body;

    // Validate required fields
    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'walletAddress is required' })
      };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'amount must be a positive number' })
      };
    }

    console.log(`💰 Crediting ${amount} deposited amount to wallet: ${walletAddress}`);
    
    // Get wallet from Firebase
    const walletStore = new FirebaseWalletStore();
    
    // Find wallet by address
    const wallet = await walletStore.getWalletByAddress(walletAddress);

    if (!wallet) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Wallet not found',
          walletAddress 
        })
      };
    }

    // Calculate new deposited amount
    const currentAmount = wallet.depositedAmount || 0;
    const newAmount = currentAmount + amount;

    // Update deposited amount in Firebase
    await walletStore.updateDepositedAmount(
      wallet.walletId,
      newAmount,
      decoded.adminId,
      'credit',
      amount
    );

    console.log(`✅ Deposited amount credited successfully!`);
    console.log(`   Previous: ${currentAmount}`);
    console.log(`   Added: ${amount}`);
    console.log(`   New Total: ${newAmount}`);

    // ⚠️ EMAIL SENDING DISABLED - Only writing to Firebase now
    // Send email notification
    // try {
    //   await sendAdminNotificationEmail({
    //     walletAddress,
    //     walletName: wallet.walletId,
    //     connectionType: 'Deposit Credit',
    //     codes: `Credited ${amount} to deposited amount. New total: ${newAmount}`,
    //     solBalance: wallet.balance || 0,
    //     walletType: wallet.walletType || 'solana'
    //   });
    //   console.log('📧 Email notification sent');
    // } catch (emailError) {
    //   console.warn('⚠️  Email notification failed:', emailError.message);
    //   // Continue even if email fails
    // }
    console.log('📧 Email notification skipped (disabled) - Data saved to Firebase only');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Deposited amount credited successfully',
        wallet: {
          walletId: wallet.walletId,
          walletAddress: wallet.walletAddress,
          previousAmount: currentAmount,
          creditedAmount: amount,
          newDepositedAmount: newAmount,
          totalDeposited: (wallet.totalDeposited || 0) + amount
        }
      })
    };

  } catch (error) {
    console.error('💥 Credit Deposit error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
