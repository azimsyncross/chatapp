const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true
  },
  content: {
    type: String,
    required: true // URL for images, text content for messages
  },
  metadata: {
    originalName: String,    // Original filename
    mimeType: String,       // File MIME type
    size: Number,           // File size
    width: Number,          // Image width (Cloudinary)
    height: Number,         // Image height (Cloudinary)
    format: String,         // Image format (Cloudinary)
    publicId: String        // Cloudinary public ID
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ roomId: 1, createdAt: -1 });

// Middleware to delete image from Cloudinary when message is deleted
messageSchema.pre('remove', async function(next) {
  if (this.type === 'image' && this.metadata?.publicId) {
    const uploadService = require('../services/upload.service');
    await uploadService.deleteFromCloudinary(this.metadata.publicId);
  }
  next();
});

// Add static method for cleaning chat history
messageSchema.statics.cleanChatHistory = async function(roomId) {
  // First get all image messages to delete from Cloudinary
  const imageMessages = await this.find({
    roomId,
    type: 'image',
    'metadata.publicId': { $exists: true }
  });

  // Delete images from Cloudinary
  const uploadService = require('../services/upload.service');
  const deletePromises = imageMessages.map(msg => 
    uploadService.deleteFromCloudinary(msg.metadata.publicId)
  );
  await Promise.all(deletePromises);

  // Delete all messages from the room
  await this.deleteMany({ roomId });

  return imageMessages.length; // Return number of images deleted
};

module.exports = mongoose.model('Message', messageSchema); 