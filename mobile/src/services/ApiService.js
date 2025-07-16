import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

const TOKEN_KEY = 'auth_token';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const credentials = await Keychain.getInternetCredentials(TOKEN_KEY);
          if (credentials) {
            config.headers.Authorization = `Bearer ${credentials.password}`;
          }
        } catch (error) {
          console.error('Token retrieval error:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.clearAuth();
          // You might want to redirect to login screen here
        }
        return Promise.reject(error);
      }
    );
  }

  async clearAuth() {
    try {
      await Keychain.resetInternetCredentials(TOKEN_KEY);
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Clear auth error:', error);
    }
  }

  // HTTP methods
  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  async post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url, data, config = {}) {
    return this.client.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  // Multipart form data for file uploads
  async uploadFile(url, formData, config = {}) {
    return this.client.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Rainbow API methods
  async getRainbows(page = 1, limit = 20) {
    return this.get(`/rainbow?page=${page}&limit=${limit}`);
  }

  async getRainbowById(id) {
    return this.get(`/rainbow/${id}`);
  }

  async getNearbyRainbows(latitude, longitude, radius = 10) {
    return this.get(`/rainbow/nearby/${latitude}/${longitude}?radius=${radius}`);
  }

  async createRainbow(rainbowData) {
    return this.post('/rainbow', rainbowData);
  }

  async createRainbowWithImage(rainbowData, imageUri) {
    const formData = new FormData();
    formData.append('latitude', rainbowData.latitude.toString());
    formData.append('longitude', rainbowData.longitude.toString());
    formData.append('description', rainbowData.description || '');
    
    if (imageUri) {
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'rainbow.jpg',
      });
    }

    return this.uploadFile('/rainbow', formData);
  }

  async updateRainbow(id, rainbowData) {
    return this.put(`/rainbow/${id}`, rainbowData);
  }

  async deleteRainbow(id) {
    return this.delete(`/rainbow/${id}`);
  }

  // Weather API methods
  async getCurrentWeather() {
    return this.get('/weather/current');
  }

  async getRadarData() {
    return this.get('/weather/radar');
  }

  async getRainbowPrediction() {
    return this.get('/weather/prediction');
  }

  // Notification API methods
  async registerFcmToken(token) {
    return this.post('/notification/register-token', { token });
  }

  async getNotificationHistory() {
    return this.get('/notification/history');
  }

  async sendRainbowAlert(latitude, longitude, message) {
    return this.post('/notification/send-rainbow-alert', {
      latitude,
      longitude,
      message
    });
  }

  // User API methods
  async updateProfile(userData) {
    return this.put('/auth/me', userData);
  }

  async getProfile() {
    return this.get('/auth/me');
  }
}

export const ApiService = new ApiService();
export default ApiService;