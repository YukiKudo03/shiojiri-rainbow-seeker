import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CameraScreen from '../CameraScreen';

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
  createRainbow: jest.fn(),
};

const mockLocationService = {
  getCurrentLocation: jest.fn(),
  checkLocationPermission: jest.fn(),
  requestLocationPermission: jest.fn(),
};

jest.mock('../../services/ApiService', () => mockApiService);
jest.mock('../../services/LocationService', () => mockLocationService);

// Mock react-native-camera
const mockCameraRef = {
  takePictureAsync: jest.fn(),
  recordAsync: jest.fn(),
  stopRecording: jest.fn(),
};

jest.mock('react-native-camera', () => ({
  RNCamera: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => mockCameraRef);
    return React.createElement('RNCamera', props);
  }),
  Constants: {
    FlashMode: {
      on: 'on',
      off: 'off',
      auto: 'auto',
    },
    Type: {
      back: 'back',
      front: 'front',
    },
  },
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  MediaType: {
    photo: 'photo',
  },
}));

// Mock react-native components
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      CAMERA: 'android.permission.CAMERA',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    request: jest.fn(),
    check: jest.fn(),
  },
  Platform: {
    OS: 'android',
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

// Mock react-native-modal
jest.mock('react-native-modal', () => 'Modal');

describe('CameraScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationService.checkLocationPermission.mockResolvedValue(true);
    mockLocationService.getCurrentLocation.mockResolvedValue({
      latitude: 36.0687,
      longitude: 137.9646
    });
  });

  describe('Initial Render', () => {
    it('should render camera screen successfully', () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      expect(getByTestId('camera-view')).toBeTruthy();
      expect(getByTestId('capture-button')).toBeTruthy();
      expect(getByTestId('gallery-button')).toBeTruthy();
      expect(getByTestId('flash-toggle')).toBeTruthy();
    });

    it('should request camera permissions on mount', async () => {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce('granted');

      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
      });
    });

    it('should show permission denied message when camera permission denied', async () => {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce('denied');

      const { getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Camera permission is required')).toBeTruthy();
      });
    });
  });

  describe('Photo Capture', () => {
    it('should capture photo when capture button pressed', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
        width: 1920,
        height: 1080,
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(mockCameraRef.takePictureAsync).toHaveBeenCalledWith({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
      });
    });

    it('should show photo preview after capture', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
        width: 1920,
        height: 1080,
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(getByTestId('photo-preview')).toBeTruthy();
        expect(getByTestId('save-button')).toBeTruthy();
        expect(getByTestId('retake-button')).toBeTruthy();
      });
    });

    it('should handle photo capture errors', async () => {
      mockCameraRef.takePictureAsync.mockRejectedValueOnce(
        new Error('Camera capture failed')
      );

      const { getByTestId, getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(getByText('Failed to capture photo')).toBeTruthy();
      });
    });

    it('should disable capture button during photo processing', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      mockCameraRef.takePictureAsync.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockPhoto), 1000))
      );

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      // Button should be disabled during capture
      expect(captureButton.props.disabled).toBe(true);
    });
  });

  describe('Gallery Integration', () => {
    it('should open image gallery when gallery button pressed', async () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      const mockResponse = {
        didCancel: false,
        assets: [{
          uri: 'file://path/to/gallery-photo.jpg',
          width: 1920,
          height: 1080,
        }]
      };

      launchImageLibrary.mockImplementationOnce((options, callback) => {
        callback(mockResponse);
      });

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const galleryButton = getByTestId('gallery-button');
      fireEvent.press(galleryButton);

      expect(launchImageLibrary).toHaveBeenCalledWith({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      }, expect.any(Function));
    });

    it('should handle gallery selection cancellation', async () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      const mockResponse = {
        didCancel: true,
      };

      launchImageLibrary.mockImplementationOnce((options, callback) => {
        callback(mockResponse);
      });

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const galleryButton = getByTestId('gallery-button');
      fireEvent.press(galleryButton);

      // Should not show any error or preview
      expect(() => getByTestId('photo-preview')).toThrow();
    });

    it('should handle gallery errors', async () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      const mockResponse = {
        errorMessage: 'Gallery access denied',
      };

      launchImageLibrary.mockImplementationOnce((options, callback) => {
        callback(mockResponse);
      });

      const { getByTestId, getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const galleryButton = getByTestId('gallery-button');
      fireEvent.press(galleryButton);

      await waitFor(() => {
        expect(getByText('Gallery access denied')).toBeTruthy();
      });
    });
  });

  describe('Camera Controls', () => {
    it('should toggle flash mode', async () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const flashToggle = getByTestId('flash-toggle');
      
      // Initial state should be off
      expect(getByTestId('flash-off-icon')).toBeTruthy();

      fireEvent.press(flashToggle);
      expect(getByTestId('flash-on-icon')).toBeTruthy();

      fireEvent.press(flashToggle);
      expect(getByTestId('flash-auto-icon')).toBeTruthy();

      fireEvent.press(flashToggle);
      expect(getByTestId('flash-off-icon')).toBeTruthy();
    });

    it('should switch between front and back camera', async () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const flipButton = getByTestId('camera-flip-button');
      fireEvent.press(flipButton);

      // Should trigger camera type change
      await waitFor(() => {
        const cameraView = getByTestId('camera-view');
        expect(cameraView.props.type).toBe('front');
      });
    });

    it('should adjust zoom level', async () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const zoomSlider = getByTestId('zoom-slider');
      fireEvent(zoomSlider, 'valueChange', 0.5);

      const cameraView = getByTestId('camera-view');
      expect(cameraView.props.zoom).toBe(0.5);
    });
  });

  describe('Photo Editing and Upload', () => {
    it('should show description input modal after photo capture', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const saveButton = getByTestId('save-button');
        fireEvent.press(saveButton);
        
        expect(getByTestId('description-modal')).toBeTruthy();
        expect(getByTestId('description-input')).toBeTruthy();
      });
    });

    it('should upload rainbow photo with description and location', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      const mockLocation = {
        latitude: 36.0687,
        longitude: 137.9646,
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);
      mockLocationService.getCurrentLocation.mockResolvedValueOnce(mockLocation);
      mockApiService.createRainbow.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      // Capture photo
      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(async () => {
        // Save photo
        const saveButton = getByTestId('save-button');
        fireEvent.press(saveButton);

        // Enter description
        const descriptionInput = getByTestId('description-input');
        fireEvent.changeText(descriptionInput, 'Beautiful rainbow after rain');

        // Submit
        const submitButton = getByTestId('submit-button');
        fireEvent.press(submitButton);

        await waitFor(() => {
          expect(mockApiService.createRainbow).toHaveBeenCalledWith({
            latitude: 36.0687,
            longitude: 137.9646,
            description: 'Beautiful rainbow after rain',
          }, mockPhoto.uri);
        });
      });
    });

    it('should handle upload errors gracefully', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);
      mockApiService.createRainbow.mockRejectedValueOnce(
        new Error('Upload failed')
      );

      const { getByTestId, getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      // Go through capture and upload flow
      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(async () => {
        const saveButton = getByTestId('save-button');
        fireEvent.press(saveButton);

        const descriptionInput = getByTestId('description-input');
        fireEvent.changeText(descriptionInput, 'Test rainbow');

        const submitButton = getByTestId('submit-button');
        fireEvent.press(submitButton);

        await waitFor(() => {
          expect(getByText('Failed to upload rainbow photo')).toBeTruthy();
        });
      });
    });

    it('should show upload progress', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);
      mockApiService.createRainbow.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
      );

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(async () => {
        const saveButton = getByTestId('save-button');
        fireEvent.press(saveButton);

        const submitButton = getByTestId('submit-button');
        fireEvent.press(submitButton);

        // Should show upload progress
        expect(getByTestId('upload-progress')).toBeTruthy();
      });
    });
  });

  describe('Location Integration', () => {
    it('should get current location for photo metadata', async () => {
      const mockLocation = {
        latitude: 36.0687,
        longitude: 137.9646,
        accuracy: 10,
      };

      mockLocationService.getCurrentLocation.mockResolvedValueOnce(mockLocation);

      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockLocationService.getCurrentLocation).toHaveBeenCalled();
      });
    });

    it('should handle location permission denied', async () => {
      mockLocationService.checkLocationPermission.mockResolvedValueOnce(false);
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(false);

      const { getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Location permission required for rainbow posting')).toBeTruthy();
      });
    });

    it('should allow manual location selection when GPS unavailable', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValueOnce(
        new Error('GPS unavailable')
      );

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('manual-location-button')).toBeTruthy();
      });
    });
  });

  describe('Camera Focus and Exposure', () => {
    it('should focus camera on touch', async () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'touchStart', {
        nativeEvent: {
          touches: [{
            pageX: 100,
            pageY: 200,
          }]
        }
      });

      // Should show focus indicator
      expect(getByTestId('focus-indicator')).toBeTruthy();
    });

    it('should adjust exposure', async () => {
      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const exposureSlider = getByTestId('exposure-slider');
      fireEvent(exposureSlider, 'valueChange', 0.3);

      // Should update camera exposure
      const cameraView = getByTestId('camera-view');
      expect(cameraView.props.exposure).toBe(0.3);
    });
  });

  describe('Error Handling', () => {
    it('should handle camera initialization errors', async () => {
      const { getByTestId, getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const cameraView = getByTestId('camera-view');
      fireEvent(cameraView, 'cameraReady', false);

      expect(getByText('Camera initialization failed')).toBeTruthy();
    });

    it('should handle storage permission errors', async () => {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.check.mockResolvedValueOnce(true); // Camera OK
      PermissionsAndroid.request.mockResolvedValueOnce('denied'); // Storage denied

      const { getByText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Storage permission required to save photos')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should cleanup camera resources on unmount', () => {
      const { unmount } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      unmount();

      // Verify cleanup
      expect(mockCameraRef.stopRecording).toHaveBeenCalled();
    });

    it('should optimize image quality based on device capabilities', async () => {
      // Mock low-end device
      const originalGet = require('react-native').Dimensions.get;
      require('react-native').Dimensions.get.mockReturnValueOnce({
        width: 320,
        height: 480
      });

      const { getByTestId } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(mockCameraRef.takePictureAsync).toHaveBeenCalledWith({
          quality: 0.6, // Lower quality for low-end device
          base64: false,
          skipProcessing: false,
        });
      });

      require('react-native').Dimensions.get.mockImplementation(originalGet);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Camera viewfinder')).toBeTruthy();
      expect(getByLabelText('Capture rainbow photo')).toBeTruthy();
      expect(getByLabelText('Select photo from gallery')).toBeTruthy();
      expect(getByLabelText('Toggle camera flash')).toBeTruthy();
    });

    it('should support voice-over navigation', () => {
      const { getByAccessibilityRole } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      expect(getByAccessibilityRole('button')).toBeTruthy(); // Capture button
      expect(getByAccessibilityRole('adjustable')).toBeTruthy(); // Zoom slider
    });

    it('should announce capture completion', async () => {
      const mockPhoto = {
        uri: 'file://path/to/photo.jpg',
      };

      mockCameraRef.takePictureAsync.mockResolvedValueOnce(mockPhoto);

      const { getByTestId, getByLabelText } = render(
        <CameraScreen navigation={mockNavigation} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(getByLabelText('Photo captured successfully')).toBeTruthy();
      });
    });
  });
});