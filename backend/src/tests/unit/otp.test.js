const otpService = require('../../services/otpService');
const { redisClient } = require('../../config/redis');
const { OTP_LENGTH } = require('../../config/constants');

describe('OTP Service - Unit Tests', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';

  afterEach(async () => {
    await redisClient.del(`otp:${testUserId}:login`);
    await redisClient.del(`otp_attempts:${testUserId}:login`);
    await redisClient.del(`otp_locked:${testUserId}`);
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = otpService.generateOTP();
      expect(otp).toHaveLength(OTP_LENGTH);
      expect(/^\d+$/.test(otp)).toBe(true);
    });

    it('should generate different OTPs', () => {
      const otp1 = otpService.generateOTP();
      const otp2 = otpService.generateOTP();
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('verifyOTP', () => {
    it('should verify valid OTP', async () => {
      const otp = await otpService.createOTP(testUserId, testEmail, 'login');
      const result = await otpService.verifyOTP(testUserId, otp, 'login');
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('OTP verified successfully');
    });

    it('should reject invalid OTP', async () => {
      await otpService.createOTP(testUserId, testEmail, 'login');
      const result = await otpService.verifyOTP(testUserId, '999999', 'login');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid OTP');
    });
  });
});