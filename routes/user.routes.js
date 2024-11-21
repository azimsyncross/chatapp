const express = require('express');
const UserController = require('../controllers/user.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/roles');
const router = express.Router();

router.get('/me', verifyToken, UserController.getUserDetails);
router.get('/login-history', 
  verifyToken, 
  checkRole(ROLES.ADMIN), 
  UserController.getUserLoginHistory
);

module.exports = router; 