const mongoose = require('mongoose');

const exchangeMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    url: String,
    publicId: String // For Cloudinary
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Middleware to delete image from Cloudinary when method is deleted
exchangeMethodSchema.pre('remove', async function(next) {
  if (this.image?.publicId) {
    const uploadService = require('../services/upload.service');
    await uploadService.deleteFromCloudinary(this.image.publicId);
  }
  next();
});

module.exports = mongoose.model('ExchangeMethod', exchangeMethodSchema); 