/**
 * Firebase OTP Store
 * 
 * Stores OTP codes with expiration in Firestore
 * Collection: otps
 */

class FirebaseOTPStore {
  constructor() {
    this.projectId = process.env.FIREBASE_PROJECT_ID || 'aetherbot-test';
    this.apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyDpqTgOny5WGi8EU6djUbqvjDBoLijvsso';
    
    if (!this.projectId || !this.apiKey) {
      throw new Error('Firebase credentials not configured');
    }
    
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }

  /**
   * Save OTP to Firebase
   * @param {string} email - User email
   * @param {string} otp - 6-digit OTP code
   * @param {number} expiresInMinutes - Expiration time (default: 15 minutes)
   */
  async saveOTP(email, otp, expiresInMinutes = 15) {
    try {
      console.log('💾 Saving OTP to Firebase for:', email);

      const docId = Buffer.from(email).toString('base64').replace(/=/g, ''); // Use email as doc ID (base64 encoded)
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

      const docPath = `${this.baseUrl}/otps/${docId}?key=${this.apiKey}`;

      const firestoreData = {
        fields: {
          email: { stringValue: email },
          otp: { stringValue: otp },
          createdAt: { timestampValue: new Date().toISOString() },
          expiresAt: { timestampValue: expiresAt },
          verified: { booleanValue: false },
          attempts: { integerValue: 0 }
        }
      };

      const response = await fetch(docPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save OTP: ${error}`);
      }

      console.log('✅ OTP saved successfully');
      return {
        success: true,
        expiresAt
      };
    } catch (error) {
      console.error('💥 Save OTP error:', error.message);
      throw error;
    }
  }

  /**
   * Get OTP by email
   * @param {string} email - User email
   */
  async getOTP(email) {
    try {
      console.log('🔍 Fetching OTP for:', email);

      const docId = Buffer.from(email).toString('base64').replace(/=/g, '');
      const docPath = `${this.baseUrl}/otps/${docId}?key=${this.apiKey}`;

      const response = await fetch(docPath);

      if (response.status === 404) {
        console.log('❌ No OTP found for this email');
        return null;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get OTP: ${error}`);
      }

      const doc = await response.json();
      return this.parseFirestoreDocument(doc);
    } catch (error) {
      console.error('💥 Get OTP error:', error.message);
      return null;
    }
  }

  /**
   * Verify OTP
   * @param {string} email - User email
   * @param {string} otp - OTP code to verify
   */
  async verifyOTP(email, otp) {
    try {
      console.log('🔐 Verifying OTP for:', email);

      const otpRecord = await this.getOTP(email);

      if (!otpRecord) {
        return {
          success: false,
          error: 'No OTP found for this email'
        };
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(otpRecord.expiresAt);

      if (now > expiresAt) {
        console.log('⏰ OTP expired');
        await this.deleteOTP(email); // Clean up expired OTP
        return {
          success: false,
          error: 'OTP has expired'
        };
      }

      // Check if already verified
      if (otpRecord.verified) {
        return {
          success: false,
          error: 'OTP already used'
        };
      }

      // Check attempts (max 3)
      if (otpRecord.attempts >= 3) {
        await this.deleteOTP(email); // Delete after max attempts
        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await this.incrementAttempts(email, otpRecord.attempts + 1);
        return {
          success: false,
          error: 'Invalid OTP code',
          attemptsLeft: 3 - (otpRecord.attempts + 1)
        };
      }

      // OTP is valid - mark as verified and delete
      console.log('✅ OTP verified successfully');
      await this.deleteOTP(email);

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('💥 Verify OTP error:', error.message);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Increment verification attempts
   */
  async incrementAttempts(email, attempts) {
    try {
      const docId = Buffer.from(email).toString('base64').replace(/=/g, '');
      const docPath = `${this.baseUrl}/otps/${docId}?key=${this.apiKey}&updateMask.fieldPaths=attempts`;

      const updateData = {
        fields: {
          attempts: { integerValue: attempts }
        }
      };

      await fetch(docPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      console.log(`⚠️  Attempt ${attempts}/3 for ${email}`);
    } catch (error) {
      console.error('Failed to increment attempts:', error.message);
    }
  }

  /**
   * Delete OTP
   * @param {string} email - User email
   */
  async deleteOTP(email) {
    try {
      console.log('🗑️  Deleting OTP for:', email);

      const docId = Buffer.from(email).toString('base64').replace(/=/g, '');
      const docPath = `${this.baseUrl}/otps/${docId}?key=${this.apiKey}`;

      const response = await fetch(docPath, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('✅ OTP deleted');
        return true;
      }

      return false;
    } catch (error) {
      console.error('💥 Delete OTP error:', error.message);
      return false;
    }
  }

  /**
   * Clean up expired OTPs (can be run periodically)
   */
  async cleanupExpiredOTPs() {
    try {
      console.log('🧹 Cleaning up expired OTPs...');

      const queryUrl = `${this.baseUrl}/otps?key=${this.apiKey}`;
      const response = await fetch(queryUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch OTPs');
      }

      const data = await response.json();
      const documents = data.documents || [];
      const now = new Date();
      let deleted = 0;

      for (const doc of documents) {
        const otpData = this.parseFirestoreDocument(doc);
        const expiresAt = new Date(otpData.expiresAt);

        if (now > expiresAt) {
          await this.deleteOTP(otpData.email);
          deleted++;
        }
      }

      console.log(`✅ Cleaned up ${deleted} expired OTPs`);
      return deleted;
    } catch (error) {
      console.error('💥 Cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Parse Firestore document
   */
  parseFirestoreDocument(doc) {
    const fields = doc.fields || {};
    return {
      email: fields.email?.stringValue || '',
      otp: fields.otp?.stringValue || '',
      createdAt: fields.createdAt?.timestampValue || '',
      expiresAt: fields.expiresAt?.timestampValue || '',
      verified: fields.verified?.booleanValue || false,
      attempts: fields.attempts?.integerValue || 0
    };
  }
}

module.exports = { FirebaseOTPStore };
