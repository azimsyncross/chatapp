const MonitoringService = require('../services/monitoring.service');
const ApiResponse = require('../utils/response');

class MonitoringController {
  static async getOrderStatistics(req, res, next) {
    try {
      const stats = await MonitoringService.getOrderStatistics();
      ApiResponse.success(res, { stats }, 'Order statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getModeratorPerformance(req, res, next) {
    try {
      const { timeRange } = req.query;
      const performance = await MonitoringService.getModeratorPerformance(timeRange);
      ApiResponse.success(res, { performance }, 'Moderator performance retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getOrderTrends(req, res, next) {
    try {
      const { timeRange } = req.query;
      const trends = await MonitoringService.getOrderTrends(timeRange);
      ApiResponse.success(res, { trends }, 'Order trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getActiveOrders(req, res, next) {
    try {
      const orders = await MonitoringService.getActiveOrders();
      ApiResponse.success(res, { orders }, 'Active orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MonitoringController; 