import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (process.env.NODE_ENV === 'test') {
      return null; // Disable reconnect loops in test mode
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

let redisClient = null;

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    redisClient.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis] Connection error (${err.message}). Queue operations will retry.`);
      }
    });
    redisClient.on('connect', () => {
      console.log(`[Redis] Connected successfully to ${REDIS_HOST}:${REDIS_PORT}`);
    });
  }
  return redisClient;
};

export default getRedisClient;
