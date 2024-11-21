const redis = require('../configs/redis');
const { CACHE_TTL } = require('../configs/variables');

class CacheService {
  static async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  static async set(key, value, ttl = CACHE_TTL) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  static async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  static async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis delete pattern error:', error);
      return false;
    }
  }

  // For chat room caching
  static generateRoomKey(roomId) {
    return `room:${roomId}`;
  }

  static generateUserKey(userId) {
    return `user:${userId}`;
  }

  static generateModeratorListKey() {
    return 'moderators:available';
  }
}

module.exports = CacheService; 