require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import custom middleware and utilities
const { initializeRedis, cacheMiddleware, closeRedis } = require('./middleware/cache');
const { logger, requestLogger, securityLogger } = require('./utils/logger');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

// Import routes
const rainbowRoutes = require('./routes/rainbow');
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const notificationRoutes = require('./routes/notification');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced rate limiting with security logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // More strict limit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    securityLogger.logRateLimitExceeded(req);
    res.status(429).json({
      success: false,
      error: { 
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      }
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS with more specific configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
app.use(requestLogger);

// Metrics middleware
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(limiter);

// Health check endpoint (before cache middleware)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Cache middleware for API routes
app.use('/api/weather', cacheMiddleware(300, 'weather')); // 5 minutes cache
app.use('/api/rainbow', cacheMiddleware(60, 'rainbow')); // 1 minute cache for dynamic data

// API routes
app.use('/api/rainbow', rainbowRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/notification', notificationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
// Initialize Redis and start server
const startServer = async () => {
  try {
    // Initialize Redis connection
    await initializeRedis();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.warn('Redis initialization failed, continuing without cache', { error: error.message });
  }

  // Only start server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
      logger.info(`🌈 Shiojiri Rainbow Seeker API server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closeRedis();
          logger.info('Redis connection closed');
        } catch (error) {
          logger.error('Error closing Redis connection', { error: error.message });
        }
        
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
};

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});

module.exports = app;