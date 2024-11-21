const express = require('express');
const cors = require('cors');
const passport = require('./configs/passport');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const passwordRoutes = require('./routes/password.routes');
const exchangeMethodRoutes = require('./routes/exchangeMethod.routes');
const orderRoutes = require('./routes/order.routes');
const monitoringRoutes = require('./routes/monitoring.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/exchange-methods', exchangeMethodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app; 