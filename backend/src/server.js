require('dotenv').config();
const https = require('https');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const connectMongoDB = require('./config/mongodb');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const SocketHandler = require('./websocket/socketHandler');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;

connectMongoDB();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(apiLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Credora API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

let httpsServer;
try {
  const sslOptions = {
    key: fs.readFileSync('./ssl/private.key'),
    cert: fs.readFileSync('./ssl/certificate.crt')
  };
  httpsServer = https.createServer(sslOptions, app);
  console.log('✅ HTTPS enabled');
} catch (error) {
  console.warn('⚠️  SSL certificates not found, running HTTP only');
}

const io = new Server(httpsServer || app, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const socketHandler = new SocketHandler(io);
io.on('connection', (socket) => socketHandler.handleConnection(socket));

if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🚀 HTTPS Server running on port ${HTTPS_PORT}`);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 HTTP Server running on port ${PORT}`);
});

module.exports = app;