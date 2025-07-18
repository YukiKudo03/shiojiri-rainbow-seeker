import apiClient from './authService';

export const apiService = {
  // Rainbow APIs
  getRainbows: async (params = {}) => {
    const response = await apiClient.get('/rainbow', { params });
    return response.data;
  },

  getRainbow: async (id) => {
    const response = await apiClient.get(`/rainbow/${id}`);
    return response.data;
  },

  deleteRainbow: async (id) => {
    const response = await apiClient.delete(`/rainbow/${id}`);
    return response.data;
  },

  getNearbyRainbows: async (lat, lon, radius = 10) => {
    const response = await apiClient.get(`/rainbow/nearby/${lat}/${lon}?radius=${radius}`);
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