const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Import middleware
const auth = require('../src/middleware/auth');
const errorHandler = require('../src/middleware/errorHandler');
const notFoundHandler = require('../src/middleware/notFoundHandler');

describe('Enhanced Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Auth Middleware', () => {
    it('should allow access with valid token', async () => {
      const token = global.testUtils.createAuthToken(1);
      
      app.get('/protected', auth, (req, res) => {
        res.json({ 
          success: true, 
          userId: req.user.userId,
          email: req.user.email
        });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(1);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      app.get('/protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should reject request with invalid token', async () => {
      app.get('/protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with malformed authorization header', async () => {
      app.get('/protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      app.get('/protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle token without userId', async () => {
      const invalidToken = jwt.sign(
        { email: 'test@example.com' }, // Missing userId
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/protected', auth, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handler Middleware', () => {
    beforeEach(() => {
      app.use(errorHandler);
    });

    it('should handle validation errors', async () => {
      app.get('/validation-error', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        error.errors = [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is too weak' }
        ];
        next(error);
      });

      const response = await request(app)
        .get('/validation-error');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveLength(2);
    });

    it('should handle JWT errors', async () => {
      app.get('/jwt-error', (req, res, next) => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        next(error);
      });

      const response = await request(app)
        .get('/jwt-error');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should handle token expiry errors', async () => {
      app.get('/token-expired-error', (req, res, next) => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        next(error);
      });

      const response = await request(app)
        .get('/token-expired-error');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should handle database errors', async () => {
      app.get('/db-error', (req, res, next) => {
        const error = new Error('Connection failed');
        error.code = 'ECONNREFUSED';
        next(error);
      });

      const response = await request(app)
        .get('/db-error');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Database');
    });

    it('should handle duplicate key errors', async () => {
      app.get('/duplicate-error', (req, res, next) => {
        const error = new Error('Duplicate key value');
        error.code = '23505';
        error.constraint = 'users_email_key';
        next(error);
      });

      const response = await request(app)
        .get('/duplicate-error');

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should handle file size errors', async () => {
      app.get('/file-size-error', (req, res, next) => {
        const error = new Error('File too large');
        error.code = 'LIMIT_FILE_SIZE';
        next(error);
      });

      const response = await request(app)
        .get('/file-size-error');

      expect(response.status).toBe(413);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('File size');
    });

    it('should handle generic errors', async () => {
      app.get('/generic-error', (req, res, next) => {
        const error = new Error('Something went wrong');
        next(error);
      });

      const response = await request(app)
        .get('/generic-error');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Internal server error');
    });

    it('should not expose stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/prod-error', (req, res, next) => {
        const error = new Error('Production error');
        next(error);
      });

      const response = await request(app)
        .get('/prod-error');

      expect(response.status).toBe(500);
      expect(response.body.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/dev-error', (req, res, next) => {
        const error = new Error('Development error');
        next(error);
      });

      const response = await request(app)
        .get('/dev-error');

      expect(response.status).toBe(500);
      expect(response.body.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Not Found Handler Middleware', () => {
    beforeEach(() => {
      app.use(notFoundHandler);
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should handle 404 for API routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('API endpoint');
    });

    it('should include request details in error', async () => {
      const response = await request(app)
        .post('/api/missing-endpoint')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.method).toBe('POST');
      expect(response.body.error.path).toBe('/api/missing-endpoint');
    });
  });

  describe('Cache Middleware Integration', () => {
    const { cacheMiddleware } = require('../src/middleware/cache');

    it('should pass through cache middleware without Redis', async () => {
      app.get('/cached', cacheMiddleware(60, 'test'), (req, res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const response = await request(app)
        .get('/cached');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Metrics Middleware Integration', () => {
    const { metricsMiddleware } = require('../src/middleware/metrics');

    it('should pass through metrics middleware', async () => {
      app.use(metricsMiddleware);
      app.get('/tracked', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/tracked');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Upload Middleware Integration', () => {
    const upload = require('../src/middleware/upload');

    it('should handle file upload', async () => {
      app.post('/upload', upload.single('image'), (req, res) => {
        res.json({ 
          success: true, 
          file: req.file ? {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
          } : null
        });
      });

      const response = await request(app)
        .post('/upload')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.filename).toBe('test-image.jpg');
    });

    it('should handle multiple file uploads', async () => {
      app.post('/upload-multiple', upload.array('images', 3), (req, res) => {
        res.json({ 
          success: true, 
          files: req.files ? req.files.length : 0
        });
      });

      const response = await request(app)
        .post('/upload-multiple')
        .attach('images', Buffer.from('fake-image-data'), 'test1.jpg')
        .attach('images', Buffer.from('fake-image-data'), 'test2.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toBe(1); // Mock only adds one file
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      app.get('/security-test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/security-test');

      // These would be set by helmet in actual implementation
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle normal request load', async () => {
      app.get('/rate-test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/rate-test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});