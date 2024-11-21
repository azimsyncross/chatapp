const ChatRoom = require('../models/chatRoom.model');
const User = require('../models/user.model');
const { ROLES } = require('../utils/roles');
const CacheService = require('./cache.service');

class ChatRoomService {
  static async getAvailableModerators(excludeModerator = null) {
    const cacheKey = CacheService.generateModeratorListKey();
    
    // Try to get from cache
    let moderators = await CacheService.get(cacheKey);
    
    if (!moderators) {
      // If not in cache, get from database
      const query = { role: ROLES.MODERATOR };
      if (excludeModerator) {
        query._id = { $ne: excludeModerator };
      }
      moderators = await User.find(query).select('name email');
      
      // Save to cache
      await CacheService.set(cacheKey, moderators, 300); // Cache for 5 minutes
    }

    return moderators;
  }

  static async getRoomDetails(roomId) {
    const cacheKey = CacheService.generateRoomKey(roomId);
    
    // Try to get from cache
    let room = await CacheService.get(cacheKey);
    
    if (!room) {
      // If not in cache, get from database
      room = await ChatRoom.findById(roomId)
        .populate('creator', 'name')
        .populate('moderator', 'name')
        .populate('moderatorActions.moderator', 'name');
      
      if (room) {
        // Save to cache
        await CacheService.set(cacheKey, room);
      }
    }

    return room;
  }

  static async getRoomHistory(roomId) {
    const cacheKey = `${CacheService.generateRoomKey(roomId)}:history`;
    
    // Try to get from cache
    let history = await CacheService.get(cacheKey);
    
    if (!history) {
      // If not in cache, get from database
      history = await ChatRoom.findById(roomId)
        .select('moderatorActions')
        .populate('moderatorActions.moderator', 'name');
      
      if (history) {
        // Save to cache
        await CacheService.set(cacheKey, history, 1800); // Cache for 30 minutes
      }
    }

    return history;
  }

  static async invalidateRoomCache(roomId) {
    await CacheService.delPattern(`room:${roomId}*`);
  }

  static async invalidateModeratorCache() {
    await CacheService.del(CacheService.generateModeratorListKey());
  }
}

module.exports = ChatRoomService; 