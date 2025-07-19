const MockPool = require('./mock-database');

// Use mock database for testing
const mockPool = new MockPool();

// Override the database module
jest.doMock('../src/config/database', () => mockPool);

// Test database setup and teardown
beforeAll(async () => {
  // Setup mock database
  try {
    // Create mock tables
    await mockPool.query(`CREATE TABLE IF NOT EXISTS users`);
    await mockPool.query(`CREATE TABLE IF NOT EXISTS user_locations`);
    await mockPool.query(`CREATE TABLE IF NOT EXISTS rainbow_sightings`);
    await mockPool.query(`CREATE OR REPLACE FUNCTION calculate_distance`);

    console.log('✅ Mock database setup completed');
  } catch (error) {
    console.error('❌ Mock database setup failed:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Clean up test data before each test
  try {
    await mockPool.query('DELETE FROM rainbow_sightings');
    await mockPool.query('DELETE FROM user_locations');
    await mockPool.query('DELETE FROM users');
    
    // Reset sequences
    await mockPool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await mockPool.query('ALTER SEQUENCE rainbow_sightings_id_seq RESTART WITH 1');
    await mockPool.query('ALTER SEQUENCE user_locations_id_seq RESTART WITH 1');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

afterAll(async () => {
  // Close database connection after all tests
  try {
    await mockPool.end();
    console.log('✅ Mock database connection closed');
  } catch (error) {
    console.error('❌ Error closing mock database connection:', error);
  }
});

module.exports = mockPool;