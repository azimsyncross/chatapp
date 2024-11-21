const express = require('express');
const passport = require('passport');
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

// Regular auth routes with passport
router.post('/register', AuthController.register);
router.post('/login', 
  passport.authenticate('local', { session: false }),
  AuthController.loginSuccess
);
router.post('/login/code/request', AuthController.requestLoginCode);
router.post('/login/code/verify', AuthController.verifyLoginCode);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login' 
  }),
  AuthController.googleCallback
);

// Protected routes
router.post('/moderator', verifyToken, AuthController.createModerator);

module.exports = router; 