const http = require('http');
const app = require('./app');
const connectDB = require('./configs/database');
const SocketConfig = require('./configs/socket');
const { PORT } = require('./configs/variables');

// Create HTTP server
const server = http.createServer(app);

// Connect to Database
connectDB();

// Initialize Socket.IO
const socketConfig = new SocketConfig(server);

// Export socket instance for use in other files
global.io = socketConfig.io;

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
