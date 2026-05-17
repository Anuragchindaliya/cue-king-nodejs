import Redis from 'ioredis';

// const redisHost = process.env.REDIS_HOST || '127.0.0.1';
// const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
// const redisPassword = process.env.REDIS_PASSWORD || undefined;
// const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';


const redisClient = new Redis(redisUrl);
// const redisClient = new Redis({
//   host: redisHost,
//   port: redisPort,
//   password: redisPassword,
// });


redisClient.on('connect', () => {
  console.log('🔗 Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redisClient;
