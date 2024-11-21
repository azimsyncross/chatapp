const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/roles');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String
  },
  loginCode: {
    code: String,
    expiresAt: Date
  },
  lastLogin: {
    timestamp: Date,
    method: {
      type: String,
      enum: ['email', 'google', 'code'],
    }
  },
  loginHistory: [{
    timestamp: Date,
    method: {
      type: String,
      enum: ['email', 'google', 'code'],
    },
    ip: String,
    userAgent: String
  }],
  resetPassword: {
    code: String,
    expiresAt: Date
  },
  passwordChangeRequired: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 