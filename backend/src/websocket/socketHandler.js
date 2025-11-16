const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { redisSub } = require('../config/redis');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map();
    this.setupAuthentication();
    this.setupRedisSubscription();
  }

  setupAuthentication() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.email = decoded.email;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupRedisSubscription() {
    redisSub.subscribe('transactions', (err) => {
      if (err) {
        console.error('Failed to subscribe:', err);
      } else {
        console.log('✅ Subscribed to Redis transactions channel');
      }
    });

    redisSub.on('message', (channel, message) => {
      if (channel === 'transactions') {
        try {
          const data = JSON.parse(message);
          this.handleTransactionEvent(data);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  async handleTransactionEvent(data) {
    const { type, fromAccountId, toAccountId, transaction } = data;

    if (type === 'new_transaction') {
      if (fromAccountId) {
        this.io.to(`account:${fromAccountId}`).emit('transaction:sent', {
          message: 'Transaction sent successfully',
          transaction
        });
      }

      if (toAccountId) {
        this.io.to(`account:${toAccountId}`).emit('transaction:received', {
          message: 'You received a payment',
          transaction
        });
      }
    }
  }

  handleConnection(socket) {
    console.log(`✅ User connected: ${socket.userId}`);
    this.userSockets.set(socket.userId, socket.id);

    socket.join(`user:${socket.userId}`);

    socket.emit('connected', {
      message: 'Connected to Credora real-time service',
      userId: socket.userId
    });

    socket.on('subscribe:balance', async (accountId) => {
      socket.join(`balance:${accountId}`);
    });

    socket.on('subscribe:transactions', (accountId) => {
      socket.join(`account:${accountId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      this.userSockets.delete(socket.userId);
    });
  }
}

module.exports = SocketHandler;