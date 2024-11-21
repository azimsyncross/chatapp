const ApiResponse = require('../utils/response');

const notFoundHandler = (req, res, next) => {
  ApiResponse.error(res, 'Resource not found', 404);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  ApiResponse.error(res, message, statusCode, err.errors);
};

module.exports = {
  notFoundHandler,
  errorHandler
}; 