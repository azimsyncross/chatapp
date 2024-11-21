const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/roles');
const MonitoringController = require('../controllers/monitoring.controller');
const router = express.Router();

// All routes require admin access
router.use(verifyToken, checkRole(ROLES.ADMIN));

// Get overall order statistics
router.get('/orders/statistics', MonitoringController.getOrderStatistics);

// Get moderator performance metrics
router.get('/moderators/performance', MonitoringController.getModeratorPerformance);

// Get order trends over time
router.get('/orders/trends', MonitoringController.getOrderTrends);

// Get currently active orders
router.get('/orders/active', MonitoringController.getActiveOrders);

module.exports = router; 