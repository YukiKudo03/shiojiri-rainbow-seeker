import AuthService from '../AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock ApiService
const mockApiService = {
  login: jest.fn(),
  register: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  registerFCMToken: jest.fn(),
};

jest.mock('../ApiService', () => mockApiService);

// Mock react-native-keychain
const mockKeychain = {
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
};

jest.mock('react-native-keychain', () => mockKeychain);

// Mock messaging for FCM
const mockMessaging = {
  getToken: jest.fn(),
  onTokenRefresh: jest.fn(),
  hasPermission: jest.fn(),
  requestPermission: jest.fn(),
};

jest.mock('@react-native-firebase/messaging', () => () => mockMessaging);

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  describe('Authentication Methods', () => {
    describe('login', () => {
      it('should login successfully and store credentials', async () => {
        const mockLoginResponse = {
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

        mockApiService.login.mockResolvedValueOnce(mockLoginResponse);
        mockKeychain.setInternetCredentials.mockResolvedValueOnce(true);

        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        };

        const result = await AuthService.login(credentials);

        expect(mockApiService.login).toHaveBeenCalledWith(credentials);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockLoginResponse.data.user));
        expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
          'RainbowSeeker',
          credentials.email,
          credentials.password
        );
        expect(result).toEqual({
          success: true,
          user: mockLoginResponse.data.user,
          token: mockLoginResponse.data.token
        });
      });

      it('should handle login failure', async () => {
        const mockError = new Error('Invalid credentials');
        mockApiService.login.mockRejectedValueOnce(mockError);

        const credentials = {
          email: 'wrong@example.com',
          password: 'wrongpassword'
        };

        const result = await AuthService.login(credentials);

        expect(result).toEqual({
          success: false,
          error: 'Invalid credentials'
        });
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
        expect(mockKeychain.setInternetCredentials).not.toHaveBeenCalled();
      });

      it('should handle keychain storage failure gracefully', async () => {
        const mockLoginResponse = {
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

        mockApiService.login.mockResolvedValueOnce(mockLoginResponse);
        mockKeychain.setInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        };

        const result = await AuthService.login(credentials);

        // Should still succeed even if keychain fails
        expect(result.success).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
      });
    });

    describe('register', () => {
      it('should register successfully', async () => {
        const mockRegisterResponse = {
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

        mockApiService.register.mockResolvedValueOnce(mockRegisterResponse);
        mockKeychain.setInternetCredentials.mockResolvedValueOnce(true);

        const userData = {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123'
        };

        const result = await AuthService.register(userData);

        expect(mockApiService.register).toHaveBeenCalledWith(userData);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
        expect(result).toEqual({
          success: true,
          user: mockRegisterResponse.data.user,
          token: mockRegisterResponse.data.token
        });
      });

      it('should handle registration failure', async () => {
        const mockError = new Error('Email already exists');
        mockApiService.register.mockRejectedValueOnce(mockError);

        const userData = {
          name: 'User',
          email: 'existing@example.com',
          password: 'password123'
        };

        const result = await AuthService.register(userData);

        expect(result).toEqual({
          success: false,
          error: 'Email already exists'
        });
      });
    });

    describe('logout', () => {
      it('should logout successfully and clear all data', async () => {
        mockKeychain.resetInternetCredentials.mockResolvedValueOnce(true);

        await AuthService.logout();

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userData');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('fcmToken');
        expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith('RainbowSeeker');
      });

      it('should handle keychain reset failure gracefully', async () => {
        mockKeychain.resetInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

        await expect(AuthService.logout()).resolves.not.toThrow();
        expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Token Management', () => {
    describe('getAuthToken', () => {
      it('should return stored auth token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('mock-stored-token');

        const token = await AuthService.getAuthToken();

        expect(AsyncStorage.getItem).toHaveBeenCalledWith('authToken');
        expect(token).toBe('mock-stored-token');
      });

      it('should return null when no token stored', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);

        const token = await AuthService.getAuthToken();

        expect(token).toBeNull();
      });
    });

    describe('isAuthenticated', () => {
      it('should return true when token exists', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('mock-token');

        const isAuth = await AuthService.isAuthenticated();

        expect(isAuth).toBe(true);
      });

      it('should return false when no token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);

        const isAuth = await AuthService.isAuthenticated();

        expect(isAuth).toBe(false);
      });
    });

    describe('setAuthToken', () => {
      it('should store auth token', async () => {
        await AuthService.setAuthToken('new-token');

        expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
      });
    });
  });

  describe('User Data Management', () => {
    describe('getCurrentUser', () => {
      it('should return stored user data when available', async () => {
        const mockUserData = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        };

        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockUserData));

        const user = await AuthService.getCurrentUser();

        expect(AsyncStorage.getItem).toHaveBeenCalledWith('userData');
        expect(user).toEqual(mockUserData);
      });

      it('should fetch user data from API when not stored', async () => {
        const mockApiUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          bio: 'Rainbow lover'
        };

        AsyncStorage.getItem.mockResolvedValueOnce(null);
        mockApiService.getCurrentUser.mockResolvedValueOnce({
          success: true,
          data: mockApiUser
        });

        const user = await AuthService.getCurrentUser();

        expect(mockApiService.getCurrentUser).toHaveBeenCalled();
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockApiUser));
        expect(user).toEqual(mockApiUser);
      });

      it('should return null when API call fails', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);
        mockApiService.getCurrentUser.mockRejectedValueOnce(new Error('API error'));

        const user = await AuthService.getCurrentUser();

        expect(user).toBeNull();
      });

      it('should handle malformed stored user data', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('invalid-json');

        const user = await AuthService.getCurrentUser();

        expect(user).toBeNull();
      });
    });

    describe('updateUserData', () => {
      it('should update and store user data', async () => {
        const updatedUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Updated Name',
          bio: 'Updated bio'
        };

        await AuthService.updateUserData(updatedUser);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(updatedUser));
      });
    });

    describe('refreshUserData', () => {
      it('should fetch and store fresh user data', async () => {
        const mockApiUser = {
          id: 1,
          email: 'test@example.com',
          name: 'Fresh User Data'
        };

        mockApiService.getCurrentUser.mockResolvedValueOnce({
          success: true,
          data: mockApiUser
        });

        const user = await AuthService.refreshUserData();

        expect(mockApiService.getCurrentUser).toHaveBeenCalled();
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockApiUser));
        expect(user).toEqual(mockApiUser);
      });

      it('should handle refresh failure', async () => {
        mockApiService.getCurrentUser.mockRejectedValueOnce(new Error('Network error'));

        const user = await AuthService.refreshUserData();

        expect(user).toBeNull();
      });
    });
  });

  describe('Auto-login and Credential Recovery', () => {
    describe('tryAutoLogin', () => {
      it('should auto-login with stored credentials', async () => {
        const mockCredentials = {
          username: 'test@example.com',
          password: 'password123'
        };

        const mockLoginResponse = {
          success: true,
          data: {
            token: 'auto-login-token',
            user: { id: 1, email: 'test@example.com' }
          }
        };

        mockKeychain.getInternetCredentials.mockResolvedValueOnce(mockCredentials);
        mockApiService.login.mockResolvedValueOnce(mockLoginResponse);

        const result = await AuthService.tryAutoLogin();

        expect(mockKeychain.getInternetCredentials).toHaveBeenCalledWith('RainbowSeeker');
        expect(mockApiService.login).toHaveBeenCalledWith({
          email: mockCredentials.username,
          password: mockCredentials.password
        });
        expect(result).toEqual({
          success: true,
          user: mockLoginResponse.data.user,
          token: mockLoginResponse.data.token
        });
      });

      it('should return false when no stored credentials', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

        const result = await AuthService.tryAutoLogin();

        expect(result).toEqual({ success: false });
      });

      it('should handle auto-login failure', async () => {
        const mockCredentials = {
          username: 'test@example.com',
          password: 'old-password'
        };

        mockKeychain.getInternetCredentials.mockResolvedValueOnce(mockCredentials);
        mockApiService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

        const result = await AuthService.tryAutoLogin();

        expect(result).toEqual({
          success: false,
          error: 'Invalid credentials'
        });
      });
    });

    describe('hasStoredCredentials', () => {
      it('should return true when credentials are stored', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValueOnce({
          username: 'test@example.com',
          password: 'password123'
        });

        const hasCredentials = await AuthService.hasStoredCredentials();

        expect(hasCredentials).toBe(true);
      });

      it('should return false when no credentials stored', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

        const hasCredentials = await AuthService.hasStoredCredentials();

        expect(hasCredentials).toBe(false);
      });
    });
  });

  describe('FCM Token Management', () => {
    describe('setupFCMToken', () => {
      it('should setup FCM token successfully', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(1); // AUTHORIZED
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        await AuthService.setupFCMToken();

        expect(mockMessaging.getToken).toHaveBeenCalled();
        expect(mockApiService.registerFCMToken).toHaveBeenCalledWith('mock-fcm-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('fcmToken', 'mock-fcm-token');
      });

      it('should request permission when not granted', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(0); // NOT_DETERMINED
        mockMessaging.requestPermission.mockResolvedValueOnce(1); // AUTHORIZED
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        await AuthService.setupFCMToken();

        expect(mockMessaging.requestPermission).toHaveBeenCalled();
        expect(mockMessaging.getToken).toHaveBeenCalled();
      });

      it('should handle permission denied', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(-1); // DENIED
        mockMessaging.requestPermission.mockResolvedValueOnce(-1); // DENIED

        await expect(AuthService.setupFCMToken()).resolves.not.toThrow();
        expect(mockMessaging.getToken).not.toHaveBeenCalled();
      });

      it('should handle FCM token registration failure', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(1);
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockRejectedValueOnce(new Error('Registration failed'));

        await expect(AuthService.setupFCMToken()).resolves.not.toThrow();
        expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('fcmToken', expect.any(String));
      });
    });

    describe('getFCMToken', () => {
      it('should return stored FCM token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('stored-fcm-token');

        const token = await AuthService.getFCMToken();

        expect(AsyncStorage.getItem).toHaveBeenCalledWith('fcmToken');
        expect(token).toBe('stored-fcm-token');
      });
    });

    describe('updateFCMToken', () => {
      it('should update FCM token', async () => {
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        await AuthService.updateFCMToken('new-fcm-token');

        expect(mockApiService.registerFCMToken).toHaveBeenCalledWith('new-fcm-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('fcmToken', 'new-fcm-token');
      });

      it('should handle FCM token update failure', async () => {
        mockApiService.registerFCMToken.mockRejectedValueOnce(new Error('Update failed'));

        await expect(AuthService.updateFCMToken('new-fcm-token')).resolves.not.toThrow();
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('Session Management', () => {
    describe('clearSession', () => {
      it('should clear all session data', async () => {
        await AuthService.clearSession();

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userData');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('fcmToken');
      });
    });

    describe('validateSession', () => {
      it('should validate session with valid token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('valid-token');
        mockApiService.getCurrentUser.mockResolvedValueOnce({
          success: true,
          data: { id: 1, email: 'test@example.com' }
        });

        const isValid = await AuthService.validateSession();

        expect(isValid).toBe(true);
      });

      it('should invalidate session with invalid token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('invalid-token');
        mockApiService.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));

        const isValid = await AuthService.validateSession();

        expect(isValid).toBe(false);
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userData');
      });

      it('should handle missing token', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);

        const isValid = await AuthService.validateSession();

        expect(isValid).toBe(false);
        expect(mockApiService.getCurrentUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const token = await AuthService.getAuthToken();

      expect(token).toBeNull();
    });

    it('should handle keychain errors gracefully', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      const hasCredentials = await AuthService.hasStoredCredentials();

      expect(hasCredentials).toBe(false);
    });

    it('should handle messaging service errors gracefully', async () => {
      mockMessaging.hasPermission.mockRejectedValueOnce(new Error('FCM error'));

      await expect(AuthService.setupFCMToken()).resolves.not.toThrow();
    });
  });
});