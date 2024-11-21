const mongoose = require('mongoose');
const { ROLES } = require('../utils/roles');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'transferring', 'closed'],
    default: 'waiting'
  },
  moderatorActions: [{
    type: {
      type: String,
      enum: ['join', 'leave', 'transfer_initiated', 'transfer_completed', 'clean_history', 'order_completed', 'order_cancelled']
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  transferRequest: {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected']
    },
    timestamp: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema); 