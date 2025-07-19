import { apiService } from '../apiService';

// Mock authService to return the mock client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('../authService', () => mockApiClient);

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const responseData = {
        success: true,
        data: {
          user: global.testUtils.mockUser,
          token: 'mock-jwt-token'
        }
      };

      mockApiClient.post.mockResolvedValue({ data: responseData });

      const result = await apiService.login(loginData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result).toEqual(responseData);
    });

    it('should register successfully', async () => {
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const responseData = {
        success: true,
        data: {
          user: global.testUtils.mockUser,
          token: 'mock-jwt-token'
        }
      };

      mockApiClient.post.mockResolvedValue({ data: responseData });

      const result = await apiService.register(registerData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result).toEqual(responseData);
    });

    it('should get user profile', async () => {
      const responseData = {
        success: true,
        data: global.testUtils.mockUser
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getUserProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(responseData);
    });

    it('should handle login errors', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const errorResponse = {
        response: {
          data: { success: false, message: 'Invalid credentials' },
          status: 401
        }
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      await expect(apiService.login(loginData)).rejects.toEqual(errorResponse);
    });
  });

  describe('Rainbow Management', () => {
    it('should get all rainbows', async () => {
      const responseData = {
        success: true,
        data: [global.testUtils.mockRainbow]
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getRainbows();

      expect(mockApiClient.get).toHaveBeenCalledWith('/rainbow');
      expect(result).toEqual(responseData);
    });

    it('should get rainbow by ID', async () => {
      const rainbowId = 1;
      const responseData = {
        success: true,
        data: global.testUtils.mockRainbow
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getRainbowById(rainbowId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/rainbow/${rainbowId}`);
      expect(result).toEqual(responseData);
    });

    it('should create rainbow with form data', async () => {
      const rainbowData = {
        title: 'New Rainbow',
        description: 'A beautiful rainbow',
        latitude: 36.2048,
        longitude: 138.2529,
        intensity: 8
      };

      const file = new File(['test'], 'rainbow.jpg', { type: 'image/jpeg' });

      const responseData = {
        success: true,
        data: { ...global.testUtils.mockRainbow, ...rainbowData }
      };

      mockApiClient.post.mockResolvedValue({ data: responseData });

      const result = await apiService.createRainbow(rainbowData, file);

      expect(mockApiClient.post).toHaveBeenCalledWith('/rainbow', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(responseData);
    });

    it('should get nearby rainbows', async () => {
      const latitude = 36.2048;
      const longitude = 138.2529;
      const distance = 10;

      const responseData = {
        success: true,
        data: [global.testUtils.mockRainbow]
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getNearbyRainbows(latitude, longitude, distance);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/rainbow/nearby/${latitude}/${longitude}?distance=${distance}`
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('Weather Services', () => {
    it('should get current weather', async () => {
      const latitude = 36.2048;
      const longitude = 138.2529;

      const responseData = {
        success: true,
        data: global.testUtils.mockWeatherData
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getCurrentWeather(latitude, longitude);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/weather/current?lat=${latitude}&lon=${longitude}`
      );
      expect(result).toEqual(responseData);
    });

    it('should get weather forecast', async () => {
      const latitude = 36.2048;
      const longitude = 138.2529;
      const days = 3;

      const responseData = {
        success: true,
        data: [global.testUtils.mockWeatherData]
      };

      mockApiClient.get.mockResolvedValue({ data: responseData });

      const result = await apiService.getWeatherForecast(latitude, longitude, days);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/weather/forecast?lat=${latitude}&lon=${longitude}&days=${days}`
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      mockApiClient.get.mockRejectedValue(networkError);

      await expect(apiService.getRainbows()).rejects.toEqual(networkError);
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          data: { success: false, message: 'Internal server error' },
          status: 500
        }
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(apiService.getRainbows()).rejects.toEqual(serverError);
    });
  });
});