const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../configs/variables');
const User = require('../models/user.model');
const ApiResponse = require('../utils/response');
const { ROLES_HIERARCHY } = require('../utils/roles');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return ApiResponse.error(res, 'No token provided', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    ApiResponse.error(res, 'Invalid token', 401);
  }
};

const checkRole = (minimumRole) => {
  return (req, res, next) => {
    const userRoleLevel = ROLES_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLES_HIERARCHY[minimumRole];

    if (userRoleLevel >= requiredRoleLevel) {
      next();
    } else {
      ApiResponse.error(res, 'Insufficient permissions', 403);
    }
  };
};

module.exports = {
  verifyToken,
  checkRole
}; 