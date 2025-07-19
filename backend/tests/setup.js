// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
process.env.WEATHER_API_KEY = 'test-weather-key';

// Mock database module
const mockDatabase = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

jest.mock('../src/config/database', () => mockDatabase);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Global test setup
beforeAll(() => {
  // Reset database mock to default successful responses
  mockDatabase.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset database mock for each test
  mockDatabase.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

module.exports = { mockDatabase };