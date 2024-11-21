const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exchangeMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExchangeMethod',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  notes: String,
  moderatorNotes: String,
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date
}, {
  timestamps: true
});

// Calculate total amount before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('exchangeRate')) {
    this.totalAmount = this.amount * this.exchangeRate;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema); 