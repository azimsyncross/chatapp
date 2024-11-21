const ExchangeMethod = require('../models/exchangeMethod.model');
const CacheService = require('./cache.service');

class ExchangeMethodService {
  static async createMethod(data, adminId) {
    const method = await ExchangeMethod.create({
      ...data,
      lastUpdatedBy: adminId
    });

    await CacheService.delPattern('exchange-methods:*');
    return method;
  }

  static async updateMethod(id, data, adminId) {
    const method = await ExchangeMethod.findById(id);
    if (!method) {
      throw new Error('Exchange method not found');
    }

    // If new image, delete old one
    if (data.image && method.image?.publicId) {
      const uploadService = require('../services/upload.service');
      await uploadService.deleteFromCloudinary(method.image.publicId);
    }

    Object.assign(method, {
      ...data,
      lastUpdatedBy: adminId
    });

    await method.save();
    await CacheService.delPattern('exchange-methods:*');
    return method;
  }

  static async deleteMethod(id) {
    const method = await ExchangeMethod.findById(id);
    if (!method) {
      throw new Error('Exchange method not found');
    }

    await method.remove(); // This will trigger the pre-remove middleware
    await CacheService.delPattern('exchange-methods:*');
    return { success: true };
  }

  static async getAllMethods(includeInactive = false) {
    const cacheKey = `exchange-methods:${includeInactive}`;
    let methods = await CacheService.get(cacheKey);

    if (!methods) {
      const query = includeInactive ? {} : { isActive: true };
      methods = await ExchangeMethod.find(query)
        .populate('lastUpdatedBy', 'name')
        .sort('name')
        .lean();

      await CacheService.set(cacheKey, methods, 300); // Cache for 5 minutes
    }

    return methods;
  }

  static async getMethodById(id) {
    const cacheKey = `exchange-methods:${id}`;
    let method = await CacheService.get(cacheKey);

    if (!method) {
      method = await ExchangeMethod.findById(id)
        .populate('lastUpdatedBy', 'name')
        .lean();

      if (method) {
        await CacheService.set(cacheKey, method, 300);
      }
    }

    return method;
  }
}

module.exports = ExchangeMethodService; 