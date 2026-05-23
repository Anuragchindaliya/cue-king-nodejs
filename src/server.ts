import 'dotenv/config';
import http from 'http';
import app from './app';
import logger from './utils/logger';
import prisma from './config/db';
import { initTelegramBot } from './services/notification.service';
import { initCloudinary } from './config/cloudinary.config';
import { initSocket } from './config/socket';
import { initSSEService } from './services/sse.service';
import { startReminderScheduler } from './services/reminder.scheduler';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Connect to database (Prisma handles this automatically on first query, but good to test)
    await prisma.$connect();
    logger.info('Connected to PostgreSQL Database');

    // Initialize Cloudinary SDK
    initCloudinary();
    logger.info('Cloudinary SDK initialized');

    // Initialize telegram bot
    initTelegramBot();

    // Initialize SSE Service (Redis Pub/Sub subscription)
    initSSEService();
    logger.info('SSE Service (Redis Pub/Sub) initialized');

    // Start background reminders
    startReminderScheduler();

    // Create HTTP Server
    const server = http.createServer(app);

    // Initialize Socket.io
    initSocket(server);
    logger.info('Socket.IO initialized');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
