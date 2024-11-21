const UserService = require('../services/user.service');
const ApiResponse = require('../utils/response');

class UserController {
  static async getUserDetails(req, res, next) {
    try {
      const user = await UserService.getUserDetails(req.user._id);
      ApiResponse.success(res, { user }, 'User details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserLoginHistory(req, res, next) {
    try {
      const userId = req.query.userId || req.user._id;
      const history = await UserService.getUserLoginHistory(userId);
      ApiResponse.success(res, { history }, 'Login history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController; 