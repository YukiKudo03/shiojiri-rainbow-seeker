const { logger } = require('../utils/logger');

// Simple metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        by_endpoint: {},
        by_status_code: {},
        response_time: []
      },
      rainbow: {
        sightings_created: 0,
        predictions_requested: 0,
        uploads_processed: 0
      },
      auth: {
        logins_successful: 0,
        logins_failed: 0,
        registrations: 0
      },
      cache: {
        hits: 0,
        misses: 0
      },
      errors: {
        total: 0,
        by_type: {}
      }
    };
    
    this.startTime = Date.now();
  }

  // Record HTTP request metrics
  recordRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    // Track by endpoint
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    this.metrics.requests.by_endpoint[endpoint] = 
      (this.metrics.requests.by_endpoint[endpoint] || 0) + 1;
    
    // Track by status code
    this.metrics.requests.by_status_code[res.statusCode] = 
      (this.metrics.requests.by_status_code[res.statusCode] || 0) + 1;
    
    // Track response time (keep last 100 measurements)
    this.metrics.requests.response_time.push(responseTime);
    if (this.metrics.requests.response_time.length > 100) {
      this.metrics.requests.response_time.shift();
    }
  }

  // Record business metrics
  recordRainbowSighting() {
    this.metrics.rainbow.sightings_created++;
  }

  recordPredictionRequest() {
    this.metrics.rainbow.predictions_requested++;
  }

  recordImageUpload() {
    this.metrics.rainbow.uploads_processed++;
  }

  recordLogin(success) {
    if (success) {
      this.metrics.auth.logins_successful++;
    } else {
      this.metrics.auth.logins_failed++;
    }
  }

  recordRegistration() {
    this.metrics.auth.registrations++;
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  recordError(errorType) {
    this.metrics.errors.total++;
    this.metrics.errors.by_type[errorType] = 
      (this.metrics.errors.by_type[errorType] || 0) + 1;
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const responseTimeStats = this.calculateResponseTimeStats();
    
    return {
      uptime_seconds: Math.floor(uptime / 1000),
      requests: {
        ...this.metrics.requests,
        rate_per_minute: (this.metrics.requests.total / (uptime / 60000)).toFixed(2),
        response_time_stats: responseTimeStats
      },
      rainbow: this.metrics.rainbow,
      auth: {
        ...this.metrics.auth,
        login_success_rate: this.calculateSuccessRate(
          this.metrics.auth.logins_successful,
          this.metrics.auth.logins_failed
        )
      },
      cache: {
        ...this.metrics.cache,
        hit_rate: this.calculateHitRate()
      },
      errors: this.metrics.errors,
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };
  }

  calculateResponseTimeStats() {
    if (this.metrics.requests.response_time.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0 };
    }

    const times = this.metrics.requests.response_time.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = times[0];
    const max = times[times.length - 1];
    const p95Index = Math.floor(times.length * 0.95);
    const p95 = times[p95Index] || max;

    return {
      avg: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      p95: Math.round(p95)
    };
  }

  calculateSuccessRate(success, failed) {
    const total = success + failed;
    return total > 0 ? ((success / total) * 100).toFixed(2) : 0;
  }

  calculateHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? ((this.metrics.cache.hits / total) * 100).toFixed(2) : 0;
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics = {
      requests: { total: 0, by_endpoint: {}, by_status_code: {}, response_time: [] },
      rainbow: { sightings_created: 0, predictions_requested: 0, uploads_processed: 0 },
      auth: { logins_successful: 0, logins_failed: 0, registrations: 0 },
      cache: { hits: 0, misses: 0 },
      errors: { total: 0, by_type: {} }
    };
    this.startTime = Date.now();
  }
}

// Global metrics instance
const metricsCollector = new MetricsCollector();

// Middleware to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override end method to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req, res, responseTime);
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    // Format as Prometheus-style metrics if requested
    if (req.query.format === 'prometheus') {
      const prometheusMetrics = formatPrometheusMetrics(metrics);
      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } else {
      res.json({
        success: true,
        data: metrics
      });
    }
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate metrics' }
    });
  }
};

// Format metrics for Prometheus
const formatPrometheusMetrics = (metrics) => {
  const lines = [];
  
  // Request metrics
  lines.push(`# HELP http_requests_total Total number of HTTP requests`);
  lines.push(`# TYPE http_requests_total counter`);
  lines.push(`http_requests_total ${metrics.requests.total}`);
  
  lines.push(`# HELP http_request_duration_seconds HTTP request duration`);
  lines.push(`# TYPE http_request_duration_seconds histogram`);
  lines.push(`http_request_duration_seconds_sum ${metrics.requests.response_time_stats.avg * metrics.requests.total / 1000}`);
  lines.push(`http_request_duration_seconds_count ${metrics.requests.total}`);
  
  // Business metrics
  lines.push(`# HELP rainbow_sightings_total Total number of rainbow sightings`);
  lines.push(`# TYPE rainbow_sightings_total counter`);
  lines.push(`rainbow_sightings_total ${metrics.rainbow.sightings_created}`);
  
  lines.push(`# HELP predictions_total Total number of predictions requested`);
  lines.push(`# TYPE predictions_total counter`);
  lines.push(`predictions_total ${metrics.rainbow.predictions_requested}`);
  
  // Auth metrics
  lines.push(`# HELP auth_logins_total Total number of login attempts`);
  lines.push(`# TYPE auth_logins_total counter`);
  lines.push(`auth_logins_total{status="success"} ${metrics.auth.logins_successful}`);
  lines.push(`auth_logins_total{status="failed"} ${metrics.auth.logins_failed}`);
  
  // Cache metrics
  lines.push(`# HELP cache_operations_total Total number of cache operations`);
  lines.push(`# TYPE cache_operations_total counter`);
  lines.push(`cache_operations_total{result="hit"} ${metrics.cache.hits}`);
  lines.push(`cache_operations_total{result="miss"} ${metrics.cache.misses}`);
  
  // System metrics
  lines.push(`# HELP process_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE process_uptime_seconds counter`);
  lines.push(`process_uptime_seconds ${metrics.uptime_seconds}`);
  
  lines.push(`# HELP process_memory_bytes Process memory usage in bytes`);
  lines.push(`# TYPE process_memory_bytes gauge`);
  lines.push(`process_memory_bytes{type="rss"} ${metrics.memory.rss}`);
  lines.push(`process_memory_bytes{type="heapUsed"} ${metrics.memory.heapUsed}`);
  lines.push(`process_memory_bytes{type="heapTotal"} ${metrics.memory.heapTotal}`);
  
  return lines.join('\n') + '\n';
};

module.exports = {
  metricsCollector,
  metricsMiddleware,
  metricsEndpoint
};