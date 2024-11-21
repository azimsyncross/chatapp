class SocketService {
  static async notifyUserLogin(userId, userData) {
    if (global.io) {
      // Notify all users about new login
      global.io.emit('user:login', {
        userId,
        name: userData.name,
        timestamp: new Date()
      });
    }
  }

  static async notifyModeratorAction(userId, action, moderatorData) {
    if (global.io) {
      // Notify specific user about moderator action
      global.io.to(userId.toString()).emit('moderator:action', {
        action,
        moderator: {
          id: moderatorData._id,
          name: moderatorData.name
        },
        timestamp: new Date()
      });
    }
  }

  static async notifyPasswordChange(userId) {
    if (global.io) {
      // Force disconnect all socket connections for this user
      const userSockets = await global.io.in(userId.toString()).fetchSockets();
      userSockets.forEach(socket => {
        socket.emit('auth:sessionExpired', {
          message: 'Password has been changed. Please login again.'
        });
        socket.disconnect(true);
      });
    }
  }
}

module.exports = SocketService; 