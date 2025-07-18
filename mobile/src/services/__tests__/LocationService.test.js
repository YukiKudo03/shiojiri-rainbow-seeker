import LocationService from '../LocationService';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn(),
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    request: jest.fn(),
    check: jest.fn(),
  },
}));

// Mock react-native-flash-message
jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('Permission Management', () => {
    describe('requestLocationPermission', () => {
      it('should request permission on Android and return granted', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);

        const result = await LocationService.requestLocationPermission();

        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          expect.objectContaining({
            title: expect.any(String),
            message: expect.any(String),
          })
        );
        expect(result).toBe(true);
      });

      it('should return true if permission already granted on Android', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);

        const result = await LocationService.requestLocationPermission();

        expect(PermissionsAndroid.request).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle permission denied on Android', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

        const result = await LocationService.requestLocationPermission();

        expect(result).toBe(false);
      });

      it('should request authorization on iOS', async () => {
        Platform.OS = 'ios';
        Geolocation.requestAuthorization.mockResolvedValueOnce('granted');

        const result = await LocationService.requestLocationPermission();

        expect(Geolocation.requestAuthorization).toHaveBeenCalledWith('whenInUse');
        expect(result).toBe(true);
      });

      it('should handle iOS authorization denied', async () => {
        Platform.OS = 'ios';
        Geolocation.requestAuthorization.mockResolvedValueOnce('denied');

        const result = await LocationService.requestLocationPermission();

        expect(result).toBe(false);
      });

      it('should handle permission request errors', async () => {
        PermissionsAndroid.check.mockRejectedValueOnce(new Error('Permission error'));

        const result = await LocationService.requestLocationPermission();

        expect(result).toBe(false);
      });
    });

    describe('checkLocationPermission', () => {
      it('should check permission status on Android', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);

        const hasPermission = await LocationService.checkLocationPermission();

        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        expect(hasPermission).toBe(true);
      });

      it('should return false when permission not granted on Android', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(false);

        const hasPermission = await LocationService.checkLocationPermission();

        expect(hasPermission).toBe(false);
      });

      it('should handle permission check errors', async () => {
        PermissionsAndroid.check.mockRejectedValueOnce(new Error('Check error'));

        const hasPermission = await LocationService.checkLocationPermission();

        expect(hasPermission).toBe(false);
      });
    });
  });

  describe('Location Retrieval', () => {
    describe('getCurrentLocation', () => {
      it('should get current location successfully', async () => {
        const mockPosition = {
          coords: {
            latitude: 36.0687,
            longitude: 137.9646,
            accuracy: 10,
            altitude: 100,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        };

        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.getCurrentPosition.mockImplementationOnce((success) => {
          success(mockPosition);
        });

        const location = await LocationService.getCurrentLocation();

        expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          })
        );

        expect(location).toEqual({
          latitude: mockPosition.coords.latitude,
          longitude: mockPosition.coords.longitude,
          accuracy: mockPosition.coords.accuracy,
          timestamp: mockPosition.timestamp,
        });
      });

      it('should request permission if not granted', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);

        const mockPosition = {
          coords: {
            latitude: 36.0687,
            longitude: 137.9646,
            accuracy: 10,
          },
          timestamp: Date.now(),
        };

        Geolocation.getCurrentPosition.mockImplementationOnce((success) => {
          success(mockPosition);
        });

        const location = await LocationService.getCurrentLocation();

        expect(PermissionsAndroid.request).toHaveBeenCalled();
        expect(location).toBeDefined();
      });

      it('should handle permission denied', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

        await expect(LocationService.getCurrentLocation()).rejects.toThrow('Location permission denied');
      });

      it('should handle location service disabled', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
          error({
            code: 2, // POSITION_UNAVAILABLE
            message: 'Location service disabled',
          });
        });

        await expect(LocationService.getCurrentLocation()).rejects.toThrow('Location service disabled');
      });

      it('should handle timeout error', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
          error({
            code: 3, // TIMEOUT
            message: 'Location request timed out',
          });
        });

        await expect(LocationService.getCurrentLocation()).rejects.toThrow('Location request timed out');
      });

      it('should use high accuracy by default', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.getCurrentPosition.mockImplementationOnce((success) => {
          success({
            coords: { latitude: 36.0687, longitude: 137.9646, accuracy: 5 },
            timestamp: Date.now(),
          });
        });

        await LocationService.getCurrentLocation();

        expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            enableHighAccuracy: true,
          })
        );
      });

      it('should allow custom options', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.getCurrentPosition.mockImplementationOnce((success) => {
          success({
            coords: { latitude: 36.0687, longitude: 137.9646, accuracy: 5 },
            timestamp: Date.now(),
          });
        });

        const customOptions = {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        };

        await LocationService.getCurrentLocation(customOptions);

        expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining(customOptions)
        );
      });
    });

    describe('watchLocation', () => {
      it('should start watching location successfully', async () => {
        const mockWatchId = 123;
        const mockCallback = jest.fn();

        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.watchPosition.mockReturnValueOnce(mockWatchId);

        const watchId = await LocationService.watchLocation(mockCallback);

        expect(Geolocation.watchPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            enableHighAccuracy: true,
            distanceFilter: 10,
            interval: 5000,
            fastestInterval: 2000,
          })
        );

        expect(watchId).toBe(mockWatchId);
      });

      it('should call callback with location updates', async () => {
        const mockCallback = jest.fn();
        const mockPosition = {
          coords: {
            latitude: 36.0687,
            longitude: 137.9646,
            accuracy: 10,
          },
          timestamp: Date.now(),
        };

        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.watchPosition.mockImplementationOnce((success) => {
          success(mockPosition);
          return 123;
        });

        await LocationService.watchLocation(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith({
          latitude: mockPosition.coords.latitude,
          longitude: mockPosition.coords.longitude,
          accuracy: mockPosition.coords.accuracy,
          timestamp: mockPosition.timestamp,
        });
      });

      it('should handle watch location errors', async () => {
        const mockCallback = jest.fn();
        const mockErrorCallback = jest.fn();

        PermissionsAndroid.check.mockResolvedValueOnce(true);
        Geolocation.watchPosition.mockImplementationOnce((success, error) => {
          error({
            code: 2,
            message: 'Location unavailable',
          });
          return 123;
        });

        await LocationService.watchLocation(mockCallback, mockErrorCallback);

        expect(mockErrorCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 2,
            message: 'Location unavailable',
          })
        );
      });

      it('should request permission if not granted for watching', async () => {
        const mockCallback = jest.fn();

        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
        Geolocation.watchPosition.mockReturnValueOnce(123);

        await LocationService.watchLocation(mockCallback);

        expect(PermissionsAndroid.request).toHaveBeenCalled();
        expect(Geolocation.watchPosition).toHaveBeenCalled();
      });
    });

    describe('clearLocationWatch', () => {
      it('should clear location watch', () => {
        const watchId = 123;

        LocationService.clearLocationWatch(watchId);

        expect(Geolocation.clearWatch).toHaveBeenCalledWith(watchId);
      });

      it('should handle clearing invalid watch ID', () => {
        expect(() => {
          LocationService.clearLocationWatch(null);
        }).not.toThrow();

        expect(Geolocation.clearWatch).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Location Utilities', () => {
    describe('calculateDistance', () => {
      it('should calculate distance between two points correctly', () => {
        const point1 = { latitude: 36.0687, longitude: 137.9646 };
        const point2 = { latitude: 36.0697, longitude: 137.9656 };

        const distance = LocationService.calculateDistance(
          point1.latitude,
          point1.longitude,
          point2.latitude,
          point2.longitude
        );

        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(1); // Should be less than 1km for these close points
      });

      it('should return 0 for identical points', () => {
        const distance = LocationService.calculateDistance(
          36.0687,
          137.9646,
          36.0687,
          137.9646
        );

        expect(distance).toBe(0);
      });

      it('should calculate long distances correctly', () => {
        // Distance between Shiojiri and Tokyo (approximately 200km)
        const distance = LocationService.calculateDistance(
          36.0687, // Shiojiri
          137.9646,
          35.6762, // Tokyo
          139.6503
        );

        expect(distance).toBeGreaterThan(150);
        expect(distance).toBeLessThan(250);
      });

      it('should handle negative coordinates', () => {
        const distance = LocationService.calculateDistance(
          -34.6037, // Sydney
          151.2827,
          40.7128, // New York
          -74.0060
        );

        expect(distance).toBeGreaterThan(15000); // Should be > 15,000km
      });
    });

    describe('isInShiojiriArea', () => {
      it('should return true for locations in Shiojiri', () => {
        const shiojiriLocation = { latitude: 36.0687, longitude: 137.9646 };

        const isInArea = LocationService.isInShiojiriArea(
          shiojiriLocation.latitude,
          shiojiriLocation.longitude
        );

        expect(isInArea).toBe(true);
      });

      it('should return true for locations near Shiojiri', () => {
        // Slightly offset from Shiojiri center
        const nearShiojiri = { latitude: 36.0700, longitude: 137.9650 };

        const isInArea = LocationService.isInShiojiriArea(
          nearShiojiri.latitude,
          nearShiojiri.longitude
        );

        expect(isInArea).toBe(true);
      });

      it('should return false for locations far from Shiojiri', () => {
        // Tokyo coordinates
        const tokyoLocation = { latitude: 35.6762, longitude: 139.6503 };

        const isInArea = LocationService.isInShiojiriArea(
          tokyoLocation.latitude,
          tokyoLocation.longitude
        );

        expect(isInArea).toBe(false);
      });

      it('should use custom radius when provided', () => {
        // Location just outside default 20km radius but within 50km
        const distantLocation = { latitude: 36.2000, longitude: 138.2000 };

        const isInAreaDefault = LocationService.isInShiojiriArea(
          distantLocation.latitude,
          distantLocation.longitude
        );

        const isInAreaCustom = LocationService.isInShiojiriArea(
          distantLocation.latitude,
          distantLocation.longitude,
          50 // 50km radius
        );

        expect(isInAreaDefault).toBe(false);
        expect(isInAreaCustom).toBe(true);
      });
    });

    describe('formatLocation', () => {
      it('should format coordinates correctly', () => {
        const formatted = LocationService.formatLocation(36.068712, 137.964567);

        expect(formatted).toBe('36.0687, 137.9646');
      });

      it('should handle negative coordinates', () => {
        const formatted = LocationService.formatLocation(-34.6037, -58.3816);

        expect(formatted).toBe('-34.6037, -58.3816');
      });

      it('should handle zero coordinates', () => {
        const formatted = LocationService.formatLocation(0, 0);

        expect(formatted).toBe('0.0000, 0.0000');
      });
    });

    describe('validateCoordinates', () => {
      it('should validate correct coordinates', () => {
        const isValid = LocationService.validateCoordinates(36.0687, 137.9646);

        expect(isValid).toBe(true);
      });

      it('should reject invalid latitude', () => {
        const invalidLatitudes = [91, -91, 180, -180];

        invalidLatitudes.forEach(lat => {
          const isValid = LocationService.validateCoordinates(lat, 137.9646);
          expect(isValid).toBe(false);
        });
      });

      it('should reject invalid longitude', () => {
        const invalidLongitudes = [181, -181, 360, -360];

        invalidLongitudes.forEach(lon => {
          const isValid = LocationService.validateCoordinates(36.0687, lon);
          expect(isValid).toBe(false);
        });
      });

      it('should handle edge cases', () => {
        // Valid edge cases
        expect(LocationService.validateCoordinates(90, 180)).toBe(true);
        expect(LocationService.validateCoordinates(-90, -180)).toBe(true);
        expect(LocationService.validateCoordinates(0, 0)).toBe(true);
      });

      it('should handle non-numeric values', () => {
        expect(LocationService.validateCoordinates('36.0687', 137.9646)).toBe(false);
        expect(LocationService.validateCoordinates(36.0687, 'invalid')).toBe(false);
        expect(LocationService.validateCoordinates(null, 137.9646)).toBe(false);
        expect(LocationService.validateCoordinates(36.0687, undefined)).toBe(false);
      });
    });
  });

  describe('Location Service Integration', () => {
    describe('getLocationWithRetry', () => {
      it('should get location with retry on failure', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);

        // First call fails, second succeeds
        Geolocation.getCurrentPosition
          .mockImplementationOnce((success, error) => {
            error({ code: 3, message: 'Timeout' });
          })
          .mockImplementationOnce((success) => {
            success({
              coords: { latitude: 36.0687, longitude: 137.9646, accuracy: 10 },
              timestamp: Date.now(),
            });
          });

        const location = await LocationService.getLocationWithRetry(2);

        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
        expect(location).toBeDefined();
        expect(location.latitude).toBe(36.0687);
      });

      it('should fail after max retries', async () => {
        PermissionsAndroid.check.mockResolvedValueOnce(true);

        Geolocation.getCurrentPosition.mockImplementation((success, error) => {
          error({ code: 3, message: 'Timeout' });
        });

        await expect(LocationService.getLocationWithRetry(2)).rejects.toThrow();
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      });
    });

    describe('getBestLocation', () => {
      it('should return location with best accuracy', async () => {
        const mockLocations = [
          { latitude: 36.0687, longitude: 137.9646, accuracy: 20 },
          { latitude: 36.0688, longitude: 137.9647, accuracy: 5 }, // Best accuracy
          { latitude: 36.0689, longitude: 137.9648, accuracy: 15 },
        ];

        PermissionsAndroid.check.mockResolvedValue(true);

        let callCount = 0;
        Geolocation.getCurrentPosition.mockImplementation((success) => {
          success({
            coords: mockLocations[callCount],
            timestamp: Date.now(),
          });
          callCount++;
        });

        const bestLocation = await LocationService.getBestLocation(3, 1000);

        expect(bestLocation.accuracy).toBe(5); // Should return the most accurate
      });

      it('should timeout if no good location found', async () => {
        PermissionsAndroid.check.mockResolvedValue(true);

        Geolocation.getCurrentPosition.mockImplementation((success) => {
          success({
            coords: { latitude: 36.0687, longitude: 137.9646, accuracy: 100 },
            timestamp: Date.now(),
          });
        });

        const startTime = Date.now();
        await LocationService.getBestLocation(5, 100); // 100ms timeout
        const endTime = Date.now();

        expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle geolocation service unavailable', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);
      Geolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          message: 'Geolocation service unavailable',
        });
      });

      await expect(LocationService.getCurrentLocation()).rejects.toThrow('Geolocation service unavailable');
    });

    it('should handle platform-specific permission errors', async () => {
      Platform.OS = 'ios';
      Geolocation.requestAuthorization.mockRejectedValueOnce(new Error('iOS permission error'));

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
    });
  });
});