import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

// Mock services
const mockApiService = {
  getCurrentWeather: jest.fn(),
  getRainbowPrediction: jest.fn(),
  getRainbows: jest.fn(),
  getNearbyRainbows: jest.fn(),
};

const mockLocationService = {
  getCurrentLocation: jest.fn(),
  checkLocationPermission: jest.fn(),
  requestLocationPermission: jest.fn(),
};

const mockNotificationService = {
  checkNotificationPermission: jest.fn(),
  requestNotificationPermission: jest.fn(),
};

jest.mock('../../services/ApiService', () => mockApiService);
jest.mock('../../services/LocationService', () => mockLocationService);
jest.mock('../../services/NotificationService', () => mockNotificationService);

// Mock React Native components
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

// Mock react-native-flash-message
jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationService.checkLocationPermission.mockResolvedValue(true);
    mockNotificationService.checkNotificationPermission.mockResolvedValue(true);
  });

  describe('Initial Render', () => {
    it('should render home screen successfully', async () => {
      const mockWeatherData = {
        temperature: 22.5,
        humidity: 75,
        description: 'partly cloudy',
        pressure: 1013.2
      };

      const mockPredictionData = {
        probability: 0.75,
        confidence: 'high',
        recommendation: 'Great conditions for rainbow watching!'
      };

      mockApiService.getCurrentWeather.mockResolvedValueOnce({
        success: true,
        data: mockWeatherData
      });

      mockApiService.getRainbowPrediction.mockResolvedValueOnce({
        success: true,
        data: mockPredictionData
      });

      mockLocationService.getCurrentLocation.mockResolvedValueOnce({
        latitude: 36.0687,
        longitude: 137.9646
      });

      const { getByText, getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      // Check for key UI elements
      expect(getByText('Rainbow Seeker')).toBeTruthy();
      
      // Wait for data to load
      await waitFor(() => {
        expect(getByText('22.5°C')).toBeTruthy();
        expect(getByText('75%')).toBeTruthy();
        expect(getByText('Great conditions for rainbow watching!')).toBeTruthy();
      });
    });

    it('should handle loading state correctly', () => {
      mockApiService.getCurrentWeather.mockReturnValueOnce(new Promise(() => {})); // Never resolves
      mockApiService.getRainbowPrediction.mockReturnValueOnce(new Promise(() => {}));

      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      // Should show loading indicators
      expect(getByTestId('weather-loading')).toBeTruthy();
      expect(getByTestId('prediction-loading')).toBeTruthy();
    });

    it('should handle permission requests on mount', async () => {
      mockLocationService.checkLocationPermission.mockResolvedValueOnce(false);
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(true);
      mockNotificationService.checkNotificationPermission.mockResolvedValueOnce(false);
      mockNotificationService.requestNotificationPermission.mockResolvedValueOnce({ granted: true });

      render(<HomeScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockLocationService.requestLocationPermission).toHaveBeenCalled();
        expect(mockNotificationService.requestNotificationPermission).toHaveBeenCalled();
      });
    });
  });

  describe('Weather Display', () => {
    it('should display current weather data correctly', async () => {
      const mockWeatherData = {
        temperature: 25.0,
        humidity: 80,
        pressure: 1015.5,
        wind_speed: 3.2,
        description: 'cloudy',
        visibility: 12.0,
        uv_index: 6
      };

      mockApiService.getCurrentWeather.mockResolvedValueOnce({
        success: true,
        data: mockWeatherData
      });

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('25.0°C')).toBeTruthy();
        expect(getByText('80%')).toBeTruthy();
        expect(getByText('1015.5 hPa')).toBeTruthy();
        expect(getByText('3.2 m/s')).toBeTruthy();
        expect(getByText('cloudy')).toBeTruthy();
      });
    });

    it('should handle weather data error gracefully', async () => {
      mockApiService.getCurrentWeather.mockRejectedValueOnce(new Error('Weather API error'));

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Weather data unavailable')).toBeTruthy();
      });
    });

    it('should refresh weather data on pull to refresh', async () => {
      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('home-scroll-view');
      
      await act(async () => {
        fireEvent(scrollView, 'refresh');
      });

      expect(mockApiService.getCurrentWeather).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('Rainbow Prediction', () => {
    it('should display high probability prediction correctly', async () => {
      const mockPredictionData = {
        probability: 0.85,
        confidence: 'high',
        prediction: 1,
        recommendation: 'Excellent rainbow conditions!',
        factors: {
          temperature: 'optimal',
          humidity: 'good',
          wind: 'favorable'
        }
      };

      mockApiService.getRainbowPrediction.mockResolvedValueOnce({
        success: true,
        data: mockPredictionData
      });

      const { getByText, getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('85%')).toBeTruthy();
        expect(getByText('High')).toBeTruthy();
        expect(getByText('Excellent rainbow conditions!')).toBeTruthy();
        expect(getByTestId('prediction-positive')).toBeTruthy();
      });
    });

    it('should display low probability prediction correctly', async () => {
      const mockPredictionData = {
        probability: 0.15,
        confidence: 'low',
        prediction: 0,
        recommendation: 'Poor rainbow conditions.',
        factors: {
          temperature: 'too_cold',
          humidity: 'too_low',
          wind: 'too_strong'
        }
      };

      mockApiService.getRainbowPrediction.mockResolvedValueOnce({
        success: true,
        data: mockPredictionData
      });

      const { getByText, getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('15%')).toBeTruthy();
        expect(getByText('Low')).toBeTruthy();
        expect(getByText('Poor rainbow conditions.')).toBeTruthy();
        expect(getByTestId('prediction-negative')).toBeTruthy();
      });
    });

    it('should handle prediction error gracefully', async () => {
      mockApiService.getRainbowPrediction.mockRejectedValueOnce(new Error('Prediction API error'));

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Prediction unavailable')).toBeTruthy();
      });
    });
  });

  describe('Recent Rainbows', () => {
    it('should display recent rainbow sightings', async () => {
      const mockRainbows = [
        {
          id: 1,
          description: 'Beautiful double rainbow',
          timestamp: '2023-06-15T14:30:00Z',
          user_name: 'User1',
          image_url: 'https://example.com/rainbow1.jpg',
          latitude: 36.0687,
          longitude: 137.9646
        },
        {
          id: 2,
          description: 'Stunning rainbow after rain',
          timestamp: '2023-06-15T13:00:00Z',
          user_name: 'User2',
          image_url: 'https://example.com/rainbow2.jpg',
          latitude: 36.0690,
          longitude: 137.9650
        }
      ];

      mockApiService.getRainbows.mockResolvedValueOnce({
        success: true,
        data: mockRainbows
      });

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Beautiful double rainbow')).toBeTruthy();
        expect(getByText('Stunning rainbow after rain')).toBeTruthy();
        expect(getByText('User1')).toBeTruthy();
        expect(getByText('User2')).toBeTruthy();
      });
    });

    it('should handle empty rainbow list', async () => {
      mockApiService.getRainbows.mockResolvedValueOnce({
        success: true,
        data: []
      });

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No recent rainbow sightings')).toBeTruthy();
      });
    });

    it('should navigate to rainbow detail on tap', async () => {
      const mockRainbows = [
        {
          id: 1,
          description: 'Test rainbow',
          timestamp: '2023-06-15T14:30:00Z',
          user_name: 'TestUser'
        }
      ];

      mockApiService.getRainbows.mockResolvedValueOnce({
        success: true,
        data: mockRainbows
      });

      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        const rainbowItem = getByTestId('rainbow-item-1');
        fireEvent.press(rainbowItem);
        
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RainbowDetail', {
          rainbowId: 1
        });
      });
    });
  });

  describe('Quick Actions', () => {
    it('should navigate to camera screen when camera button pressed', () => {
      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      const cameraButton = getByTestId('camera-button');
      fireEvent.press(cameraButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Camera');
    });

    it('should navigate to map screen when map button pressed', () => {
      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      const mapButton = getByTestId('map-button');
      fireEvent.press(mapButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Map');
    });

    it('should navigate to notifications when notification button pressed', () => {
      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      const notificationButton = getByTestId('notification-button');
      fireEvent.press(notificationButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Notifications');
    });
  });

  describe('Location Integration', () => {
    it('should use current location for nearby rainbows', async () => {
      const mockLocation = {
        latitude: 36.0687,
        longitude: 137.9646
      };

      mockLocationService.getCurrentLocation.mockResolvedValueOnce(mockLocation);
      mockApiService.getNearbyRainbows.mockResolvedValueOnce({
        success: true,
        data: []
      });

      render(<HomeScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockApiService.getNearbyRainbows).toHaveBeenCalledWith(
          36.0687, 137.9646, 10
        );
      });
    });

    it('should handle location permission denied', async () => {
      mockLocationService.checkLocationPermission.mockResolvedValueOnce(false);
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(false);

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Location permission required')).toBeTruthy();
      });
    });

    it('should handle location service error', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValueOnce(
        new Error('Location service unavailable')
      );

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Using default location')).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update predictions periodically', async () => {
      jest.useFakeTimers();

      render(<HomeScreen navigation={mockNavigation} />);

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockApiService.getRainbowPrediction).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should handle network connectivity changes', async () => {
      const { rerender } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      // Simulate network disconnection
      mockApiService.getCurrentWeather.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      rerender(<HomeScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Check your internet connection')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Current weather information')).toBeTruthy();
      expect(getByLabelText('Rainbow prediction')).toBeTruthy();
      expect(getByLabelText('Open camera to capture rainbow')).toBeTruthy();
      expect(getByLabelText('View rainbow map')).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByAccessibilityRole } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      expect(getByAccessibilityRole('button')).toBeTruthy(); // Camera button
      expect(getByAccessibilityRole('text')).toBeTruthy(); // Weather text
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error in a child component
      mockApiService.getCurrentWeather.mockImplementationOnce(() => {
        throw new Error('Component error');
      });

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      expect(getByText('Something went wrong')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      // Unmount the component
      unmount();

      // Verify cleanup
      expect(clearInterval).toHaveBeenCalled();
      expect(mockNavigation.removeListener).toHaveBeenCalled();
    });

    it('should debounce rapid user interactions', async () => {
      const { getByTestId } = render(
        <HomeScreen navigation={mockNavigation} />
      );

      const refreshButton = getByTestId('refresh-button');

      // Rapid taps
      fireEvent.press(refreshButton);
      fireEvent.press(refreshButton);
      fireEvent.press(refreshButton);

      // Should only trigger one refresh
      await waitFor(() => {
        expect(mockApiService.getCurrentWeather).toHaveBeenCalledTimes(2); // Initial + one refresh
      });
    });
  });
});