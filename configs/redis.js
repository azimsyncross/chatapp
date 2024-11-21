const Redis = require('ioredis');
const { REDIS_URL, REDIS_PASSWORD } = require('./variables');

class RedisConfig {
  constructor() {
    this.redis = new Redis({
      host: REDIS_URL,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  getInstance() {
    return this.redis;
  }
}

module.exports = new RedisConfig().getInstance(); 