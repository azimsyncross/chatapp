require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  LOGIN_CODE_EXPIRY: 10 * 60 * 1000, // 10 minutes in milliseconds
  REDIS_URL: process.env.REDIS_URL || 'localhost',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  CACHE_TTL: process.env.CACHE_TTL || 3600, // 1 hour in seconds
}; 