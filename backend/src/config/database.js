const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shiojiri_rainbow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 25, // Increased for better concurrency
  min: 2, // Minimum connections to maintain
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout
  acquireTimeoutMillis: 60000, // New: timeout for acquiring connection
  statement_timeout: 30000, // New: query timeout
  query_timeout: 30000, // Query timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Test database connection
pool.on('connect', () => {
  console.log('🗄️  Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;