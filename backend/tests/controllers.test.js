const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock User model for authentication
const mockUser = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

// Mock Rainbow model
const mockRainbow = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findNearby: jest.fn(),
};

// Mock Weather Service
const mockWeatherService = {
  getCurrentWeather: jest.fn(),
  getForecast: jest.fn(),
};

// Mock Notification Service
const mockNotificationService = {
  subscribeToNotifications: jest.fn(),
  sendNotification: jest.fn(),
  initialize: jest.fn(),
};

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../src/models/User', () => mockUser);
jest.mock('../src/models/Rainbow', () => mockRainbow);
jest.mock('../src/services/weatherService', () => mockWeatherService);
jest.mock('../src/services/notificationService', () => mockNotificationService);

const app = require('../src/server');

// Helper function to create auth token
const createAuthToken = (userId) => {
  return jwt.sign({ 
    id: userId,
    userId: userId,
    email: 'test@example.com'
  }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

describe('Controller Tests', () => {
  describe('Rainbow Controller', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Setup default mocks
      const bcrypt = require('bcryptjs');
      
      // User mocks
      mockUser.findById.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      });
      
      // Rainbow mocks
      mockRainbow.findAll.mockResolvedValue([
        {
          id: 1,
          title: 'Beautiful Rainbow',
          description: 'Test description',
          latitude: 36.2048,
          longitude: 138.2529,
          intensity: 8,
          created_at: new Date(),
          user_id: 1
        }
      ]);
      
      bcrypt.hash.mockResolvedValue('hashedpassword123');
      bcrypt.compare.mockResolvedValue(true);
    });

    describe('GET /api/rainbow', () => {
      it('should get all rainbow sightings', async () => {
        const response = await request(app)
          .get('/api/rainbow');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].title).toBe('Beautiful Rainbow');
      });

      it('should handle empty results', async () => {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

        const response = await request(app)
          .get('/api/rainbow');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });

      it('should handle database errors', async () => {
        mockDatabase.query.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .get('/api/rainbow');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/rainbow/:id', () => {
      it('should get specific rainbow sighting', async () => {
        const rainbowData = {
          id: 1,
          title: 'Specific Rainbow',
          description: 'A specific rainbow sighting',
          latitude: 36.2048,
          longitude: 138.2529,
          intensity: 9,
          created_at: new Date(),
          user_id: 1
        };

        mockDatabase.query.mockResolvedValueOnce({
          rows: [rainbowData],
          rowCount: 1
        });

        const response = await request(app)
          .get('/api/rainbow/1');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
        expect(response.body.data.title).toBe('Specific Rainbow');
      });

      it('should return 404 for non-existent rainbow', async () => {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

        const response = await request(app)
          .get('/api/rainbow/999');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should validate ID parameter', async () => {
        const response = await request(app)
          .get('/api/rainbow/invalid-id');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/rainbow', () => {
      let authToken;

      beforeEach(() => {
        authToken = createAuthToken(1);
      });

      it('should create rainbow sighting with valid data', async () => {
        const newRainbow = {
          id: 1,
          title: 'New Rainbow',
          description: 'A newly created rainbow',
          latitude: 36.2048,
          longitude: 138.2529,
          intensity: 7,
          created_at: new Date(),
          user_id: 1
        };

        mockDatabase.query.mockResolvedValueOnce({
          rows: [newRainbow],
          rowCount: 1
        });

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${authToken}`)
          .field('title', 'New Rainbow')
          .field('description', 'A newly created rainbow')
          .field('latitude', '36.2048')
          .field('longitude', '138.2529')
          .field('intensity', '7')
          .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('New Rainbow');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/rainbow')
          .send(global.testUtils.validRainbow);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const invalidData = {
          title: 'Missing fields'
          // Missing latitude, longitude, intensity
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate coordinate ranges', async () => {
        const invalidCoordinates = {
          ...global.testUtils.validRainbow,
          latitude: 91, // Invalid latitude
          longitude: 181 // Invalid longitude
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidCoordinates);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate intensity range', async () => {
        const invalidIntensity = {
          ...global.testUtils.validRainbow,
          intensity: 11 // Intensity should be 1-10
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidIntensity);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/rainbow/nearby/:latitude/:longitude', () => {
      it('should get nearby rainbow sightings', async () => {
        const nearbyRainbows = [
          {
            id: 1,
            title: 'Nearby Rainbow 1',
            latitude: 36.2048,
            longitude: 138.2529,
            distance: 1.2
          },
          {
            id: 2,
            title: 'Nearby Rainbow 2',
            latitude: 36.2050,
            longitude: 138.2530,
            distance: 2.5
          }
        ];

        mockDatabase.query.mockResolvedValueOnce({
          rows: nearbyRainbows,
          rowCount: 2
        });

        const response = await request(app)
          .get('/api/rainbow/nearby/36.2048/138.2529');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].distance).toBeDefined();
      });

      it('should validate coordinate parameters', async () => {
        const response = await request(app)
          .get('/api/rainbow/nearby/invalid/invalid');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should handle distance parameter', async () => {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

        const response = await request(app)
          .get('/api/rainbow/nearby/36.2048/138.2529?distance=5');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Weather Controller', () => {
    beforeEach(() => {
      // Setup weather service mocks
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        temperature: 25.5,
        humidity: 65,
        pressure: 1013.25,
        description: 'Clear sky',
        location: { lat: 36.2048, lon: 138.2529 }
      });
      
      mockWeatherService.getForecast.mockResolvedValue([
        {
          date: '2025-07-20',
          temperature: { min: 20, max: 28 },
          humidity: 60,
          description: 'Partly cloudy'
        },
        {
          date: '2025-07-21', 
          temperature: { min: 22, max: 30 },
          humidity: 55,
          description: 'Sunny'
        }
      ]);
    });

    describe('GET /api/weather/current', () => {
      it('should get current weather data', async () => {
        const response = await request(app)
          .get('/api/weather/current?lat=36.2048&lon=138.2529');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('temperature');
        expect(response.body.data).toHaveProperty('humidity');
        expect(response.body.data).toHaveProperty('pressure');
      });

      it('should require latitude and longitude parameters', async () => {
        const response = await request(app)
          .get('/api/weather/current');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate coordinate parameters', async () => {
        const response = await request(app)
          .get('/api/weather/current?lat=invalid&lon=invalid');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/weather/forecast', () => {
      it('should get weather forecast', async () => {
        const response = await request(app)
          .get('/api/weather/forecast?lat=36.2048&lon=138.2529');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should handle days parameter', async () => {
        const response = await request(app)
          .get('/api/weather/forecast?lat=36.2048&lon=138.2529&days=3');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Notification Controller', () => {
    let authToken;

    beforeEach(() => {
      authToken = global.testUtils.createAuthToken(1);
    });

    describe('POST /api/notification/subscribe', () => {
      it('should subscribe to notifications', async () => {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, token: 'test-token' }],
          rowCount: 1
        });

        const subscriptionData = {
          deviceToken: 'test-device-token',
          platform: 'ios'
        };

        const response = await request(app)
          .post('/api/notification/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/notification/subscribe')
          .send({ deviceToken: 'test-token' });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/notification/send', () => {
      it('should send notification to user', async () => {
        mockDatabase.query.mockResolvedValueOnce({
          rows: [{ device_token: 'test-token' }],
          rowCount: 1
        });

        const notificationData = {
          userId: 1,
          title: 'Test Notification',
          message: 'This is a test notification'
        };

        const response = await request(app)
          .post('/api/notification/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send(notificationData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should validate notification data', async () => {
        const invalidData = {
          title: 'Missing message'
          // Missing message and userId
        };

        const response = await request(app)
          .post('/api/notification/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });
});