const ChatRoom = require('../models/chatRoom.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const pusher = require('../configs/pusher');
const { ROLES } = require('../utils/roles');

class ChatService {
  // Room Management
  static async initializeOrderChat(order, user) {
    const room = await ChatRoom.create({
      name: `Order #${order._id}`,
      order: order._id,
      creator: user._id,
      status: 'waiting'
    });

    // Notify moderators through Pusher
    await pusher.trigger('moderator-channel', 'new-order-chat', {
      roomId: room._id,
      orderId: order._id,
      creator: {
        id: user._id,
        name: user.name
      },
      orderDetails: {
        method: order.exchangeMethod.name,
        amount: order.amount,
        rate: order.exchangeRate
      }
    });

    return room;
  }

  static async assignModerator(roomId, moderatorId) {
    const [room, moderator] = await Promise.all([
      ChatRoom.findById(roomId),
      User.findById(moderatorId)
    ]);

    if (!room || !moderator || moderator.role !== ROLES.MODERATOR) {
      throw new Error('Invalid room or moderator');
    }

    if (room.moderator) {
      throw new Error('Room already has a moderator');
    }

    room.moderator = moderatorId;
    room.status = 'active';
    room.moderatorActions.push({
      type: 'join',
      moderator: moderatorId,
      timestamp: new Date()
    });

    await room.save();

    // Update order status
    await Order.findByIdAndUpdate(room.order, {
      status: 'processing',
      handledBy: moderatorId
    });

    // Notify through Pusher
    await Promise.all([
      pusher.trigger(`order-${room.order}`, 'moderator-assigned', {
        moderator: {
          id: moderator._id,
          name: moderator.name
        }
      }),
      pusher.trigger('moderator-channel', 'room-taken', {
        roomId: room._id,
        moderator: {
          id: moderator._id,
          name: moderator.name
        }
      })
    ]);

    return room;
  }

  // Chat Transfer
  static async initiateTransfer(roomId, fromModeratorId, toModeratorId) {
    const room = await ChatRoom.findOne({
      _id: roomId,
      moderator: fromModeratorId
    });

    if (!room) {
      throw new Error('Unauthorized or room not found');
    }

    room.status = 'transferring';
    room.transferRequest = {
      from: fromModeratorId,
      to: toModeratorId,
      status: 'pending',
      timestamp: new Date()
    };

    await room.save();

    // Notify through Pusher
    await Promise.all([
      pusher.trigger(`room-${roomId}`, 'transfer-initiated', {
        from: fromModeratorId,
        to: toModeratorId
      }),
      pusher.trigger(`moderator-${toModeratorId}`, 'transfer-request', {
        roomId,
        orderId: room.order
      })
    ]);

    return room;
  }

  // Status Updates
  static async updateOrderStatus(roomId, status, userId, notes) {
    const room = await ChatRoom.findById(roomId)
      .populate('order')
      .populate('moderator');

    if (!room) {
      throw new Error('Room not found');
    }

    const order = room.order;
    const previousStatus = order.status;

    // Update order status
    order.status = status;
    if (notes) order.moderatorNotes = notes;
    if (status === 'completed') order.completedAt = new Date();

    // Add moderator action
    room.moderatorActions.push({
      type: `order_${status}`,
      moderator: userId,
      notes,
      timestamp: new Date()
    });

    await Promise.all([order.save(), room.save()]);

    // Notify all parties through Pusher
    await Promise.all([
      pusher.trigger(`order-${order._id}`, 'status-updated', {
        status,
        previousStatus,
        updatedBy: userId,
        notes
      }),
      pusher.trigger('moderator-channel', 'order-status-changed', {
        orderId: order._id,
        roomId: room._id,
        status
      })
    ]);

    return { room, order };
  }

  // Real-time Typing Indicators
  static async updateTypingStatus(roomId, userId, isTyping) {
    await pusher.trigger(`room-${roomId}`, 'typing-status', {
      userId,
      isTyping
    });
  }

  // User Presence
  static async trackUserPresence(userId, status) {
    await pusher.trigger('presence-channel', 'user-status', {
      userId,
      status // 'online' or 'offline'
    });
  }

  // Notifications
  static async sendNotification(type, data) {
    const notificationTypes = {
      orderCreated: 'new-order',
      statusChanged: 'status-update',
      moderatorAssigned: 'mod-assigned',
      chatClosed: 'chat-closed'
    };

    if (notificationTypes[type]) {
      await pusher.trigger('notifications', notificationTypes[type], data);
    }
  }
}

module.exports = ChatService; 