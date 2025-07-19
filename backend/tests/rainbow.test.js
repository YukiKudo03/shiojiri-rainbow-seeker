const request = require('supertest');

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

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../src/models/User', () => mockUser);
jest.mock('../src/models/Rainbow', () => mockRainbow);

const app = require('../src/server');

describe('Rainbow API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup mocks
    const bcrypt = require('bcryptjs');
    
    // Mock User methods
    mockUser.findByEmail.mockResolvedValue(null); // User doesn't exist by default
    mockUser.create.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      created_at: new Date()
    });
    mockUser.findById.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Mock Rainbow methods
    mockRainbow.findAll.mockResolvedValue([]);
    mockRainbow.findNearby.mockResolvedValue([]);
    mockRainbow.create.mockResolvedValue({
      id: 1,
      user_id: 1,
      latitude: 36.1127,
      longitude: 137.9545,
      description: 'Beautiful rainbow after rain',
      created_at: new Date()
    });
    mockRainbow.findById.mockImplementation((id) => {
      if (id === '1' || id === 1) {
        return Promise.resolve({
          id: 1,
          userId: 1,
          latitude: 36.1127,
          longitude: 137.9545,
          description: 'Beautiful rainbow after rain',
          created_at: new Date()
        });
      }
      return Promise.resolve(null);
    });
    mockRainbow.update.mockResolvedValue({
      id: 1,
      userId: 1,
      latitude: 36.1127,
      longitude: 137.9545,
      description: 'Updated description',
      created_at: new Date()
    });
    mockRainbow.delete.mockResolvedValue(true);
    
    bcrypt.hash.mockResolvedValue('hashedpassword123');
    bcrypt.compare.mockResolvedValue(true);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create test user and get auth token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    if (registerResponse.body?.data?.token) {
      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    } else {
      throw new Error('Failed to get auth token from registration response');
    }
  });

  beforeEach(() => {
    // Reset mocks but keep the same resolved values
    jest.clearAllMocks();
    
    const bcrypt = require('bcryptjs');
    
    // Re-setup User mocks for each test
    mockUser.findByEmail.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      created_at: new Date()
    });
    mockUser.findById.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Re-setup Rainbow mocks
    mockRainbow.findAll.mockResolvedValue([]);
    mockRainbow.findNearby.mockResolvedValue([]);
    mockRainbow.create.mockResolvedValue({
      id: 1,
      user_id: 1,
      latitude: 36.1127,
      longitude: 137.9545,
      description: 'Beautiful rainbow after rain',
      created_at: new Date()
    });
    mockRainbow.findById.mockImplementation((id) => {
      if (id === '1' || id === 1) {
        return Promise.resolve({
          id: 1,
          userId: 1,
          latitude: 36.1127,
          longitude: 137.9545,
          description: 'Beautiful rainbow after rain',
          created_at: new Date()
        });
      }
      return Promise.resolve(null);
    });
    mockRainbow.update.mockResolvedValue({
      id: 1,
      userId: 1,
      latitude: 36.1127,
      longitude: 137.9545,
      description: 'Updated description',
      created_at: new Date()
    });
    mockRainbow.delete.mockResolvedValue(true);
    
    bcrypt.hash.mockResolvedValue('hashedpassword123');
    bcrypt.compare.mockResolvedValue(true);
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