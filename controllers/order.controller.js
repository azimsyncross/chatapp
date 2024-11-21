const OrderService = require('../services/order.service');
const ApiResponse = require('../utils/response');
const { io } = global;

class OrderController {
  static async createOrder(req, res, next) {
    try {
      const result = await OrderService.createOrder(req.user._id, req.body);
      
      // Notify moderators about new chat room
      result.moderators.forEach(moderator => {
        io.to(moderator._id.toString()).emit('moderator:roomRequest', {
          roomId: result.chatRoom._id,
          orderId: result.order._id,
          creator: {
            id: req.user._id,
            name: req.user.name
          },
          roomName: result.chatRoom.name,
          orderDetails: {
            method: result.order.exchangeMethod.name,
            amount: result.order.amount,
            rate: result.order.exchangeRate
          }
        });
      });

      ApiResponse.success(res, {
        order: result.order,
        chatRoomId: result.chatRoom._id
      }, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrders(req, res, next) {
    try {
      const status = req.params.status;
      const orders = await OrderService.getUserOrders(req.user._id, status);
      ApiResponse.success(res, { orders }, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const order = await OrderService.updateOrderStatus(
        req.params.orderId,
        'cancelled',
        req.user._id,
        req.user.role,
        req.body.notes
      );
      ApiResponse.success(res, { order }, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // ... existing moderator methods ...
}

module.exports = OrderController; 