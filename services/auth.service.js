const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const { JWT_SECRET, JWT_EXPIRES_IN, LOGIN_CODE_EXPIRY } = require('../configs/variables');
const { ROLES } = require('../utils/roles');
const { sendEmail } = require('../configs/nodemailer');
const SocketService = require('./socket.service');

class AuthService {
  static generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  static generateLoginCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  static async register(userData) {
    // Check if it's the first user (will be admin)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      userData.role = ROLES.ADMIN;
      if (!userData.password) {
        throw new Error('Admin must have a password');
      }
    }

    // For regular users (not using Google auth), set default password
    if (userData.role === ROLES.USER && !userData.googleId) {
      userData.password = '12345678Aa@';
      userData.passwordChangeRequired = true;
      
      // Send email with default password
      await sendEmail(
        userData.email,
        'Account Created',
        `Your account has been created.\nEmail: ${userData.email}\nTemporary Password: 12345678Aa@\nPlease change your password after first login.`
      );
    }

    // Only admin can create moderators
    if (userData.role === ROLES.MODERATOR && !userData.createdByAdmin) {
      throw new Error('Only admin can create moderators');
    }

    const user = await User.create(userData);
    const token = this.generateToken(user._id);
    return { user, token };
  }

  static async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    // For admin and moderator, check password
    if (user.role !== ROLES.USER) {
      if (!password || !(await user.comparePassword(password))) {
        throw new Error('Invalid credentials');
      }
    }

    const token = this.generateToken(user._id);

    // Notify about login via WebSocket
    await SocketService.notifyUserLogin(user._id, user);

    return { user, token };
  }

  static async requestLoginCode(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    const loginCode = this.generateLoginCode();
    const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY);

    await User.updateOne(
      { _id: user._id },
      { 
        loginCode: {
          code: loginCode,
          expiresAt
        }
      }
    );

    // Send email with login code
    await sendEmail(
      email,
      'Your Login Code',
      `Your login code is: ${loginCode}. This code will expire in 10 minutes.`
    );

    return { message: 'Login code sent to email' };
  }

  static async verifyLoginCode(email, code) {
    const user = await User.findOne({ 
      email,
      'loginCode.code': code,
      'loginCode.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired code');
    }

    // Clear the login code
    await User.updateOne(
      { _id: user._id },
      { $unset: { loginCode: 1 } }
    );

    const token = this.generateToken(user._id);
    return { user, token };
  }

  static async createModerator(moderatorData, adminId) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== ROLES.ADMIN) {
      throw new Error('Unauthorized to create moderator');
    }

    // Set default password for moderator
    moderatorData.password = '12345678Aa@';
    moderatorData.role = ROLES.MODERATOR;
    moderatorData.createdByAdmin = true;

    const moderator = await this.register(moderatorData);

    // Send email to moderator with credentials
    await sendEmail(
      moderatorData.email,
      'Moderator Account Created',
      `Your moderator account has been created.\nEmail: ${moderatorData.email}\nTemporary Password: 12345678Aa@\nPlease change your password after first login.`
    );

    return moderator;
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Notify about password change
    await SocketService.notifyPasswordChange(userId);

    return { message: 'Password changed successfully' };
  }

  static async resetModeratorPassword(moderatorId, adminId) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== ROLES.ADMIN) {
      throw new Error('Unauthorized to reset moderator password');
    }

    const moderator = await User.findById(moderatorId);
    if (!moderator || moderator.role !== ROLES.MODERATOR) {
      throw new Error('Invalid moderator ID');
    }

    // Reset to default password
    moderator.password = '12345678Aa@';
    await moderator.save();

    // Notify moderator
    await sendEmail(
      moderator.email,
      'Password Reset by Admin',
      `Your password has been reset by admin.\nTemporary Password: 12345678Aa@\nPlease change your password after login.`
    );

    return { message: 'Moderator password reset successfully' };
  }

  static async adminForgotPassword(email) {
    const admin = await User.findOne({ email, role: ROLES.ADMIN });
    if (!admin) {
      throw new Error('Admin not found with this email');
    }

    const resetCode = this.generateLoginCode(); // Reusing the code generation method
    const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY);

    await User.updateOne(
      { _id: admin._id },
      {
        resetPassword: {
          code: resetCode,
          expiresAt
        }
      }
    );

    // Send reset code to admin email
    await sendEmail(
      email,
      'Admin Password Reset Code',
      `Your password reset code is: ${resetCode}. This code will expire in 10 minutes.`
    );

    return { message: 'Password reset code sent to your email' };
  }

  static async adminResetPassword(email, resetCode, newPassword) {
    const admin = await User.findOne({
      email,
      role: ROLES.ADMIN,
      'resetPassword.code': resetCode,
      'resetPassword.expiresAt': { $gt: new Date() }
    });

    if (!admin) {
      throw new Error('Invalid or expired reset code');
    }

    // Update password and clear reset code
    admin.password = newPassword;
    admin.resetPassword = undefined;
    await admin.save();

    // Send confirmation email
    await sendEmail(
      email,
      'Password Reset Successful',
      'Your admin password has been successfully reset.'
    );

    return { message: 'Password reset successful' };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ 
      email, 
      googleId: { $exists: false } // Only for non-Google auth users
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow password reset for users who haven't set their initial password
    if (user.passwordChangeRequired) {
      throw new Error('Please use your temporary password to login first');
    }

    const resetCode = this.generateLoginCode();
    const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY);

    await User.updateOne(
      { _id: user._id },
      {
        resetPassword: {
          code: resetCode,
          expiresAt
        }
      }
    );

    await sendEmail(
      email,
      'Password Reset Code',
      `Your password reset code is: ${resetCode}. This code will expire in 10 minutes.`
    );

    return { message: 'Password reset code sent to your email' };
  }

  static async resetPassword(email, resetCode, newPassword) {
    const user = await User.findOne({
      email,
      googleId: { $exists: false },
      'resetPassword.code': resetCode,
      'resetPassword.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset code');
    }

    // Update password and clear reset code
    user.password = newPassword;
    user.resetPassword = undefined;
    user.passwordChangeRequired = false;
    await user.save();

    await sendEmail(
      email,
      'Password Reset Successful',
      'Your password has been successfully reset.'
    );

    return { message: 'Password reset successful' };
  }
}

module.exports = AuthService; 