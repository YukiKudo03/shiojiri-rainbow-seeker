import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../MapScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  goBack: jest.fn(),
};

// Mock services
const mockApiService = {
  getRainbows: jest.fn(),
  getNearbyRainbows: jest.fn(),
  getRainbowById: jest.fn(),
  getCurrentWeather: jest.fn(),
};

const mockLocationService = {
  getCurrentLocation: jest.fn(),
  checkLocationPermission: jest.fn(),
  requestLocationPermission: jest.fn(),
  watchLocation: jest.fn(),
  clearLocationWatch: jest.fn(),
};

jest.mock('../../services/ApiService', () => mockApiService);
jest.mock('../../services/LocationService', () => mockLocationService);

// Mock react-native-maps
const mockMapView = {
  animateToRegion: jest.fn(),
  animateCamera: jest.fn(),
  getCamera: jest.fn(),
};

jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => mockMapView);
    return React.createElement('MapView', props);
  }),
  Marker: (props) => React.createElement('Marker', props),
  Circle: (props) => React.createElement('Circle', props),
  Callout: (props) => React.createElement('Callout', props),
  PROVIDER_GOOGLE: 'google',
}));

// Mock react-native components
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
}));

// Mock react-native-flash-message
jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

describe('MapScreen', () => {
  const mockRainbowData = [
    {
      id: 1,
      latitude: 36.0687,
      longitude: 137.9646,
      description: 'Beautiful rainbow near Shiojiri Station',
      timestamp: '2023-06-15T14:30:00Z',
      user_name: 'User1',
      image_url: 'https://example.com/rainbow1.jpg'
    },
    {
      id: 2,
      latitude: 36.0700,
      longitude: 137.9660,
      description: 'Double rainbow spotted',
      timestamp: '2023-06-15T13:15:00Z',
      user_name: 'User2',
      image_url: 'https://example.com/rainbow2.jpg'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationService.checkLocationPermission.mockResolvedValue(true);
    mockLocationService.getCurrentLocation.mockResolvedValue({
      latitude: 36.0687,
      longitude: 137.9646
    });
    mockApiService.getRainbows.mockResolvedValue({
      success: true,
      data: mockRainbowData
    });
  });

  describe('Initial Render', () => {
    it('should render map screen successfully', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      expect(getByTestId('rainbow-map')).toBeTruthy();
      expect(getByTestId('location-button')).toBeTruthy();
      expect(getByTestId('filter-button')).toBeTruthy();
    });

    it('should load rainbow markers on mount', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(mockApiService.getRainbows).toHaveBeenCalled();
        expect(getByTestId('rainbow-marker-1')).toBeTruthy();
        expect(getByTestId('rainbow-marker-2')).toBeTruthy();
      });
    });

    it('should request location permission if not granted', async () => {
      mockLocationService.checkLocationPermission.mockResolvedValueOnce(false);
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(true);

      render(<MapScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockLocationService.requestLocationPermission).toHaveBeenCalled();
      });
    });
  });

  describe('Map Interaction', () => {
    it('should center map on user location when location button pressed', async () => {
      const mockUserLocation = {
        latitude: 36.0687,
        longitude: 137.9646
      };

      mockLocationService.getCurrentLocation.mockResolvedValueOnce(mockUserLocation);

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const locationButton = getByTestId('location-button');
      fireEvent.press(locationButton);

      await waitFor(() => {
        expect(mockMapView.animateToRegion).toHaveBeenCalledWith({
          latitude: 36.0687,
          longitude: 137.9646,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      });
    });

    it('should handle map region change events', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const mapView = getByTestId('rainbow-map');
      
      await act(async () => {
        fireEvent(mapView, 'regionChangeComplete', {
          latitude: 36.0700,
          longitude: 137.9650,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        });
      });

      // Should load nearby rainbows for new region
      expect(mockApiService.getNearbyRainbows).toHaveBeenCalledWith(
        36.0700, 137.9650, expect.any(Number)
      );
    });

    it('should show loading indicator during map data fetch', () => {
      mockApiService.getRainbows.mockReturnValueOnce(new Promise(() => {})); // Never resolves

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      expect(getByTestId('map-loading')).toBeTruthy();
    });
  });

  describe('Rainbow Markers', () => {
    it('should display rainbow markers with correct data', async () => {
      const { getByTestId, getByText } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        const marker1 = getByTestId('rainbow-marker-1');
        const marker2 = getByTestId('rainbow-marker-2');
        
        expect(marker1).toBeTruthy();
        expect(marker2).toBeTruthy();
      });
    });

    it('should show marker callout when marker pressed', async () => {
      const { getByTestId, getByText } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        const marker = getByTestId('rainbow-marker-1');
        fireEvent.press(marker);
        
        expect(getByText('Beautiful rainbow near Shiojiri Station')).toBeTruthy();
        expect(getByText('User1')).toBeTruthy();
      });
    });

    it('should navigate to rainbow detail when callout pressed', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        const callout = getByTestId('rainbow-callout-1');
        fireEvent.press(callout);
        
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RainbowDetail', {
          rainbowId: 1
        });
      });
    });

    it('should cluster nearby markers when zoomed out', async () => {
      // Add many close markers
      const manyRainbows = Array(20).fill().map((_, i) => ({
        id: i + 1,
        latitude: 36.0687 + (i * 0.001),
        longitude: 137.9646 + (i * 0.001),
        description: `Rainbow ${i + 1}`,
        timestamp: '2023-06-15T14:30:00Z',
        user_name: `User${i + 1}`
      }));

      mockApiService.getRainbows.mockResolvedValueOnce({
        success: true,
        data: manyRainbows
      });

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Should show cluster markers instead of individual ones
        expect(getByTestId('cluster-marker')).toBeTruthy();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should show filter modal when filter button pressed', () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      expect(getByTestId('filter-modal')).toBeTruthy();
    });

    it('should filter rainbows by date range', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      // Open filter modal
      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      // Set date filter
      const dateFilter = getByTestId('date-range-filter');
      fireEvent(dateFilter, 'valueChange', {
        startDate: '2023-06-15',
        endDate: '2023-06-15'
      });

      // Apply filter
      const applyButton = getByTestId('apply-filter-button');
      fireEvent.press(applyButton);

      await waitFor(() => {
        expect(mockApiService.getRainbows).toHaveBeenCalledWith({
          startDate: '2023-06-15',
          endDate: '2023-06-15'
        });
      });
    });

    it('should filter rainbows by distance', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      const distanceSlider = getByTestId('distance-filter');
      fireEvent(distanceSlider, 'valueChange', 5); // 5km radius

      const applyButton = getByTestId('apply-filter-button');
      fireEvent.press(applyButton);

      await waitFor(() => {
        expect(mockApiService.getNearbyRainbows).toHaveBeenCalledWith(
          expect.any(Number), expect.any(Number), 5
        );
      });
    });

    it('should clear all filters', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      const clearButton = getByTestId('clear-filters-button');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(mockApiService.getRainbows).toHaveBeenCalledWith({});
      });
    });
  });

  describe('User Location Tracking', () => {
    it('should track user location when enabled', async () => {
      const mockWatchId = 123;
      mockLocationService.watchLocation.mockReturnValueOnce(mockWatchId);

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const trackingButton = getByTestId('tracking-toggle');
      fireEvent.press(trackingButton);

      expect(mockLocationService.watchLocation).toHaveBeenCalled();
    });

    it('should stop tracking when disabled', async () => {
      const mockWatchId = 123;
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      // Enable tracking first
      const trackingButton = getByTestId('tracking-toggle');
      fireEvent.press(trackingButton);

      // Disable tracking
      fireEvent.press(trackingButton);

      expect(mockLocationService.clearLocationWatch).toHaveBeenCalledWith(mockWatchId);
    });

    it('should update user location marker when location changes', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const newLocation = {
        latitude: 36.0700,
        longitude: 137.9660
      };

      // Simulate location update
      const locationCallback = mockLocationService.watchLocation.mock.calls[0][0];
      locationCallback(newLocation);

      await waitFor(() => {
        const userMarker = getByTestId('user-location-marker');
        expect(userMarker).toBeTruthy();
      });
    });
  });

  describe('Weather Overlay', () => {
    it('should toggle weather overlay', async () => {
      mockApiService.getCurrentWeather.mockResolvedValueOnce({
        success: true,
        data: {
          temperature: 22.5,
          humidity: 75,
          precipitation: 0.0
        }
      });

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const weatherToggle = getByTestId('weather-overlay-toggle');
      fireEvent.press(weatherToggle);

      await waitFor(() => {
        expect(getByTestId('weather-overlay')).toBeTruthy();
      });
    });

    it('should show precipitation radar when available', async () => {
      const mockWeatherData = {
        temperature: 20.0,
        precipitation: 2.5,
        radar_url: 'https://example.com/radar.png'
      };

      mockApiService.getCurrentWeather.mockResolvedValueOnce({
        success: true,
        data: mockWeatherData
      });

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const weatherToggle = getByTestId('weather-overlay-toggle');
      fireEvent.press(weatherToggle);

      await waitFor(() => {
        expect(getByTestId('precipitation-overlay')).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search for locations', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const searchButton = getByTestId('search-button');
      fireEvent.press(searchButton);

      const searchInput = getByTestId('location-search-input');
      fireEvent.changeText(searchInput, 'Shiojiri Station');

      // Should trigger location search
      await waitFor(() => {
        expect(getByTestId('search-results')).toBeTruthy();
      });
    });

    it('should navigate to searched location', async () => {
      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const searchButton = getByTestId('search-button');
      fireEvent.press(searchButton);

      const searchResult = getByTestId('search-result-0');
      fireEvent.press(searchResult);

      expect(mockMapView.animateToRegion).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiService.getRainbows.mockRejectedValueOnce(new Error('API Error'));

      const { getByText } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Failed to load rainbow data')).toBeTruthy();
      });
    });

    it('should handle location permission denied', async () => {
      mockLocationService.checkLocationPermission.mockResolvedValueOnce(false);
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(false);

      const { getByText } = render(
        <MapScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Location permission required for full functionality')).toBeTruthy();
      });
    });

    it('should handle location service errors', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValueOnce(
        new Error('Location service unavailable')
      );

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const locationButton = getByTestId('location-button');
      fireEvent.press(locationButton);

      await waitFor(() => {
        expect(getByText('Unable to get current location')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should cleanup location tracking on unmount', () => {
      const mockWatchId = 123;
      mockLocationService.watchLocation.mockReturnValueOnce(mockWatchId);

      const { unmount } = render(
        <MapScreen navigation={mockNavigation} />
      );

      unmount();

      expect(mockLocationService.clearLocationWatch).toHaveBeenCalledWith(mockWatchId);
    });

    it('should debounce map region changes', async () => {
      jest.useFakeTimers();

      const { getByTestId } = render(
        <MapScreen navigation={mockNavigation} />
      );

      const mapView = getByTestId('rainbow-map');

      // Trigger multiple rapid region changes
      fireEvent(mapView, 'regionChangeComplete', {
        latitude: 36.0700,
        longitude: 137.9650
      });
      fireEvent(mapView, 'regionChangeComplete', {
        latitude: 36.0710,
        longitude: 137.9660
      });
      fireEvent(mapView, 'regionChangeComplete', {
        latitude: 36.0720,
        longitude: 137.9670
      });

      // Fast forward debounce time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should only make one API call
      expect(mockApiService.getNearbyRainbows).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <MapScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Rainbow map')).toBeTruthy();
      expect(getByLabelText('Center map on current location')).toBeTruthy();
      expect(getByLabelText('Filter rainbow sightings')).toBeTruthy();
    });

    it('should support screen reader navigation', async () => {
      const { getByAccessibilityRole } = render(
        <MapScreen navigation={mockNavigation} />
      );

      expect(getByAccessibilityRole('button')).toBeTruthy(); // Location button
      expect(getByAccessibilityRole('map')).toBeTruthy(); // Map view
    });
  });
});