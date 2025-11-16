const { redisClient } = require('../config/redis');
const { CACHE_TTL } = require('../config/constants');

class CacheService {
  async set(key, value, ttl = null) {
    const data = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(key, ttl, data);
    } else {
      await redisClient.set(key, data);
    }
  }

  async get(key) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key) {
    await redisClient.del(key);
  }

  async cacheUserProfile(userId, userData) {
    await this.set(`user:${userId}`, userData, CACHE_TTL.USER_PROFILE);
  }

  async getUserProfile(userId) {
    return await this.get(`user:${userId}`);
  }

  async invalidateUserProfile(userId) {
    await this.del(`user:${userId}`);
  }
}

module.exports = new CacheService();