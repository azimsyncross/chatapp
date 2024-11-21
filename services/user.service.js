const User = require('../models/user.model');

class UserService {
  static async getUserDetails(userId) {
    const user = await User.findById(userId).select('-password -loginCode');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async getUserLoginHistory(userId) {
    const user = await User.findById(userId).select('loginHistory email name');
    if (!user) {
      throw new Error('User not found');
    }
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      loginHistory: user.loginHistory
    };
  }

  static async trackLogin(userId, method, req) {
    const loginData = {
      timestamp: new Date(),
      method,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    await User.findByIdAndUpdate(userId, {
      $set: {
        lastLogin: {
          timestamp: loginData.timestamp,
          method
        }
      },
      $push: {
        loginHistory: loginData
      }
    });
  }
}

module.exports = UserService; 