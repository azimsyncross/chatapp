const express = require('express');
const PasswordController = require('../controllers/password.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/roles');
const router = express.Router();

// Regular password routes
router.post('/forgot', PasswordController.forgotPassword);
router.post('/reset', PasswordController.resetPassword);

// Change own password (requires authentication)
router.post('/change',
  verifyToken,
  PasswordController.changePassword
);

// Admin specific routes
router.post('/admin/forgot', PasswordController.adminForgotPassword);
router.post('/admin/reset', PasswordController.adminResetPassword);
router.post('/moderator/:moderatorId/reset',
  verifyToken,
  checkRole(ROLES.ADMIN),
  PasswordController.resetModeratorPassword
);

module.exports = router; 