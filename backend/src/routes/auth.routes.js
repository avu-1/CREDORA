const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const otpService = require('../services/otpService');
const cacheService = require('../services/cacheService');
const { signupValidation, loginValidation, validateRequest } = require('../middleware/validator');
const { authLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');
const { redisClient } = require('../config/redis');

router.post('/signup', authLimiter, signupValidation, validateRequest, async (req, res, next) => {
  try {
    const { email, password, fullName, phone, dateOfBirth, address } = req.body;

    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await authService.createUser({ email, password, fullName, phone, dateOfBirth, address });
    const account = await authService.createDefaultAccount(user.user_id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: { userId: user.user_id, email: user.email, fullName: user.full_name },
        account: { accountNumber: account.account_number, balance: account.balance }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, loginValidation, validateRequest, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await authService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await authService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const otp = await otpService.createOTP(user.user_id, user.email, 'login');

    res.json({
      success: true,
      message: 'OTP sent to your registered email',
      data: { userId: user.user_id, requiresOTP: true }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { userId, otp, email } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP required' });
    }

    const isLocked = await otpService.isLocked(userId);
    if (isLocked) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts' });
    }

    const verification = await otpService.verifyOTP(userId, otp, 'login');
    
    if (!verification.valid) {
      return res.status(401).json({ success: false, message: verification.message });
    }

    const user = await authService.getUserByEmail(email);
    const token = authService.generateToken({ userId: user.user_id, email: user.email });

    await authService.updateLastLogin(user.user_id);
    await cacheService.cacheUserProfile(user.user_id, {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { userId: user.user_id, email: user.email, fullName: user.full_name }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await redisClient.setex(`blacklist:${req.token}`, 86400, '1');
    await cacheService.invalidateUserProfile(req.user.userId);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;