const request = require('supertest');
const app = require('../src/server');

describe('Rainbow API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  describe('POST /api/rainbow', () => {
    it('should create a new rainbow sighting', async () => {
      const rainbowData = {
        latitude: 36.1127,
        longitude: 137.9545,
        description: 'Beautiful rainbow after rain'
      };

      const response = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rainbowData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.latitude).toBe(rainbowData.latitude);
      expect(response.body.data.longitude).toBe(rainbowData.longitude);
      expect(response.body.data.description).toBe(rainbowData.description);
    });

    it('should require authentication', async () => {
      const rainbowData = {
        latitude: 36.1127,
        longitude: 137.9545,
        description: 'Test rainbow'
      };

      const response = await request(app)
        .post('/api/rainbow')
        .send(rainbowData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate latitude and longitude', async () => {
      const rainbowData = {
        latitude: 999,
        longitude: 999,
        description: 'Invalid coordinates'
      };

      const response = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rainbowData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/rainbow', () => {
    it('should get all rainbow sightings', async () => {
      const response = await request(app)
        .get('/api/rainbow');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/rainbow?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/rainbow/nearby/:latitude/:longitude', () => {
    it('should get nearby rainbow sightings', async () => {
      const response = await request(app)
        .get('/api/rainbow/nearby/36.1127/137.9545');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate coordinates', async () => {
      const response = await request(app)
        .get('/api/rainbow/nearby/999/999');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should support radius parameter', async () => {
      const response = await request(app)
        .get('/api/rainbow/nearby/36.1127/137.9545?radius=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/rainbow/:id', () => {
    let rainbowId;

    beforeAll(async () => {
      // Create a rainbow sighting for testing
      const rainbowData = {
        latitude: 36.1127,
        longitude: 137.9545,
        description: 'Test rainbow for ID retrieval'
      };

      const createResponse = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rainbowData);

      rainbowId = createResponse.body.data.id;
    });

    it('should get rainbow sighting by ID', async () => {
      const response = await request(app)
        .get(`/api/rainbow/${rainbowId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(rainbowId);
    });

    it('should return 404 for non-existent rainbow', async () => {
      const response = await request(app)
        .get('/api/rainbow/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/rainbow/:id', () => {
    let rainbowId;

    beforeAll(async () => {
      // Create a rainbow sighting for testing
      const rainbowData = {
        latitude: 36.1127,
        longitude: 137.9545,
        description: 'Test rainbow for update'
      };

      const createResponse = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rainbowData);

      rainbowId = createResponse.body.data.id;
    });

    it('should update rainbow sighting', async () => {
      const updateData = {
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/rainbow/${rainbowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should require authentication', async () => {
      const updateData = {
        description: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/rainbow/${rainbowId}`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/rainbow/:id', () => {
    let rainbowId;

    beforeAll(async () => {
      // Create a rainbow sighting for testing
      const rainbowData = {
        latitude: 36.1127,
        longitude: 137.9545,
        description: 'Test rainbow for deletion'
      };

      const createResponse = await request(app)
        .post('/api/rainbow')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rainbowData);

      rainbowId = createResponse.body.data.id;
    });

    it('should delete rainbow sighting', async () => {
      const response = await request(app)
        .delete(`/api/rainbow/${rainbowId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/rainbow/${rainbowId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});