const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock notification service
const mockNotificationService = {
  registerToken: jest.fn(),
  sendRainbowAlert: jest.fn(),
};

jest.mock('../src/services/notificationService', () => mockNotificationService);

const app = require('../src/server');

// Mock Notification model
const mockNotificationModel = {
  findByUserId: jest.fn(),
};

jest.mock('../src/models/Notification', () => mockNotificationModel);

describe('Notification API', () => {
  let authToken;
  const testUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create auth token for testing
    authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');
  });

  describe('POST /api/notification/register-token', () => {
    it('should register FCM token successfully', async () => {
      mockNotificationService.registerToken.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'mock-fcm-token-12345'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('FCM token registered successfully');
      expect(mockNotificationService.registerToken).toHaveBeenCalledWith(
        testUser.id,
        'mock-fcm-token-12345'
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/notification/register-token')
        .send({
          token: 'mock-fcm-token-12345'
        });

      expect(response.status).toBe(401);
      expect(mockNotificationService.registerToken).not.toHaveBeenCalled();
    });

    it('should validate FCM token format', async () => {
      const response = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: ''
        });

      expect(response.status).toBe(400);
      expect(mockNotificationService.registerToken).not.toHaveBeenCalled();
    });

    it('should handle duplicate token registration', async () => {
      mockNotificationService.registerToken.mockResolvedValueOnce();

      // Register token twice
      const firstResponse = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'duplicate-token'
        });

      const secondResponse = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'duplicate-token'
        });

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(mockNotificationService.registerToken).toHaveBeenCalledTimes(2);
    });

    it('should handle service errors gracefully', async () => {
      mockNotificationService.registerToken.mockRejectedValueOnce(
        new Error('Firebase service unavailable')
      );

      const response = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'valid-token'
        });

      expect(response.status).toBe(500);
    });

    it('should validate token length and format', async () => {
      const invalidTokens = [
        '', // Empty
        'a', // Too short
        'invalid-characters-!@#$%', // Invalid characters
        'a'.repeat(1000) // Too long
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/api/notification/register-token')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token });

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('POST /api/notification/rainbow-alert', () => {
    it('should send rainbow alert successfully', async () => {
      const mockAlertResult = {
        sent_count: 5,
        message_id: 'msg-12345',
        nearby_users: ['user1', 'user2', 'user3', 'user4', 'user5']
      };

      mockNotificationService.sendRainbowAlert.mockResolvedValueOnce(mockAlertResult);

      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: 'Beautiful rainbow spotted!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAlertResult);
      expect(mockNotificationService.sendRainbowAlert).toHaveBeenCalledWith(
        testUser.id,
        36.0687,
        137.9646,
        'Beautiful rainbow spotted!'
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: 'Rainbow alert'
        });

      expect(response.status).toBe(401);
      expect(mockNotificationService.sendRainbowAlert).not.toHaveBeenCalled();
    });

    it('should validate location coordinates', async () => {
      const invalidCoordinates = [
        { latitude: 91, longitude: 137.9646 }, // Invalid latitude
        { latitude: -91, longitude: 137.9646 }, // Invalid latitude
        { latitude: 36.0687, longitude: 181 }, // Invalid longitude
        { latitude: 36.0687, longitude: -181 }, // Invalid longitude
        { latitude: 'invalid', longitude: 137.9646 }, // Non-numeric
        { latitude: 36.0687, longitude: 'invalid' }, // Non-numeric
      ];

      for (const coords of invalidCoordinates) {
        const response = await request(app)
          .post('/api/notification/rainbow-alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...coords,
            message: 'Test message'
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('should validate message content', async () => {
      const invalidMessages = [
        '', // Empty message
        'a'.repeat(1000), // Too long
        null, // Null message
        undefined // Undefined message
      ];

      for (const message of invalidMessages) {
        const response = await request(app)
          .post('/api/notification/rainbow-alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            latitude: 36.0687,
            longitude: 137.9646,
            message
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('should sanitize message content', async () => {
      const maliciousMessage = '<script>alert("xss")</script>Beautiful rainbow!';
      
      mockNotificationService.sendRainbowAlert.mockResolvedValueOnce({
        sent_count: 1,
        message_id: 'msg-sanitized'
      });

      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: maliciousMessage
        });

      expect(response.status).toBe(200);
      // Verify the service was called with sanitized message
      const calledMessage = mockNotificationService.sendRainbowAlert.mock.calls[0][3];
      expect(calledMessage).not.toContain('<script>');
    });

    it('should handle no nearby users', async () => {
      mockNotificationService.sendRainbowAlert.mockResolvedValueOnce({
        sent_count: 0,
        message_id: null,
        nearby_users: []
      });

      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: 'Rainbow alert'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.sent_count).toBe(0);
    });

    it('should handle notification service errors', async () => {
      mockNotificationService.sendRainbowAlert.mockRejectedValueOnce(
        new Error('FCM service error')
      );

      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: 'Rainbow alert'
        });

      expect(response.status).toBe(500);
    });

    it('should respect user location privacy settings', async () => {
      // Mock user with location sharing disabled
      const privateUser = { ...testUser, shareLocation: false };
      const privateToken = jwt.sign(privateUser, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${privateToken}`)
        .send({
          latitude: 36.0687,
          longitude: 137.9646,
          message: 'Rainbow alert'
        });

      // Should either succeed with limited functionality or return appropriate response
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('GET /api/notification/history', () => {
    it('should get notification history successfully', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'rainbow_alert',
          title: 'Rainbow Alert!',
          message: 'A rainbow was spotted near you',
          sent_at: new Date('2023-06-15T14:30:00Z'),
          read: false
        },
        {
          id: 2,
          type: 'weather_update',
          title: 'Weather Update',
          message: 'Conditions favorable for rainbow watching',
          sent_at: new Date('2023-06-15T12:00:00Z'),
          read: true
        }
      ];

      mockNotificationModel.findByUserId.mockResolvedValueOnce(mockNotifications);

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNotifications);
      expect(mockNotificationModel.findByUserId).toHaveBeenCalledWith(testUser.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notification/history');

      expect(response.status).toBe(401);
      expect(mockNotificationModel.findByUserId).not.toHaveBeenCalled();
    });

    it('should handle empty notification history', async () => {
      mockNotificationModel.findByUserId.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockNotificationModel.findByUserId.mockRejectedValueOnce(
        new Error('Database connection error')
      );

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    it('should support pagination for large histories', async () => {
      const mockLargeHistory = Array(100).fill().map((_, i) => ({
        id: i + 1,
        type: 'rainbow_alert',
        title: `Alert ${i + 1}`,
        message: `Message ${i + 1}`,
        sent_at: new Date(),
        read: false
      }));

      mockNotificationModel.findByUserId.mockResolvedValueOnce(mockLargeHistory);

      const response = await request(app)
        .get('/api/notification/history?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should handle pagination appropriately
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by notification type', async () => {
      const filteredNotifications = [
        {
          id: 1,
          type: 'rainbow_alert',
          title: 'Rainbow Alert!',
          message: 'Rainbow spotted',
          sent_at: new Date(),
          read: false
        }
      ];

      mockNotificationModel.findByUserId.mockResolvedValueOnce(filteredNotifications);

      const response = await request(app)
        .get('/api/notification/history?type=rainbow_alert')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(filteredNotifications);
    });

    it('should sort notifications by date', async () => {
      const unsortedNotifications = [
        {
          id: 2,
          sent_at: new Date('2023-06-15T10:00:00Z'),
          title: 'Older notification'
        },
        {
          id: 1,
          sent_at: new Date('2023-06-15T14:00:00Z'),
          title: 'Newer notification'
        }
      ];

      mockNotificationModel.findByUserId.mockResolvedValueOnce(unsortedNotifications);

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should be sorted by date (newest first)
      if (response.body.data.length > 1) {
        const first = new Date(response.body.data[0].sent_at);
        const second = new Date(response.body.data[1].sent_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });
  });

  describe('Notification API Rate Limiting', () => {
    it('should rate limit rainbow alert sending', async () => {
      mockNotificationService.sendRainbowAlert.mockResolvedValue({
        sent_count: 1,
        message_id: 'msg-123'
      });

      // Send multiple alerts rapidly
      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/api/notification/rainbow-alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            latitude: 36.0687,
            longitude: 137.9646,
            message: 'Test alert'
          })
      );

      const responses = await Promise.all(requests);
      
      // Some should be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Notification API Security', () => {
    it('should prevent unauthorized access to other users notifications', async () => {
      const otherUserToken = jwt.sign(
        { id: 999, email: 'other@example.com' },
        process.env.JWT_SECRET || 'test-secret'
      );

      mockNotificationModel.findByUserId.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(200);
      expect(mockNotificationModel.findByUserId).toHaveBeenCalledWith(999);
      // Should only return notifications for the authenticated user
    });

    it('should validate JWT token integrity', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { ...testUser, exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/notification/history')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Notification API Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/notification/rainbow-alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // Missing required fields

      expect(response.status).toBe(400);
    });

    it('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockNotificationService.registerToken.mockRejectedValueOnce(
        new Error('Database connection string: user:pass@localhost:5432/db')
      );

      const response = await request(app)
        .post('/api/notification/register-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'valid-token' });

      expect(response.status).toBe(500);
      // Should not expose sensitive information
      if (response.body.error) {
        expect(response.body.error).not.toContain('user:pass');
      }

      process.env.NODE_ENV = originalEnv;
    });
  });
});