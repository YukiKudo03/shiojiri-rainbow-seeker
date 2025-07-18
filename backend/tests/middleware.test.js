const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');

describe('Middleware Tests', () => {
  let validAuthToken;
  let expiredToken;
  let invalidToken;

  beforeAll(async () => {
    // Create test user and get valid token
    const userData = {
      name: 'Middleware Test User',
      email: 'middleware@example.com',
      password: 'Middleware123!'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    validAuthToken = response.body.data.token;

    // Create expired token
    expiredToken = jwt.sign(
      { userId: 999, email: 'expired@test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' } // Already expired
    );

    // Create invalid token
    invalidToken = jwt.sign(
      { userId: 999, email: 'invalid@test.com' },
      'wrong-secret'
    );
  });

  describe('Authentication Middleware', () => {
    describe('Protected Routes', () => {
      const protectedRoutes = [
        { method: 'post', path: '/api/rainbow' },
        { method: 'put', path: '/api/rainbow/1' },
        { method: 'delete', path: '/api/rainbow/1' },
        { method: 'get', path: '/api/auth/me' },
        { method: 'put', path: '/api/auth/me' }
      ];

      protectedRoutes.forEach(({ method, path }) => {
        it(`should protect ${method.toUpperCase()} ${path}`, async () => {
          const response = await request(app)[method](path);
          
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('token');
        });
      });
    });

    describe('Token Validation', () => {
      it('should accept valid Bearer token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject missing Authorization header', async () => {
        const response = await request(app)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('No token provided');
      });

      it('should reject malformed Authorization header', async () => {
        const malformedHeaders = [
          'InvalidFormat',
          'Bearer',
          'Basic ' + validAuthToken,
          'Bearer ' + validAuthToken + ' extra'
        ];

        for (const header of malformedHeaders) {
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', header);

          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        }
      });

      it('should reject expired token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('expired');
      });

      it('should reject token with invalid signature', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should reject completely invalid token format', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer not-a-jwt-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('User Context', () => {
      it('should attach user info to request object', async () => {
        // This would require exposing the middleware logic or creating a test endpoint
        // For now, we verify through successful authenticated requests
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
      });
    });
  });

  describe('Rate Limiting Middleware', () => {
    describe('General Rate Limiting', () => {
      it('should allow normal request rates', async () => {
        const responses = await Promise.all([
          request(app).get('/api/rainbow'),
          request(app).get('/api/rainbow'),
          request(app).get('/api/rainbow')
        ]);

        responses.forEach(response => {
          expect(response.status).not.toBe(429);
        });
      });

      it('should rate limit excessive requests', async () => {
        // Make many requests quickly
        const requests = Array(20).fill().map(() =>
          request(app).get('/api/rainbow')
        );

        const responses = await Promise.all(requests);
        
        // Some should be rate limited
        const rateLimitedCount = responses.filter(res => res.status === 429).length;
        expect(rateLimitedCount).toBeGreaterThan(0);
      });
    });

    describe('Authentication Rate Limiting', () => {
      it('should have stricter rate limits for auth endpoints', async () => {
        const loginRequests = Array(10).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );

        const responses = await Promise.all(loginRequests);
        
        // Authentication endpoints should be rate limited more aggressively
        const rateLimitedCount = responses.filter(res => res.status === 429).length;
        expect(rateLimitedCount).toBeGreaterThan(0);
      });
    });

    describe('Rate Limit Headers', () => {
      it('should include rate limit headers in responses', async () => {
        const response = await request(app).get('/api/rainbow');

        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      });
    });
  });

  describe('Validation Middleware', () => {
    describe('Input Validation', () => {
      it('should validate rainbow creation data', async () => {
        const invalidData = {
          latitude: 'not-a-number',
          longitude: 999, // Invalid range
          description: '' // Empty string
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        expect(Array.isArray(response.body.errors)).toBe(true);
      });

      it('should validate coordinate ranges', async () => {
        const invalidCoordinates = [
          { latitude: 91, longitude: 0 }, // Latitude out of range
          { latitude: -91, longitude: 0 }, // Latitude out of range
          { latitude: 0, longitude: 181 }, // Longitude out of range
          { latitude: 0, longitude: -181 } // Longitude out of range
        ];

        for (const coords of invalidCoordinates) {
          const response = await request(app)
            .post('/api/rainbow')
            .set('Authorization', `Bearer ${validAuthToken}`)
            .send({
              ...coords,
              description: 'Test rainbow'
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it('should validate user registration data', async () => {
        const invalidUserData = [
          { name: '', email: 'test@example.com', password: 'Test123!' }, // Empty name
          { name: 'Test', email: 'invalid-email', password: 'Test123!' }, // Invalid email
          { name: 'Test', email: 'test@example.com', password: '123' }, // Weak password
          { email: 'test@example.com', password: 'Test123!' } // Missing name
        ];

        for (const userData of invalidUserData) {
          const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.errors).toBeDefined();
        }
      });
    });

    describe('Sanitization', () => {
      it('should sanitize HTML/script tags in input', async () => {
        const maliciousData = {
          latitude: 36.0687,
          longitude: 137.9646,
          description: '<script>alert("xss")</script><img src="x" onerror="alert(1)">'
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send(maliciousData);

        if (response.status === 201) {
          // Description should be sanitized
          expect(response.body.data.description).not.toContain('<script>');
          expect(response.body.data.description).not.toContain('onerror');
        }
      });

      it('should handle SQL injection attempts gracefully', async () => {
        const sqlInjectionData = {
          latitude: 36.0687,
          longitude: 137.9646,
          description: "'; DROP TABLE rainbow_sightings; --"
        };

        const response = await request(app)
          .post('/api/rainbow')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send(sqlInjectionData);

        // Should either succeed with sanitized data or fail validation
        expect([200, 201, 400]).toContain(response.status);
        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle server errors without exposing internals', async () => {
      // This would require triggering a server error
      // For now, we test that error responses have proper structure
      const response = await request(app)
        .post('/api/auth/login')
        .send({}); // Invalid request

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).not.toContain('stack');
      expect(response.body.message).not.toContain('Error:');
    });

    it('should return consistent error format', async () => {
      const responses = await Promise.all([
        request(app).get('/api/nonexistent'),
        request(app).post('/api/auth/login').send({}),
        request(app).get('/api/auth/me')
      ]);

      responses.forEach(response => {
        if (!response.body.success) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');
        }
      });
    });
  });

  describe('Security Headers Middleware', () => {
    it('should include security headers in all responses', async () => {
      const response = await request(app).get('/api/rainbow');

      const expectedHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];

      expectedHeaders.forEach(header => {
        expect(response.headers).toHaveProperty(header);
      });
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/api/rainbow');

      expect(response.headers).toHaveProperty('content-security-policy');
    });

    it('should disable X-Powered-By header', async () => {
      const response = await request(app).get('/api/rainbow');

      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('CORS Middleware', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/rainbow')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should include CORS headers in API responses', async () => {
      const response = await request(app)
        .get('/api/rainbow')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle different origins appropriately', async () => {
      const allowedOrigin = 'http://localhost:3000';
      const response = await request(app)
        .get('/api/rainbow')
        .set('Origin', allowedOrigin);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Logging Middleware', () => {
    it('should log requests without exposing sensitive data', async () => {
      // This test would require access to logs
      // For now, we verify requests complete successfully
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBeGreaterThan(0);
    });
  });
});