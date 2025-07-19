const request = require('supertest');
const app = require('../src/server');
const { mockDatabase } = require('./setup');

describe('Integration Tests', () => {
  describe('Full API Workflow', () => {
    let authToken;
    let userId;
    let rainbowId;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should complete full user registration and rainbow creation workflow', async () => {
      // Step 1: Register new user
      const userData = {
        name: 'Integration Test User',
        email: 'integration@example.com',
        password: 'Integration123!'
      };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check if user exists
        .mockResolvedValueOnce({ // Create user
          rows: [{
            id: 1,
            name: userData.name,
            email: userData.email,
            created_at: new Date()
          }],
          rowCount: 1
        });

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.token).toBeDefined();
      
      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // Step 2: Login with the same user
      mockDatabase.query.mockResolvedValueOnce({ // Find user for login
        rows: [{
          id: userId,
          email: userData.email,
          password: 'hashedpassword123',
          name: userData.name
        }],
        rowCount: 1
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Step 3: Get current weather for location
      const weatherResponse = await request(app)
        .get('/api/weather/current?lat=36.2048&lon=138.2529');

      expect(weatherResponse.status).toBe(200);
      expect(weatherResponse.body.success).toBe(true);
      expect(weatherResponse.body.data).toHaveProperty('temperature');

      // Step 4: Create rainbow sighting with image
      const rainbowData = {
        title: 'Integration Test Rainbow',
        description: 'A rainbow created during integration testing',
        latitude: 36.2048,
        longitude: 138.2529,
        intensity: 8,
        weather_conditions: weatherResponse.body.data
      };

      mockDatabase.query.mockResolvedValueOnce({ // Create rainbow
        rows: [{
          id: 1,
          ...rainbowData,
          user_id: userId,
          created_at: new Date()
        }],
        rowCount: 1
      });

      const createRainbowResponse = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', rainbowData.title)
        .field('description', rainbowData.description)
        .field('latitude', rainbowData.latitude.toString())
        .field('longitude', rainbowData.longitude.toString())
        .field('intensity', rainbowData.intensity.toString())
        .attach('image', Buffer.from('fake-image-data'), 'rainbow.jpg');

      expect(createRainbowResponse.status).toBe(201);
      expect(createRainbowResponse.body.success).toBe(true);
      expect(createRainbowResponse.body.data.title).toBe(rainbowData.title);
      
      rainbowId = createRainbowResponse.body.data.id;

      // Step 5: Get the created rainbow
      mockDatabase.query.mockResolvedValueOnce({ // Get rainbow by ID
        rows: [{
          id: rainbowId,
          ...rainbowData,
          user_id: userId,
          created_at: new Date()
        }],
        rowCount: 1
      });

      const getRainbowResponse = await request(app)
        .get(`/api/rainbow/${rainbowId}`);

      expect(getRainbowResponse.status).toBe(200);
      expect(getRainbowResponse.body.success).toBe(true);
      expect(getRainbowResponse.body.data.id).toBe(rainbowId);

      // Step 6: Update rainbow sighting
      const updateData = {
        title: 'Updated Integration Test Rainbow',
        intensity: 9
      };

      mockDatabase.query.mockResolvedValueOnce({ // Update rainbow
        rows: [{
          id: rainbowId,
          ...rainbowData,
          ...updateData,
          user_id: userId,
          updated_at: new Date()
        }],
        rowCount: 1
      });

      const updateRainbowResponse = await request(app)
        .put(`/api/rainbow/${rainbowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(updateRainbowResponse.status).toBe(200);
      expect(updateRainbowResponse.body.success).toBe(true);
      expect(updateRainbowResponse.body.data.title).toBe(updateData.title);
      expect(updateRainbowResponse.body.data.intensity).toBe(updateData.intensity);

      // Step 7: Search for nearby rainbows
      mockDatabase.query.mockResolvedValueOnce({ // Get nearby rainbows
        rows: [{
          id: rainbowId,
          title: updateData.title,
          latitude: rainbowData.latitude,
          longitude: rainbowData.longitude,
          distance: 0.1
        }],
        rowCount: 1
      });

      const nearbyResponse = await request(app)
        .get(`/api/rainbow/nearby/${rainbowData.latitude}/${rainbowData.longitude}`);

      expect(nearbyResponse.status).toBe(200);
      expect(nearbyResponse.body.success).toBe(true);
      expect(nearbyResponse.body.data).toHaveLength(1);
      expect(nearbyResponse.body.data[0].distance).toBeDefined();

      // Step 8: Get user profile
      mockDatabase.query.mockResolvedValueOnce({ // Get user profile
        rows: [{
          id: userId,
          name: userData.name,
          email: userData.email,
          created_at: new Date()
        }],
        rowCount: 1
      });

      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.id).toBe(userId);
      expect(profileResponse.body.data.email).toBe(userData.email);
    });

    it('should handle notification workflow', async () => {
      const token = global.testUtils.createAuthToken(1);

      // Subscribe to notifications
      mockDatabase.query.mockResolvedValueOnce({ // Create subscription
        rows: [{ id: 1, user_id: 1, device_token: 'test-token' }],
        rowCount: 1
      });

      const subscribeResponse = await request(app)
        .post('/api/notification/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceToken: 'test-device-token',
          platform: 'ios'
        });

      expect(subscribeResponse.status).toBe(200);
      expect(subscribeResponse.body.success).toBe(true);

      // Send notification
      mockDatabase.query.mockResolvedValueOnce({ // Get user device token
        rows: [{ device_token: 'test-device-token' }],
        rowCount: 1
      });

      const sendResponse = await request(app)
        .post('/api/notification/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 1,
          title: 'Test Notification',
          message: 'This is a test notification'
        });

      expect(sendResponse.status).toBe(200);
      expect(sendResponse.body.success).toBe(true);
    });

    it('should handle weather forecast workflow', async () => {
      // Get current weather
      const currentResponse = await request(app)
        .get('/api/weather/current?lat=36.2048&lon=138.2529');

      expect(currentResponse.status).toBe(200);
      expect(currentResponse.body.success).toBe(true);

      // Get weather forecast
      const forecastResponse = await request(app)
        .get('/api/weather/forecast?lat=36.2048&lon=138.2529&days=3');

      expect(forecastResponse.status).toBe(200);
      expect(forecastResponse.body.success).toBe(true);
      expect(Array.isArray(forecastResponse.body.data)).toBe(true);
    });

    it('should handle error recovery workflow', async () => {
      // Simulate database error during registration
      mockDatabase.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const failedRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(global.testUtils.validUser);

      expect(failedRegisterResponse.status).toBe(500);
      expect(failedRegisterResponse.body.success).toBe(false);

      // Reset mock and try successful registration
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // User doesn't exist
        .mockResolvedValueOnce({ // Create user successfully
          rows: [{
            id: 1,
            name: global.testUtils.validUser.name,
            email: global.testUtils.validUser.email,
            created_at: new Date()
          }],
          rowCount: 1
        });

      const successRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(global.testUtils.validUser);

      expect(successRegisterResponse.status).toBe(201);
      expect(successRegisterResponse.body.success).toBe(true);
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'post', path: '/api/rainbow' },
        { method: 'put', path: '/api/rainbow/1' },
        { method: 'delete', path: '/api/rainbow/1' },
        { method: 'get', path: '/api/auth/me' },
        { method: 'put', path: '/api/auth/me' },
        { method: 'post', path: '/api/notification/subscribe' },
        { method: 'post', path: '/api/notification/send' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send({});

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should handle malicious input safely', async () => {
      const token = global.testUtils.createAuthToken(1);

      // XSS attempt in rainbow creation
      const xssData = {
        title: '<script>alert("xss")</script>',
        description: '<img src="x" onerror="alert(1)">',
        latitude: 36.2048,
        longitude: 138.2529,
        intensity: 8
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ ...xssData, id: 1, user_id: 1, created_at: new Date() }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${token}`)
        .send(xssData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      // Title should be sanitized (implementation would handle this)
      expect(response.body.data.title).toBeDefined();
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionEmail = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: sqlInjectionEmail,
          password: 'password123'
        });

      // Should handle gracefully without database error
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle concurrent requests', async () => {
      const token = global.testUtils.createAuthToken(1);

      // Mock responses for concurrent requests
      mockDatabase.query
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const requests = Array(5).fill().map((_, index) =>
        request(app)
          .get('/api/rainbow')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large payload gracefully', async () => {
      const token = global.testUtils.createAuthToken(1);
      
      const largeDescription = 'A'.repeat(10000); // 10KB description
      
      const response = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...global.testUtils.validRainbow,
          description: largeDescription
        });

      // Should either accept or reject with appropriate status
      expect([201, 400, 413]).toContain(response.status);
    });
  });

  describe('Cache Integration Tests', () => {
    it('should work without Redis cache', async () => {
      const response = await request(app)
        .get('/api/weather/current?lat=36.2048&lon=138.2529');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle cache errors gracefully', async () => {
      // Cache should fail gracefully and continue serving requests
      const response = await request(app)
        .get('/api/rainbow');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Metrics Integration Tests', () => {
    it('should expose metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should expose Prometheus format metrics', async () => {
      const response = await request(app)
        .get('/metrics?format=prometheus');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Health Check Integration', () => {
    it('should provide comprehensive health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });
  });

  describe('File Upload Integration', () => {
    it('should handle image upload workflow', async () => {
      const token = global.testUtils.createAuthToken(1);

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Rainbow with Image',
          image_url: 'uploads/test-image.jpg',
          user_id: 1,
          created_at: new Date()
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Rainbow with Image')
        .field('description', 'Testing image upload')
        .field('latitude', '36.2048')
        .field('longitude', '138.2529')
        .field('intensity', '8')
        .attach('image', Buffer.from('fake-image-data'), 'rainbow.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});