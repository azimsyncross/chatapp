const AuthService = require('../services/auth.service');
const UserService = require('../services/user.service');
const ApiResponse = require('../utils/response');

class AuthController {
  static async register(req, res, next) {
    try {
      const { user, token } = await AuthService.register(req.body);
      ApiResponse.success(res, { user, token }, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  static async loginSuccess(req, res, next) {
    try {
      const token = AuthService.generateToken(req.user._id);
      await UserService.trackLogin(req.user._id, 'email', req);
      
      const user = await UserService.getUserDetails(req.user._id);
      ApiResponse.success(res, { user, token }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async googleCallback(req, res, next) {
    try {
      if (!req.user) {
        return ApiResponse.error(
          res, 
          'Google login is only available for regular users',
          403
        );
      }

      const token = AuthService.generateToken(req.user._id);
      await UserService.trackLogin(req.user._id, 'google', req);
      
      const user = await UserService.getUserDetails(req.user._id);
      ApiResponse.success(res, { user, token }, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  static async requestLoginCode(req, res, next) {
    try {
      const result = await AuthService.requestLoginCode(req.body.email);
      ApiResponse.success(res, result, 'Login code sent successfully');
    } catch (error) {
      next(error);
    }
  }

  static async verifyLoginCode(req, res, next) {
    try {
      const { email, code } = req.body;
      const { user, token } = await AuthService.verifyLoginCode(email, code);
      await UserService.trackLogin(user._id, 'code', req);
      
      const userDetails = await UserService.getUserDetails(user._id);
      ApiResponse.success(res, { user: userDetails, token }, 'Code verification successful');
    } catch (error) {
      next(error);
    }
  }

  static async createModerator(req, res, next) {
    try {
      const { user, token } = await AuthService.createModerator(req.body, req.user._id);
      ApiResponse.success(res, { user, token }, 'Moderator created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController; 