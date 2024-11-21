const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./variables');
const User = require('../models/user.model');
const ChatRoom = require('../models/chatRoom.model');
const { ROLES } = require('../utils/roles');
const CacheService = require('../services/cache.service');
const MessageService = require('../services/message.service');
const uploadService = require('../services/upload.service');
const ChatService = require('../services/chat.service');

class SocketConfig {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
      }
    });

    // Middleware for authentication
    this.io.use(this.authenticateSocket);
    
    // Initialize socket event handlers
    this.initialize();
  }

  // Socket Authentication Middleware
  authenticateSocket = async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  };

  // Initialize all socket events
  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.name}`);
      
      // Join user to their personal room
      socket.join(socket.user._id.toString());

      // Handle user status
      this.handleUserStatus(socket);
      
      // Handle chat events
      this.handleChatEvents(socket);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.name}`);
        this.handleDisconnect(socket);
      });
    });
  }

  // Handle user online/offline status
  handleUserStatus(socket) {
    // Emit to all users that this user is online
    socket.broadcast.emit('user:online', {
      userId: socket.user._id,
      name: socket.user.name
    });

    // Handle user typing status
    socket.on('user:typing', (data) => {
      socket.to(data.roomId).emit('user:typing', {
        userId: socket.user._id,
        name: socket.user.name,
        isTyping: data.isTyping
      });
    });
  }

  // Handle chat related events
  handleChatEvents(socket) {
    // Join chat room
    socket.on('chat:join', async (data) => {
      try {
        const { roomId, orderId } = data;
        
        // Verify user's access to this room/order
        const room = await ChatRoom.findOne({
          _id: roomId,
          $or: [
            { creator: socket.user._id },
            { moderator: socket.user._id }
          ]
        });

        if (!room) {
          throw new Error('Access denied');
        }

        socket.join(roomId);
        await ChatService.trackUserPresence(socket.user._id, 'online');
        
        socket.to(roomId).emit('chat:userJoined', {
          userId: socket.user._id,
          name: socket.user.name,
          role: socket.user.role
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing status with debouncing
    let typingTimeout;
    socket.on('chat:typing', async (data) => {
      try {
        clearTimeout(typingTimeout);
        await ChatService.updateTypingStatus(data.roomId, socket.user._id, true);
        
        typingTimeout = setTimeout(async () => {
          await ChatService.updateTypingStatus(data.roomId, socket.user._id, false);
        }, 3000);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Moderator accepting chat
    socket.on('moderator:accept', async (data) => {
      try {
        const room = await ChatService.assignModerator(data.roomId, socket.user._id);
        socket.join(data.roomId);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Update order status
    socket.on('order:updateStatus', async (data) => {
      try {
        const { roomId, status, notes } = data;
        await ChatService.updateOrderStatus(roomId, status, socket.user._id, notes);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle text message
    socket.on('chat:message', async (data) => {
      try {
        const message = await MessageService.createMessage({
          roomId: data.roomId,
          sender: socket.user._id,
          type: 'text',
          content: data.message
        });

        this.io.to(data.roomId).emit('chat:message', {
          _id: message._id,
          type: 'text',
          content: message.content,
          sender: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          createdAt: message.createdAt
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle image upload
    socket.on('chat:image', async (data) => {
      try {
        const { file, roomId } = data;
        
        // Upload image to Cloudinary
        const uploadResult = await uploadService.uploadToCloudinary(file);
        
        // Create message record
        const message = await MessageService.createMessage({
          roomId,
          sender: socket.user._id,
          type: 'image',
          content: uploadResult.url,
          metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            publicId: uploadResult.publicId
          }
        });

        this.io.to(roomId).emit('chat:message', {
          _id: message._id,
          type: 'image',
          content: uploadResult.url,
          metadata: message.metadata,
          sender: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          createdAt: message.createdAt
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Get previous messages
    socket.on('chat:getMessages', async (data) => {
      try {
        const messages = await MessageService.getRoomMessages(
          data.roomId,
          data.page,
          data.limit
        );
        
        socket.emit('chat:messages', {
          messages,
          page: data.page,
          hasMore: messages.length === data.limit
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Create chat room
    socket.on('chatRoom:create', async (data) => {
      try {
        const room = await ChatRoom.create({
          name: data.name,
          creator: socket.user._id
        });

        // Notify all moderators
        const moderators = await User.find({ role: ROLES.MODERATOR });
        moderators.forEach(moderator => {
          this.io.to(moderator._id.toString()).emit('moderator:roomRequest', {
            roomId: room._id,
            creator: {
              id: socket.user._id,
              name: socket.user.name
            },
            roomName: room.name
          });
        });

        // Join creator to room
        socket.join(room._id.toString());
        socket.emit('chatRoom:created', { roomId: room._id });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Moderator joining room
    socket.on('moderator:joinRoom', async (data) => {
      try {
        const room = await ChatRoom.findById(data.roomId);
        if (!room) throw new Error('Room not found');
        
        if (room.moderator) {
          throw new Error('Room already has a moderator');
        }

        // Update room with moderator
        room.moderator = socket.user._id;
        room.status = 'active';
        room.moderatorActions.push({
          type: 'join',
          moderator: socket.user._id
        });
        await room.save();

        // Invalidate room cache
        await ChatRoomService.invalidateRoomCache(room._id);
        await ChatRoomService.invalidateModeratorCache();

        // Join moderator to room
        socket.join(room._id.toString());

        // Notify room about moderator joining
        this.io.to(room._id.toString()).emit('moderator:joined', {
          moderator: {
            id: socket.user._id,
            name: socket.user.name
          }
        });

        // Notify other moderators that room is taken
        const moderators = await User.find({ role: ROLES.MODERATOR });
        moderators.forEach(mod => {
          if (mod._id.toString() !== socket.user._id.toString()) {
            this.io.to(mod._id.toString()).emit('moderator:roomTaken', {
              roomId: room._id,
              moderator: {
                id: socket.user._id,
                name: socket.user.name
              }
            });
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Initiate chat transfer
    socket.on('moderator:initiateTransfer', async (data) => {
      try {
        const room = await ChatRoom.findById(data.roomId);
        if (!room) throw new Error('Room not found');
        
        if (room.moderator.toString() !== socket.user._id.toString()) {
          throw new Error('Not authorized to transfer this chat');
        }

        room.status = 'transferring';
        room.transferRequest = {
          from: socket.user._id,
          to: data.toModeratorId,
          status: 'pending',
          timestamp: new Date()
        };
        await room.save();

        // Invalidate room cache
        await ChatRoomService.invalidateRoomCache(room._id);

        // Notify the target moderator
        this.io.to(data.toModeratorId).emit('moderator:transferRequest', {
          roomId: room._id,
          from: {
            id: socket.user._id,
            name: socket.user.name
          },
          roomName: room.name
        });

        // Notify room about transfer initiation
        this.io.to(room._id.toString()).emit('chat:transferring', {
          from: socket.user.name,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Accept chat transfer
    socket.on('moderator:acceptTransfer', async (data) => {
      try {
        const room = await ChatRoom.findById(data.roomId);
        if (!room) throw new Error('Room not found');

        if (room.transferRequest.to.toString() !== socket.user._id.toString()) {
          throw new Error('Not authorized to accept this transfer');
        }

        const oldModerator = room.moderator;
        room.moderator = socket.user._id;
        room.status = 'active';
        room.moderatorActions.push({
          type: 'transfer_completed',
          moderator: socket.user._id
        });
        room.transferRequest = undefined;
        await room.save();

        // Invalidate room cache
        await ChatRoomService.invalidateRoomCache(room._id);
        await ChatRoomService.invalidateModeratorCache();

        // Remove old moderator from room
        this.io.sockets.sockets.get(oldModerator.toString())?.leave(room._id.toString());

        // Add new moderator to room
        socket.join(room._id.toString());

        // Notify room about moderator change
        this.io.to(room._id.toString()).emit('moderator:changed', {
          newModerator: {
            id: socket.user._id,
            name: socket.user.name
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Clean chat history (Moderator only)
    socket.on('chat:clean', async (data) => {
      try {
        const room = await ChatRoom.findById(data.roomId);
        if (!room) {
          throw new Error('Room not found');
        }

        // Verify that the user is the current moderator of the room
        if (room.moderator.toString() !== socket.user._id.toString()) {
          throw new Error('Not authorized to clean chat history');
        }

        // Clean chat history
        const result = await MessageService.cleanChatHistory(data.roomId);

        // Add moderator action to room
        room.moderatorActions.push({
          type: 'clean_history',
          moderator: socket.user._id
        });
        await room.save();

        // Notify room about chat cleaning
        this.io.to(data.roomId).emit('chat:cleaned', {
          moderator: {
            id: socket.user._id,
            name: socket.user.name
          },
          timestamp: new Date(),
          imagesDeleted: result.imagesDeleted
        });

        // Send confirmation to moderator
        socket.emit('chat:cleanConfirmed', {
          success: true,
          imagesDeleted: result.imagesDeleted
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
  }

  // Handle user disconnection
  handleDisconnect(socket) {
    // Emit to all users that this user is offline
    socket.broadcast.emit('user:offline', {
      userId: socket.user._id,
      name: socket.user.name
    });
  }

  // Utility method to emit to specific user
  emitToUser(userId, event, data) {
    this.io.to(userId.toString()).emit(event, data);
  }

  // Utility method to emit to all users
  emitToAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = SocketConfig; 