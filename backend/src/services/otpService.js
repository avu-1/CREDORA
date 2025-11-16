const crypto = require('crypto');
const { redisClient } = require('../config/redis');
const { OTP_EXPIRY, OTP_LENGTH } = require('../config/constants');

class OTPService {
  generateOTP() {
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp.padStart(OTP_LENGTH, '0');
  }

  async createOTP(userId, email, purpose = 'login') {
    const otp = this.generateOTP();
    const key = `otp:${userId}:${purpose}`;

    await redisClient.setex(key, OTP_EXPIRY, otp);

    console.log(`OTP for ${email}: ${otp}`);
    return otp;
  }

  async verifyOTP(userId, otp, purpose = 'login') {
    const key = `otp:${userId}:${purpose}`;
    const storedOTP = await redisClient.get(key);

    if (!storedOTP) {
      return { valid: false, message: 'OTP expired or not found' };
    }

    if (storedOTP !== otp) {
      await this.incrementAttempts(userId, purpose);
      return { valid: false, message: 'Invalid OTP' };
    }

    await redisClient.del(key);
    return { valid: true, message: 'OTP verified successfully' };
  }

  async incrementAttempts(userId, purpose) {
    const key = `otp_attempts:${userId}:${purpose}`;
    const attempts = await redisClient.incr(key);
    
    if (attempts === 1) {
      await redisClient.expire(key, OTP_EXPIRY);
    }

    if (attempts >= 3) {
      await redisClient.setex(`otp_locked:${userId}`, 300, '1');
      throw new Error('Too many failed attempts. Account temporarily locked.');
    }

    return attempts;
  }

  async isLocked(userId) {
    const locked = await redisClient.get(`otp_locked:${userId}`);
    return locked !== null;
  }
}

module.exports = new OTPService();
