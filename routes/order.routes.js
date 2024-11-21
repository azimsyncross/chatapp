const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/roles');
const router = express.Router();
const OrderController = require('../controllers/order.controller');

// User routes
router.post('/',
  verifyToken,
  OrderController.createOrder
);

router.get('/my-orders',
  verifyToken,
  OrderController.getUserOrders
);

router.get('/my-orders/:status',
  verifyToken,
  OrderController.getUserOrders
);

router.post('/:orderId/cancel',
  verifyToken,
  OrderController.cancelOrder
);

// Moderator/Admin routes
router.get('/all',
  verifyToken,
  checkRole(ROLES.MODERATOR),
  OrderController.getAllOrders
);

router.put('/:id/status',
  verifyToken,
  checkRole(ROLES.MODERATOR),
  OrderController.updateOrderStatus
);

module.exports = router; 