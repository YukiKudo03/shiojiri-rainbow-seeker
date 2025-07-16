import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { ApiService } from './ApiService';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export class AuthService {
  static async login(email, password) {
    try {
      const response = await ApiService.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token securely
        await Keychain.setInternetCredentials(TOKEN_KEY, 'token', token);
        
        // Store user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        
        return {
          success: true,
          user,
          token
        };
      }

      return {
        success: false,
        error: response.data.error?.message || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Network error'
      };
    }
  }

  static async register(userData) {
    try {
      const response = await ApiService.post('/auth/register', userData);

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token securely
        await Keychain.setInternetCredentials(TOKEN_KEY, 'token', token);
        
        // Store user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        
        return {
          success: true,
          user,
          token
        };
      }

      return {
        success: false,
        error: response.data.error?.message || 'Registration failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Network error'
      };
    }
  }

  static async logout() {
    try {
      // Clear token
      await Keychain.resetInternetCredentials(TOKEN_KEY);
      
      // Clear user data
      await AsyncStorage.removeItem(USER_KEY);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  static async getToken() {
    try {
      const credentials = await Keychain.getInternetCredentials(TOKEN_KEY);
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }

  static async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  static async checkAuthStatus() {
    try {
      const token = await this.getToken();
      const user = await this.getUser();
      
      if (token && user) {
        // Verify token with server
        const response = await ApiService.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          return {
            isAuthenticated: true,
            user: response.data.data,
            token
          };
        }
      }
      
      return {
        isAuthenticated: false,
        user: null,
        token: null
      };
    } catch (error) {
      console.error('Auth check error:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null
      };
    }
  }

  static async updateUser(userData) {
    try {
      const token = await this.getToken();
      const response = await ApiService.put('/auth/me', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update stored user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data));
        
        return {
          success: true,
          user: response.data.data
        };
      }

      return {
        success: false,
        error: response.data.error?.message || 'Update failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Network error'
      };
    }
  }

  static async forgotPassword(email) {
    try {
      const response = await ApiService.post('/auth/forgot-password', { email });
      
      return {
        success: response.data.success,
        message: response.data.message || 'Password reset email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Network error'
      };
    }
  }

  static async resetPassword(token, password) {
    try {
      const response = await ApiService.post('/auth/reset-password', {
        token,
        password
      });
      
      return {
        success: response.data.success,
        message: response.data.message || 'Password reset successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Network error'
      };
    }
  }
}