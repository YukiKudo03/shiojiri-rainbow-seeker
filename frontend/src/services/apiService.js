import apiClient from './authService';

export const apiService = {
  // Authentication APIs
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getUserProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Rainbow APIs
  getRainbows: async (params = {}) => {
    const response = await apiClient.get('/rainbow', { params });
    return response.data;
  },

  getRainbowById: async (id) => {
    const response = await apiClient.get(`/rainbow/${id}`);
    return response.data;
  },

  createRainbow: async (data, file) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    if (file) {
      formData.append('image', file);
    }
    const response = await apiClient.post('/rainbow', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteRainbow: async (id) => {
    const response = await apiClient.delete(`/rainbow/${id}`);
    return response.data;
  },

  getNearbyRainbows: async (lat, lon, distance = 10) => {
    const response = await apiClient.get(`/rainbow/nearby/${lat}/${lon}?distance=${distance}`);
    return response.data;
  },

  // User APIs
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  // Weather APIs
  getCurrentWeather: async (lat, lon) => {
    const response = await apiClient.get(`/weather/current?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  getWeatherForecast: async (lat, lon, days = 7) => {
    const response = await apiClient.get(`/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`);
    return response.data;
  },

  getWeatherHistory: async (date, lat, lon) => {
    const response = await apiClient.get(`/weather/history/${date}?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  getRainbowPrediction: async (lat, lon) => {
    const response = await apiClient.get(`/weather/prediction?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  // Analytics APIs
  getAnalytics: async (params = {}) => {
    const response = await apiClient.get('/analytics', { params });
    return response.data;
  },

  getRainbowStats: async (params = {}) => {
    const response = await apiClient.get('/analytics/rainbow-stats', { params });
    return response.data;
  },

  getUserStats: async (params = {}) => {
    const response = await apiClient.get('/analytics/user-stats', { params });
    return response.data;
  },

  // Notification APIs
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notification/history', { params });
    return response.data;
  },

  sendRainbowAlert: async (data) => {
    const response = await apiClient.post('/notification/send-rainbow-alert', data);
    return response.data;
  },
};