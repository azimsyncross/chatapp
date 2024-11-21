const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/roles');
const router = express.Router();
const ExchangeMethodController = require('../controllers/exchangeMethod.controller');
const uploadService = require('../services/upload.service');

// Admin routes
router.post('/',
  verifyToken,
  checkRole(ROLES.ADMIN),
  uploadService.getUploadMiddleware(),
  ExchangeMethodController.createMethod
);

router.put('/:id',
  verifyToken,
  checkRole(ROLES.ADMIN),
  uploadService.getUploadMiddleware(),
  ExchangeMethodController.updateMethod
);

router.delete('/:id',
  verifyToken,
  checkRole(ROLES.ADMIN),
  ExchangeMethodController.deleteMethod
);

// Public routes
router.get('/', ExchangeMethodController.getAllMethods);
router.get('/:id', ExchangeMethodController.getMethodById);

module.exports = router; 