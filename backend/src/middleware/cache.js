const redis = require('redis');

// Redis client setup
let client = null;

const initializeRedis = async () => {
  try {
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    await client.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Cache middleware
const cacheMiddleware = (duration = 300, keyPrefix = 'api') => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis is not available
    if (!client || !client.isOpen) {
      return next();
    }

    const key = `${keyPrefix}:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      
      if (cached) {
        console.log(`Cache hit for ${key}`);
        const data = JSON.parse(cached);
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${duration}`
        });
        
        return res.json(data);
      }

      // Store original json function
      const originalJson = res.json;
      
      // Override json function to cache response
      res.json = function(body) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          client.setEx(key, duration, JSON.stringify(body))
            .catch(err => console.error('Cache set error:', err));
        }
        
        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'Cache-Control': `public, max-age=${duration}`
        });
        
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation helpers
const invalidateCache = async (pattern) => {
  if (!client || !client.isOpen) return;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

const invalidateWeatherCache = () => invalidateCache('api:*/weather/*');
const invalidateRainbowCache = () => invalidateCache('api:*/rainbow*');
const invalidatePredictionCache = () => invalidateCache('api:*/predictions*');

// Graceful shutdown
const closeRedis = async () => {
  if (client && client.isOpen) {
    await client.quit();
    console.log('Redis connection closed');
  }
};

module.exports = {
  initializeRedis,
  cacheMiddleware,
  invalidateCache,
  invalidateWeatherCache,
  invalidateRainbowCache,
  invalidatePredictionCache,
  closeRedis
};