import ApiService from '../ApiService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock react-native-flash-message
jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

describe('ApiService', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Authentication Methods', () => {
    describe('login', () => {
      it('should login successfully with valid credentials', async () => {
        const mockResponse = {
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: 1,
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        };

        const result = await ApiService.login(credentials);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/login'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(credentials),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle login failure', async () => {
        const mockErrorResponse = {
          success: false,
          message: 'Invalid credentials'
        };

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => mockErrorResponse,
        });

        const credentials = {
          email: 'wrong@example.com',
          password: 'wrongpassword'
        };

        await expect(ApiService.login(credentials)).rejects.toThrow('Login failed');
      });

      it('should handle network errors', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        };

        await expect(ApiService.login(credentials)).rejects.toThrow('Network error');
      });
    });

    describe('register', () => {
      it('should register successfully with valid data', async () => {
        const mockResponse = {
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: 1,
              email: 'newuser@example.com',
              name: 'New User'
            }
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const userData = {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123'
        };

        const result = await ApiService.register(userData);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/register'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(userData),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle registration failure with validation errors', async () => {
        const mockErrorResponse = {
          success: false,
          message: 'Validation failed',
          errors: ['Email already exists']
        };

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => mockErrorResponse,
        });

        const userData = {
          name: 'User',
          email: 'existing@example.com',
          password: 'password123'
        };

        await expect(ApiService.register(userData)).rejects.toThrow('Registration failed');
      });
    });

    describe('getCurrentUser', () => {
      it('should get current user successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            bio: 'Rainbow enthusiast'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ApiService.getCurrentUser();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/me'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
            }),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle unauthorized access', async () => {
        const mockErrorResponse = {
          success: false,
          message: 'Unauthorized'
        };

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => mockErrorResponse,
        });

        await expect(ApiService.getCurrentUser()).rejects.toThrow('Failed to get current user');
      });
    });
  });

  describe('Rainbow Methods', () => {
    describe('getRainbows', () => {
      it('should get rainbows successfully', async () => {
        const mockResponse = {
          success: true,
          data: [
            {
              id: 1,
              latitude: 36.0687,
              longitude: 137.9646,
              description: 'Beautiful rainbow',
              timestamp: '2023-06-15T14:30:00Z',
              user_name: 'Test User'
            }
          ]
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ApiService.getRainbows();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rainbow'),
          expect.objectContaining({
            method: 'GET',
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle pagination parameters', async () => {
        const mockResponse = {
          success: true,
          data: []
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const params = { page: 2, limit: 10 };
        await ApiService.getRainbows(params);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2&limit=10'),
          expect.any(Object)
        );
      });
    });

    describe('createRainbow', () => {
      it('should create rainbow successfully with image', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 1,
            latitude: 36.0687,
            longitude: 137.9646,
            description: 'New rainbow sighting',
            image_url: 'https://example.com/rainbow.jpg'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const rainbowData = {
          latitude: 36.0687,
          longitude: 137.9646,
          description: 'New rainbow sighting'
        };

        const imageUri = 'file://path/to/image.jpg';

        const result = await ApiService.createRainbow(rainbowData, imageUri);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rainbow'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'multipart/form-data',
            }),
            body: expect.any(FormData),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should create rainbow without image', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 1,
            latitude: 36.0687,
            longitude: 137.9646,
            description: 'New rainbow sighting'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const rainbowData = {
          latitude: 36.0687,
          longitude: 137.9646,
          description: 'New rainbow sighting'
        };

        const result = await ApiService.createRainbow(rainbowData);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rainbow'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(rainbowData),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle creation failure', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            message: 'Invalid location'
          }),
        });

        const rainbowData = {
          latitude: 999,
          longitude: 999,
          description: 'Invalid rainbow'
        };

        await expect(ApiService.createRainbow(rainbowData)).rejects.toThrow('Failed to create rainbow');
      });
    });

    describe('getNearbyRainbows', () => {
      it('should get nearby rainbows successfully', async () => {
        const mockResponse = {
          success: true,
          data: [
            {
              id: 1,
              latitude: 36.0687,
              longitude: 137.9646,
              distance: 0.5
            }
          ]
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const latitude = 36.0687;
        const longitude = 137.9646;
        const radius = 10;

        const result = await ApiService.getNearbyRainbows(latitude, longitude, radius);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/rainbow/nearby/${latitude}/${longitude}`),
          expect.any(Object)
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getRainbowById', () => {
      it('should get rainbow by ID successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 1,
            latitude: 36.0687,
            longitude: 137.9646,
            description: 'Rainbow details'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ApiService.getRainbowById(1);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rainbow/1'),
          expect.any(Object)
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle rainbow not found', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            message: 'Rainbow not found'
          }),
        });

        await expect(ApiService.getRainbowById(999)).rejects.toThrow('Failed to get rainbow');
      });
    });
  });

  describe('Weather Methods', () => {
    describe('getCurrentWeather', () => {
      it('should get current weather successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            temperature: 22.5,
            humidity: 75,
            pressure: 1013.2,
            description: 'partly cloudy'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const latitude = 36.0687;
        const longitude = 137.9646;

        const result = await ApiService.getCurrentWeather(latitude, longitude);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/weather/current'),
          expect.any(Object)
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle weather API failure', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            message: 'Weather service unavailable'
          }),
        });

        await expect(ApiService.getCurrentWeather(36.0687, 137.9646))
          .rejects.toThrow('Failed to get current weather');
      });
    });

    describe('getRainbowPrediction', () => {
      it('should get rainbow prediction successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            probability: 0.75,
            prediction: 1,
            confidence: 'high',
            recommendation: 'Good chance of rainbow!'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const latitude = 36.0687;
        const longitude = 137.9646;

        const result = await ApiService.getRainbowPrediction(latitude, longitude);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/weather/prediction'),
          expect.any(Object)
        );

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Notification Methods', () => {
    describe('registerFCMToken', () => {
      it('should register FCM token successfully', async () => {
        const mockResponse = {
          success: true,
          message: 'Token registered successfully'
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const token = 'mock-fcm-token';

        const result = await ApiService.registerFCMToken(token);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/notification/register-token'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ fcm_token: token }),
          })
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getNotificationHistory', () => {
      it('should get notification history successfully', async () => {
        const mockResponse = {
          success: true,
          data: [
            {
              id: 1,
              title: 'Rainbow Alert',
              message: 'A rainbow was spotted nearby!',
              type: 'rainbow_alert',
              sent_at: '2023-06-15T14:30:00Z'
            }
          ]
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ApiService.getNotificationHistory();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/notification/history'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
            }),
          })
        );

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Request Helper Methods', () => {
    describe('Error Handling', () => {
      it('should handle HTTP error responses', async () => {
        const mockErrorResponse = {
          success: false,
          message: 'Server error',
          errors: ['Specific error details']
        };

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => mockErrorResponse,
        });

        await expect(ApiService.getCurrentWeather(36.0687, 137.9646))
          .rejects.toThrow('Failed to get current weather');
      });

      it('should handle network errors', async () => {
        fetch.mockRejectedValueOnce(new Error('Network request failed'));

        await expect(ApiService.getCurrentWeather(36.0687, 137.9646))
          .rejects.toThrow('Network request failed');
      });

      it('should handle malformed JSON responses', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });

        await expect(ApiService.getCurrentWeather(36.0687, 137.9646))
          .rejects.toThrow();
      });
    });

    describe('Authentication Headers', () => {
      it('should include auth token in authenticated requests', async () => {
        // Mock AsyncStorage to return a token
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        AsyncStorage.getItem.mockResolvedValueOnce('mock-token');

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

        await ApiService.getCurrentUser();

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
            }),
          })
        );
      });

      it('should handle missing auth token', async () => {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        AsyncStorage.getItem.mockResolvedValueOnce(null);

        await expect(ApiService.getCurrentUser())
          .rejects.toThrow('No authentication token found');
      });
    });

    describe('Request Timeouts', () => {
      it('should handle request timeouts', async () => {
        // Mock a delayed response
        fetch.mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        // This test would need actual timeout implementation
        // For now, we just verify the request is made
        const requestPromise = ApiService.getCurrentWeather(36.0687, 137.9646);
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('URL Construction', () => {
    it('should construct URLs correctly with query parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const params = { page: 1, limit: 20, sort: 'timestamp' };
      await ApiService.getRainbows(params);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=20&sort=timestamp'),
        expect.any(Object)
      );
    });

    it('should handle special characters in query parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const params = { search: 'beautiful rainbow!' };
      await ApiService.getRainbows(params);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('beautiful rainbow!')),
        expect.any(Object)
      );
    });
  });
});