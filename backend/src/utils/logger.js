const winston = require('winston');
const path = require('path');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat,
  defaultMeta: { 
    service: 'shiojiri-rainbow-seeker-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat
    }),
    
    // Console output
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: jsonFormat
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: jsonFormat
    })
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log request details
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      requestId: req.id
    });
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.id
      });
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Database query logger
const dbLogger = {
  logQuery: (query, params, duration) => {
    logger.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params: params || [],
      duration: `${duration}ms`
    });
    
    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow Database Query', {
        query: query.replace(/\s+/g, ' ').trim(),
        duration: `${duration}ms`
      });
    }
  },
  
  logError: (error, query, params) => {
    logger.error('Database Error', {
      error: error.message,
      query: query?.replace(/\s+/g, ' ').trim(),
      params: params || [],
      stack: error.stack
    });
  }
};

// Business logic logger
const businessLogger = {
  logRainbowSighting: (userId, location, filename) => {
    logger.info('Rainbow Sighting Posted', {
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
      filename,
      action: 'rainbow_sighting_created'
    });
  },
  
  logPredictionRequest: (location, prediction) => {
    logger.info('Prediction Requested', {
      latitude: location.latitude,
      longitude: location.longitude,
      probability: prediction.probability,
      confidence: prediction.confidence,
      action: 'prediction_requested'
    });
  },
  
  logUserRegistration: (userId, email) => {
    logger.info('User Registered', {
      userId,
      email,
      action: 'user_registered'
    });
  },
  
  logAuthFailure: (email, reason, ip) => {
    logger.warn('Authentication Failed', {
      email,
      reason,
      ip,
      action: 'auth_failed'
    });
  }
};

// Security logger
const securityLogger = {
  logSuspiciousActivity: (req, reason) => {
    logger.warn('Suspicious Activity Detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      reason,
      userId: req.user?.id,
      action: 'suspicious_activity'
    });
  },
  
  logRateLimitExceeded: (req) => {
    logger.warn('Rate Limit Exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      userId: req.user?.id,
      action: 'rate_limit_exceeded'
    });
  }
};

module.exports = {
  logger,
  requestLogger,
  dbLogger,
  businessLogger,
  securityLogger
};