import { Response } from 'express';
import Redis from 'ioredis';
import logger from '../utils/logger';
import redisClient from '../config/redisClient';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Local connection pools
const userClients = new Map<string, Response[]>();
const lobbyClients = new Map<string, Response[]>();

// Initialize Redis Subscriber Client
let redisSubscriber: Redis | null = null;

export const initSSEService = () => {
  if (redisSubscriber) return;

  redisSubscriber = new Redis(redisUrl);

  redisSubscriber.on('connect', () => {
    logger.info('🔗 Redis SSE Subscriber connected');
  });

  redisSubscriber.on('error', (err) => {
    logger.error('Redis SSE Subscriber connection error:', err);
  });

  // Subscribe to channels
  redisSubscriber.subscribe('sse:notifications', 'sse:lobbies', (err) => {
    if (err) {
      logger.error('Failed to subscribe to Redis SSE channels:', err);
    } else {
      logger.info('Subscribed to Redis SSE channels: sse:notifications, sse:lobbies');
    }
  });

  // Handle incoming Redis pub/sub messages
  redisSubscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'sse:notifications') {
        const { userId, event, payload } = data;
        sendToUserLocal(userId, event, payload);
      } else if (channel === 'sse:lobbies') {
        const { lobbyId, event, payload } = data;
        sendToLobbyLocal(lobbyId, event, payload);
      }
    } catch (err) {
      logger.error('Error parsing SSE pub/sub message:', err);
    }
  });
};

// Register a user's notification SSE stream
export const registerUserClient = (userId: string, res: Response) => {
  if (!userClients.has(userId)) {
    userClients.set(userId, []);
  }
  userClients.get(userId)!.push(res);
  logger.info(`SSE: Registered user client for notifications (User: ${userId}). Total active: ${userClients.get(userId)!.length}`);
};

// Unregister a user's notification SSE stream
export const unregisterUserClient = (userId: string, res: Response) => {
  const clients = userClients.get(userId);
  if (clients) {
    const updated = clients.filter(c => c !== res);
    if (updated.length === 0) {
      userClients.delete(userId);
    } else {
      userClients.set(userId, updated);
    }
  }
  logger.info(`SSE: Unregistered user client for notifications (User: ${userId})`);
};

// Register a client to a specific lobby event stream
export const registerLobbyClient = (lobbyId: string, res: Response) => {
  if (!lobbyClients.has(lobbyId)) {
    lobbyClients.set(lobbyId, []);
  }
  lobbyClients.get(lobbyId)!.push(res);
  logger.info(`SSE: Registered client to lobby stream (Lobby: ${lobbyId}). Total active: ${lobbyClients.get(lobbyId)!.length}`);
};

// Unregister a client from a specific lobby event stream
export const unregisterLobbyClient = (lobbyId: string, res: Response) => {
  const clients = lobbyClients.get(lobbyId);
  if (clients) {
    const updated = clients.filter(c => c !== res);
    if (updated.length === 0) {
      lobbyClients.delete(lobbyId);
    } else {
      lobbyClients.set(lobbyId, updated);
    }
  }
  logger.info(`SSE: Unregistered client from lobby stream (Lobby: ${lobbyId})`);
};

// Send message to locally connected notification streams for a user
const sendToUserLocal = (userId: string, event: string, payload: any) => {
  const clients = userClients.get(userId);
  if (!clients) return;

  const dataStr = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(dataStr);
    } catch (err) {
      logger.error(`Error writing notification SSE to user ${userId}:`, err);
    }
  });
};

// Send message to locally connected lobby event streams for a lobby ID
const sendToLobbyLocal = (lobbyId: string, event: string, payload: any) => {
  const clients = lobbyClients.get(lobbyId);
  if (!clients) return;

  const dataStr = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(dataStr);
    } catch (err) {
      logger.error(`Error writing lobby SSE to lobby ${lobbyId}:`, err);
    }
  });
};

// Publish a notification event to Redis (so all server nodes can forward it)
export const publishNotification = async (userId: string, event: string, payload: any) => {
  try {
    const message = JSON.stringify({ userId, event, payload });
    await redisClient.publish('sse:notifications', message);
  } catch (err) {
    logger.error('Failed to publish notification to Redis SSE:', err);
    // Fallback to local send if Redis fails
    sendToUserLocal(userId, event, payload);
  }
};

// Publish a lobby update to Redis (so all server nodes can forward it)
export const publishLobbyUpdate = async (lobbyId: string, event: string, payload: any) => {
  try {
    const message = JSON.stringify({ lobbyId, event, payload });
    await redisClient.publish('sse:lobbies', message);
  } catch (err) {
    logger.error('Failed to publish lobby update to Redis SSE:', err);
    // Fallback to local send if Redis fails
    sendToLobbyLocal(lobbyId, event, payload);
  }
};

// Helper: Setup SSE Headers on Response object
export const setupSSEHeaders = (res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for Nginx
  });
  // Flush headers immediately
  res.flushHeaders();
};

// Helper: Start connection keepalive/heartbeat interval
export const startHeartbeat = (res: Response): NodeJS.Timeout => {
  return setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      // Handled by close listener
    }
  }, 20000); // 20 seconds heartbeat
};
