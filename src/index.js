const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const AWS = require('aws-sdk');
const http = require('http');
const socketIO = require('socket.io');
const socketinstance = require('./utils/socketio')

let server;

mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');

  // Create HTTP server and initialize Socket.IO
  const httpServer = http.createServer(app);
  io = socketIO(httpServer, {
    cors: {
      origin: "*"
    }
  });
  socketinstance.setIO(io);
  // Socket.IO connection event
  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // socket.on('disconnect', () => {
    //   console.log('Client disconnected');
    //   // Remove the disconnected client from connections
    //   for (const [userId, socketId] of Object.entries(socketinstance.getConnections())) {
    //     if (socketId === socket.id) {
    //       socketinstance.deleteConnections(userId)
    //       break;
    //     }
    //   }
    // });

    // Add more socket event listeners here
    socket.on('userdetails', ({ id }) => {
      socketinstance.setConnections(id, socket.id)
    });
  });
  server = httpServer.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCES_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

const getConnections = () => {
  return connections
}
const getIO = () => {
  return io
}

module.exports = { getConnections, getIO }