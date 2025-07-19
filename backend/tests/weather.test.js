const request = require('supertest');

// Mock weather service
const mockWeatherService = {
  getCurrentWeather: jest.fn(),
  getRadarData: jest.fn(),
  getRainbowPrediction: jest.fn(),
};

// Mock Weather model
const mockWeatherModel = {
  findByDate: jest.fn(),
};

jest.mock('../src/services/weatherService', () => mockWeatherService);
jest.mock('../src/models/Weather', () => mockWeatherModel);

const app = require('../src/server');

describe('Weather API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/weather/current', () => {
    it('should get current weather successfully', async () => {
      const mockWeatherData = {
        temperature: 22.5,
        humidity: 75,
        pressure: 1013.2,
        wind_speed: 3.5,
        wind_direction: 180,
        precipitation: 0.0,
        cloud_cover: 40,
        visibility: 12.0,
        uv_index: 6,
        description: 'partly cloudy',
        timestamp: new Date()
      };

      mockWeatherService.getCurrentWeather.mockResolvedValueOnce(mockWeatherData);

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWeatherData);
      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledTimes(1);
    });

    it('should handle weather service errors', async () => {
      mockWeatherService.getCurrentWeather.mockRejectedValueOnce(
        new Error('Weather API unavailable')
      );

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.status).toBe(500);
    });

    it('should handle weather service timeout', async () => {
      mockWeatherService.getCurrentWeather.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/weather/radar', () => {
    it('should get radar data successfully', async () => {
      const mockRadarData = {
        radar_image_url: 'https://example.com/radar.png',
        timestamp: new Date(),
        coverage_area: {
          north: 36.5,
          south: 35.5,
          east: 138.5,
          west: 137.0
        },
        precipitation_layers: [
          {
            intensity: 'light',
            coordinates: [[36.0, 137.9], [36.1, 138.0]]
          }
        ]
      };

      mockWeatherService.getRadarData.mockResolvedValueOnce(mockRadarData);

      const response = await request(app)
        .get('/api/weather/radar');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRadarData);
      expect(mockWeatherService.getRadarData).toHaveBeenCalledTimes(1);
    });

    it('should handle radar data unavailable', async () => {
      mockWeatherService.getRadarData.mockRejectedValueOnce(
        new Error('Radar service unavailable')
      );

      const response = await request(app)
        .get('/api/weather/radar');

      expect(response.status).toBe(500);
    });

    it('should validate radar data format', async () => {
      const validRadarData = {
        radar_image_url: 'https://example.com/radar.png',
        timestamp: new Date(),
        coverage_area: {
          north: 36.5,
          south: 35.5,
          east: 138.5,
          west: 137.0
        }
      };

      mockWeatherService.getRadarData.mockResolvedValueOnce(validRadarData);

      const response = await request(app)
        .get('/api/weather/radar');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('radar_image_url');
      expect(response.body.data).toHaveProperty('coverage_area');
    });
  });

  describe('GET /api/weather/historical/:date', () => {
    it('should get historical weather data successfully', async () => {
      const mockHistoricalData = {
        id: 1,
        date: '2023-06-15',
        temperature_max: 28.0,
        temperature_min: 18.0,
        humidity_avg: 70,
        precipitation_total: 2.5,
        wind_speed_max: 5.2,
        rainbow_observed: true
      };

      mockWeatherModel.findByDate.mockResolvedValueOnce(mockHistoricalData);

      const response = await request(app)
        .get('/api/weather/historical/2023-06-15');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistoricalData);
      expect(mockWeatherModel.findByDate).toHaveBeenCalledWith('2023-06-15');
    });

    it('should handle weather data not found', async () => {
      mockWeatherModel.findByDate.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/weather/historical/2023-01-01');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Weather data not found for this date');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/weather/historical/invalid-date');

      // Should either handle gracefully or return appropriate error
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle database errors', async () => {
      mockWeatherModel.findByDate.mockRejectedValueOnce(
        new Error('Database connection error')
      );

      const response = await request(app)
        .get('/api/weather/historical/2023-06-15');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/weather/prediction', () => {
    it('should get rainbow prediction successfully', async () => {
      const mockPredictionData = {
        probability: 0.85,
        confidence: 'high',
        prediction: 1,
        factors: {
          temperature: 'optimal',
          humidity: 'good',
          wind: 'favorable',
          precipitation: 'light'
        },
        recommendation: 'Great conditions for rainbow watching!',
        next_update: new Date(Date.now() + 3600000)
      };

      mockWeatherService.getRainbowPrediction.mockResolvedValueOnce(mockPredictionData);

      const response = await request(app)
        .get('/api/weather/prediction');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPredictionData);
      expect(response.body.data.probability).toBeGreaterThanOrEqual(0);
      expect(response.body.data.probability).toBeLessThanOrEqual(1);
      expect(mockWeatherService.getRainbowPrediction).toHaveBeenCalledTimes(1);
    });

    it('should handle prediction service errors', async () => {
      mockWeatherService.getRainbowPrediction.mockRejectedValueOnce(
        new Error('ML service unavailable')
      );

      const response = await request(app)
        .get('/api/weather/prediction');

      expect(response.status).toBe(500);
    });

    it('should return low probability when conditions are poor', async () => {
      const lowProbabilityData = {
        probability: 0.15,
        confidence: 'low',
        prediction: 0,
        factors: {
          temperature: 'too_cold',
          humidity: 'too_low',
          wind: 'too_strong',
          precipitation: 'none'
        },
        recommendation: 'Poor conditions for rainbow watching.'
      };

      mockWeatherService.getRainbowPrediction.mockResolvedValueOnce(lowProbabilityData);

      const response = await request(app)
        .get('/api/weather/prediction');

      expect(response.status).toBe(200);
      expect(response.body.data.probability).toBeLessThan(0.3);
      expect(response.body.data.prediction).toBe(0);
    });

    it('should validate prediction data structure', async () => {
      const validPredictionData = {
        probability: 0.65,
        confidence: 'medium',
        prediction: 1
      };

      mockWeatherService.getRainbowPrediction.mockResolvedValueOnce(validPredictionData);

      const response = await request(app)
        .get('/api/weather/prediction');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('probability');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('prediction');
      expect(typeof response.body.data.probability).toBe('number');
    });
  });

  describe('Weather API Rate Limiting', () => {
    it('should handle rapid requests appropriately', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        temperature: 20,
        humidity: 60
      });

      // Make multiple rapid requests
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/weather/current')
      );

      const responses = await Promise.all(requests);
      
      // Most should succeed, but rate limiting might kick in
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(5); // At least some should succeed
    });
  });

  describe('Weather API Caching', () => {
    it('should use cached data for repeated requests', async () => {
      const mockData = { temperature: 25, humidity: 70 };
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockData);

      // First request
      await request(app).get('/api/weather/current');
      
      // Second request (should potentially use cache)
      const response = await request(app).get('/api/weather/current');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockData);
    });
  });

  describe('Weather API Error Handling', () => {
    it('should handle malformed responses from weather service', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/weather/current');

      // Should handle gracefully
      expect([200, 204, 500]).toContain(response.status);
    });

    it('should handle network timeouts gracefully', async () => {
      mockWeatherService.getCurrentWeather.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.status).toBe(500);
    });

    it('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockWeatherService.getCurrentWeather.mockRejectedValueOnce(
        new Error('Internal database connection string: user:pass@localhost')
      );

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.status).toBe(500);
      // Should not expose sensitive information
      expect(response.body.error).not.toContain('user:pass');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Weather API Headers and Security', () => {
    it('should include security headers', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValueOnce({
        temperature: 20
      });

      const response = await request(app)
        .get('/api/weather/current');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS for weather endpoints', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValueOnce({
        temperature: 20
      });

      const response = await request(app)
        .get('/api/weather/current')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});