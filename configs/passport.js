const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = require('./variables');
const User = require('../models/user.model');
const { ROLES } = require('../utils/roles');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy for email/password login
passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  async (req, email, password, done) => {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // For admin and moderator, verify password
      if (user.role !== ROLES.USER) {
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid credentials' });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google Strategy - Only for regular users
passport.use('google', new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // If existing user is admin or moderator, deny access
        if (user.role !== ROLES.USER) {
          return done(null, false, { 
            message: 'Google login is only available for regular users' 
          });
        }
        return done(null, user);
      }

      // Create new user with USER role only
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        phone: '',
        role: ROLES.USER, // Enforce USER role
        googleId: profile.id,
        avatar: profile.photos[0]?.value
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport; 