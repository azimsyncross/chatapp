const Message = require('../models/message.model');
const CacheService = require('./cache.service');

class MessageService {
  static async createMessage(messageData) {
    const message = await Message.create(messageData);
    await message.populate('sender', 'name avatar');
    
    // Invalidate room messages cache
    await CacheService.delPattern(`room:${messageData.roomId}:messages*`);
    
    return message;
  }

  static async getRoomMessages(roomId, page = 1, limit = 50) {
    const cacheKey = `room:${roomId}:messages:${page}`;
    
    let messages = await CacheService.get(cacheKey);
    
    if (!messages) {
      messages = await Message.find({ roomId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'name avatar')
        .lean();
      
      await CacheService.set(cacheKey, messages, 300); // Cache for 5 minutes
    }
    
    return messages;
  }

  static async cleanChatHistory(roomId) {
    // Clean chat history and get number of images deleted
    const imagesDeleted = await Message.cleanChatHistory(roomId);
    
    // Invalidate room messages cache
    await CacheService.delPattern(`room:${roomId}:messages*`);
    
    return {
      imagesDeleted,
      success: true
    };
  }
}

module.exports = MessageService; 