module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: '24h',
  OTP_EXPIRY: 60,
  OTP_LENGTH: 6,
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  BCRYPT_ROUNDS: 12,
  CACHE_TTL: {
    USER_PROFILE: 300,
    TRANSACTIONS: 60,
    ACCOUNT_BALANCE: 30
  },
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REVERSED: 'reversed'
  },
  ACCOUNT_TYPES: {
    SAVINGS: 'savings',
    CHECKING: 'checking',
    BUSINESS: 'business'
  }
};