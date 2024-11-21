const Order = require('../models/order.model');
const User = require('../models/user.model');
const { ROLES } = require('../utils/roles');
const CacheService = require('./cache.service');

class MonitoringService {
  static async getOrderStatistics() {
    const cacheKey = 'monitoring:order-stats';
    let stats = await CacheService.get(cacheKey);

    if (!stats) {
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        rejectedOrders
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'processing' }),
        Order.countDocuments({ status: 'completed' }),
        Order.countDocuments({ status: 'cancelled' }),
        Order.countDocuments({ status: 'rejected' })
      ]);

      stats = {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        rejected: rejectedOrders
      };

      await CacheService.set(cacheKey, stats, 300); // Cache for 5 minutes
    }

    return stats;
  }

  static async getModeratorPerformance(timeRange = '24h') {
    const cacheKey = `monitoring:moderator-performance:${timeRange}`;
    let performance = await CacheService.get(cacheKey);

    if (!performance) {
      const timeFilter = this.getTimeFilter(timeRange);
      const moderators = await User.find({ role: ROLES.MODERATOR }).select('name');

      const performanceData = await Promise.all(
        moderators.map(async (moderator) => {
          const [
            totalHandled,
            completedOrders,
            averageHandlingTime
          ] = await Promise.all([
            Order.countDocuments({
              handledBy: moderator._id,
              createdAt: timeFilter
            }),
            Order.countDocuments({
              handledBy: moderator._id,
              status: 'completed',
              createdAt: timeFilter
            }),
            this.calculateAverageHandlingTime(moderator._id, timeFilter)
          ]);

          return {
            moderatorId: moderator._id,
            name: moderator.name,
            totalHandled,
            completedOrders,
            averageHandlingTime,
            completionRate: totalHandled ? (completedOrders / totalHandled) * 100 : 0
          };
        })
      );

      performance = {
        timeRange,
        moderators: performanceData
      };

      await CacheService.set(cacheKey, performance, 300); // Cache for 5 minutes
    }

    return performance;
  }

  static async getOrderTrends(timeRange = '7d') {
    const cacheKey = `monitoring:order-trends:${timeRange}`;
    let trends = await CacheService.get(cacheKey);

    if (!trends) {
      const timeFilter = this.getTimeFilter(timeRange);
      const orders = await Order.find({
        createdAt: timeFilter
      }).select('createdAt status');

      const groupedOrders = this.groupOrdersByTime(orders, timeRange);
      trends = {
        timeRange,
        data: groupedOrders
      };

      await CacheService.set(cacheKey, trends, 300); // Cache for 5 minutes
    }

    return trends;
  }

  static async getActiveOrders() {
    const activeOrders = await Order.find({
      status: { $in: ['pending', 'processing'] }
    })
    .populate([
      { path: 'user', select: 'name email' },
      { path: 'handledBy', select: 'name' },
      { path: 'exchangeMethod', select: 'name rate' }
    ])
    .sort('-createdAt');

    return activeOrders;
  }

  private static getTimeFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return { $gte: new Date(now - 24 * 60 * 60 * 1000) };
      case '7d':
        return { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
      case '30d':
        return { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
      default:
        return { $gte: new Date(now - 24 * 60 * 60 * 1000) };
    }
  }

  private static async calculateAverageHandlingTime(moderatorId, timeFilter) {
    const orders = await Order.find({
      handledBy: moderatorId,
      status: 'completed',
      createdAt: timeFilter,
      completedAt: { $exists: true }
    }).select('createdAt completedAt');

    if (!orders.length) return 0;

    const totalTime = orders.reduce((acc, order) => {
      return acc + (order.completedAt - order.createdAt);
    }, 0);

    return Math.round(totalTime / orders.length / (1000 * 60)); // Return in minutes
  }

  private static groupOrdersByTime(orders, timeRange) {
    const groupedOrders = {};
    const format = timeRange === '24h' ? 'hour' : 'day';

    orders.forEach(order => {
      const key = format === 'hour' 
        ? order.createdAt.getHours()
        : order.createdAt.toISOString().split('T')[0];

      if (!groupedOrders[key]) {
        groupedOrders[key] = {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          rejected: 0
        };
      }

      groupedOrders[key].total++;
      groupedOrders[key][order.status]++;
    });

    return groupedOrders;
  }
}

module.exports = MonitoringService; 