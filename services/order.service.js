const Order = require('../models/order.model');
const ChatRoom = require('../models/chatRoom.model');
const ExchangeMethod = require('../models/exchangeMethod.model');
const MessageService = require('./message.service');
const User = require('../models/user.model');
const { ROLES } = require('../utils/roles');

class OrderService {
  static async createOrder(userId, data) {
    // Start a session for transaction
    const session = await Order.startSession();
    session.startTransaction();

    try {
      // Get current exchange rate
      const method = await ExchangeMethod.findById(data.exchangeMethod);
      if (!method || !method.isActive) {
        throw new Error('Invalid or inactive exchange method');
      }

      // Create order
      const order = await Order.create([{
        user: userId,
        exchangeMethod: method._id,
        amount: data.amount,
        exchangeRate: method.rate,
        notes: data.notes
      }], { session });

      // Create chat room for the order
      const chatRoom = await ChatRoom.create([{
        name: `Order #${order[0]._id}`,
        order: order[0]._id,
        creator: userId
      }], { session });

      // Notify all moderators about new chat room
      const moderators = await User.find({ role: ROLES.MODERATOR });
      
      // Create system message about order creation
      await MessageService.createMessage({
        roomId: chatRoom[0]._id,
        type: 'system',
        content: `Order created for ${method.name}. Amount: ${data.amount}, Rate: ${method.rate}`,
        metadata: {
          orderStatus: 'initialized',
          orderId: order[0]._id
        }
      }, { session });

      await session.commitTransaction();

      // Notify moderators through socket (handled by caller)
      return {
        order: await order[0].populate([
          { path: 'user', select: 'name email' },
          { path: 'exchangeMethod', select: 'name rate' }
        ]),
        chatRoom: chatRoom[0],
        moderators
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async updateOrderStatus(orderId, status, userId, userRole, notes) {
    const session = await Order.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate status change permissions
      if (userRole === ROLES.USER && status !== 'cancelled') {
        throw new Error('Users can only cancel orders');
      }

      if (userRole === ROLES.MODERATOR && !['processing', 'completed'].includes(status)) {
        throw new Error('Moderators can only process or complete orders');
      }

      // Update order status
      order.status = status;
      if (userRole === ROLES.MODERATOR) {
        order.handledBy = userId;
      }
      if (status === 'completed') {
        order.completedAt = new Date();
      }
      if (notes) order.moderatorNotes = notes;
      await order.save({ session });

      // Find associated chat room
      const chatRoom = await ChatRoom.findOne({ order: orderId });
      if (chatRoom) {
        // Add moderator action
        chatRoom.moderatorActions.push({
          type: `order_${status}`,
          moderator: userId,
          notes
        });
        await chatRoom.save({ session });

        // Create system message
        await MessageService.createMessage({
          roomId: chatRoom._id,
          type: 'system',
          content: `Order status updated to ${status}${notes ? `: ${notes}` : ''}`,
          metadata: {
            orderStatus: status,
            orderId: order._id
          }
        }, { session });
      }

      await session.commitTransaction();

      return order.populate([
        { path: 'user', select: 'name email' },
        { path: 'exchangeMethod', select: 'name rate' },
        { path: 'handledBy', select: 'name' }
      ]);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getUserOrders(userId, status) {
    const query = { user: userId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate([
        { path: 'exchangeMethod', select: 'name rate' },
        { path: 'handledBy', select: 'name' }
      ])
      .sort('-createdAt');

    // Get chat rooms for each order
    const orderDetails = await Promise.all(orders.map(async order => {
      const chatRoom = await ChatRoom.findOne({ order: order._id })
        .select('_id status moderator')
        .populate('moderator', 'name');
      
      return {
        ...order.toObject(),
        chatRoom: chatRoom ? {
          id: chatRoom._id,
          status: chatRoom.status,
          moderator: chatRoom.moderator
        } : null
      };
    }));

    return orderDetails;
  }

  static async getAllOrders(status, page = 1, limit = 20) {
    const query = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate([
          { path: 'user', select: 'name email' },
          { path: 'exchangeMethod', select: 'name rate' },
          { path: 'handledBy', select: 'name' }
        ])
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = OrderService; 