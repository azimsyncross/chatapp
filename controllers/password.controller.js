const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/response');

class PasswordController {
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );
      ApiResponse.success(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async resetModeratorPassword(req, res, next) {
    try {
      const { moderatorId } = req.params;
      const result = await AuthService.resetModeratorPassword(
        moderatorId,
        req.user._id
      );
      ApiResponse.success(res, result, 'Moderator password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  static async adminForgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.adminForgotPassword(email);
      ApiResponse.success(res, result, 'Reset code sent to admin email');
    } catch (error) {
      next(error);
    }
  }

  static async adminResetPassword(req, res, next) {
    try {
      const { email, resetCode, newPassword } = req.body;
      const result = await AuthService.adminResetPassword(email, resetCode, newPassword);
      ApiResponse.success(res, result, 'Admin password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      ApiResponse.success(res, result, 'Reset code sent to email');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, resetCode, newPassword } = req.body;
      const result = await AuthService.resetPassword(email, resetCode, newPassword);
      ApiResponse.success(res, result, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PasswordController; 