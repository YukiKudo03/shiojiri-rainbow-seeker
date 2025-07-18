import NotificationService from '../NotificationService';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

// Mock Firebase messaging
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    hasPermission: jest.fn(),
    requestPermission: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
  })),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: -1,
    NOT_DETERMINED: 0,
    PROVISIONAL: 2,
  },
}));

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  getScheduledLocalNotifications: jest.fn(),
  removeAllDeliveredNotifications: jest.fn(),
  getDeliveredNotifications: jest.fn(),
  createChannel: jest.fn(),
}));

// Mock Platform and PermissionsAndroid
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
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

// Mock ApiService
const mockApiService = {
  registerFCMToken: jest.fn(),
};

jest.mock('../ApiService', () => mockApiService);

describe('NotificationService', () => {
  let mockMessaging;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockMessaging = messaging();
  });

  describe('Initialization', () => {
    describe('initialize', () => {
      it('should initialize notification service successfully', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        const result = await NotificationService.initialize();

        expect(PushNotification.configure).toHaveBeenCalled();
        expect(mockMessaging.hasPermission).toHaveBeenCalled();
        expect(mockMessaging.getToken).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.token).toBe('mock-fcm-token');
      });

      it('should request permission when not granted', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.NOT_DETERMINED);
        mockMessaging.requestPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        const result = await NotificationService.initialize();

        expect(mockMessaging.requestPermission).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should handle permission denied', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.DENIED);
        mockMessaging.requestPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.DENIED);

        const result = await NotificationService.initialize();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Notification permission denied');
      });

      it('should handle FCM token registration failure', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockRejectedValueOnce(new Error('Registration failed'));

        const result = await NotificationService.initialize();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Registration failed');
      });

      it('should handle Android POST_NOTIFICATIONS permission', async () => {
        Platform.OS = 'android';
        PermissionsAndroid.check.mockResolvedValueOnce(false);
        PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        const result = await NotificationService.initialize();

        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        expect(result.success).toBe(true);
      });
    });

    describe('setupMessageHandlers', () => {
      it('should setup message handlers correctly', () => {
        const mockOnMessage = jest.fn();
        const mockOnNotificationOpenedApp = jest.fn();
        const mockSetBackgroundMessageHandler = jest.fn();

        mockMessaging.onMessage.mockReturnValue(mockOnMessage);
        mockMessaging.onNotificationOpenedApp.mockReturnValue(mockOnNotificationOpenedApp);
        mockMessaging.setBackgroundMessageHandler.mockReturnValue(mockSetBackgroundMessageHandler);

        NotificationService.setupMessageHandlers();

        expect(mockMessaging.onMessage).toHaveBeenCalled();
        expect(mockMessaging.onNotificationOpenedApp).toHaveBeenCalled();
        expect(mockMessaging.setBackgroundMessageHandler).toHaveBeenCalled();
      });
    });
  });

  describe('Local Notifications', () => {
    beforeEach(() => {
      // Setup Android channel creation
      Platform.OS = 'android';
    });

    describe('showLocalNotification', () => {
      it('should show local notification successfully', () => {
        const notificationData = {
          title: 'Rainbow Alert',
          message: 'A rainbow was spotted nearby!',
          data: { type: 'rainbow_alert' }
        };

        NotificationService.showLocalNotification(notificationData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: notificationData.title,
            message: notificationData.message,
            userInfo: notificationData.data,
          })
        );
      });

      it('should show notification with custom options', () => {
        const notificationData = {
          title: 'Custom Alert',
          message: 'Custom message',
          playSound: false,
          vibrate: false,
          priority: 'high'
        };

        NotificationService.showLocalNotification(notificationData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Custom Alert',
            message: 'Custom message',
            playSound: false,
            vibrate: false,
            priority: 'high',
          })
        );
      });

      it('should create Android notification channel when needed', () => {
        Platform.OS = 'android';

        const notificationData = {
          title: 'Test',
          message: 'Test message',
          channelId: 'custom_channel'
        };

        NotificationService.showLocalNotification(notificationData);

        expect(PushNotification.createChannel).toHaveBeenCalledWith(
          expect.objectContaining({
            channelId: 'custom_channel',
          })
        );
      });
    });

    describe('scheduleLocalNotification', () => {
      it('should schedule notification successfully', () => {
        const notificationData = {
          title: 'Scheduled Alert',
          message: 'This is scheduled',
          date: new Date(Date.now() + 60000) // 1 minute from now
        };

        NotificationService.scheduleLocalNotification(notificationData);

        expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            title: notificationData.title,
            message: notificationData.message,
            date: notificationData.date,
          })
        );
      });

      it('should handle past date by showing immediate notification', () => {
        const notificationData = {
          title: 'Past Alert',
          message: 'This date was in the past',
          date: new Date(Date.now() - 60000) // 1 minute ago
        };

        NotificationService.scheduleLocalNotification(notificationData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: notificationData.title,
            message: notificationData.message,
          })
        );
      });

      it('should schedule with repeat interval', () => {
        const notificationData = {
          title: 'Repeating Alert',
          message: 'This repeats',
          date: new Date(Date.now() + 60000),
          repeatType: 'day'
        };

        NotificationService.scheduleLocalNotification(notificationData);

        expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            title: notificationData.title,
            message: notificationData.message,
            date: notificationData.date,
            repeatType: 'day',
          })
        );
      });
    });

    describe('cancelLocalNotifications', () => {
      it('should cancel notifications by ID', () => {
        const notificationIds = ['notification1', 'notification2'];

        NotificationService.cancelLocalNotifications(notificationIds);

        expect(PushNotification.cancelLocalNotifications).toHaveBeenCalledWith({
          id: notificationIds,
        });
      });

      it('should cancel all notifications when no IDs provided', () => {
        NotificationService.cancelLocalNotifications();

        expect(PushNotification.cancelAllLocalNotifications).toHaveBeenCalled();
      });
    });

    describe('getScheduledNotifications', () => {
      it('should get scheduled notifications', async () => {
        const mockScheduledNotifications = [
          { id: '1', title: 'Test 1', date: new Date() },
          { id: '2', title: 'Test 2', date: new Date() }
        ];

        PushNotification.getScheduledLocalNotifications.mockImplementationOnce((callback) => {
          callback(mockScheduledNotifications);
        });

        const result = await NotificationService.getScheduledNotifications();

        expect(PushNotification.getScheduledLocalNotifications).toHaveBeenCalled();
        expect(result).toEqual(mockScheduledNotifications);
      });
    });
  });

  describe('Topic Management', () => {
    describe('subscribeToTopic', () => {
      it('should subscribe to topic successfully', async () => {
        mockMessaging.subscribeToTopic.mockResolvedValueOnce();

        const result = await NotificationService.subscribeToTopic('rainbow_alerts');

        expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('rainbow_alerts');
        expect(result.success).toBe(true);
      });

      it('should handle subscription failure', async () => {
        mockMessaging.subscribeToTopic.mockRejectedValueOnce(new Error('Subscription failed'));

        const result = await NotificationService.subscribeToTopic('rainbow_alerts');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Subscription failed');
      });

      it('should validate topic name', async () => {
        const result = await NotificationService.subscribeToTopic('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Topic name is required');
        expect(mockMessaging.subscribeToTopic).not.toHaveBeenCalled();
      });
    });

    describe('unsubscribeFromTopic', () => {
      it('should unsubscribe from topic successfully', async () => {
        mockMessaging.unsubscribeFromTopic.mockResolvedValueOnce();

        const result = await NotificationService.unsubscribeFromTopic('rainbow_alerts');

        expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith('rainbow_alerts');
        expect(result.success).toBe(true);
      });

      it('should handle unsubscription failure', async () => {
        mockMessaging.unsubscribeFromTopic.mockRejectedValueOnce(new Error('Unsubscription failed'));

        const result = await NotificationService.unsubscribeFromTopic('rainbow_alerts');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unsubscription failed');
      });
    });

    describe('subscribeToLocationAlerts', () => {
      it('should subscribe to location-based alerts', async () => {
        mockMessaging.subscribeToTopic.mockResolvedValue();

        const location = {
          latitude: 36.0687,
          longitude: 137.9646
        };

        const result = await NotificationService.subscribeToLocationAlerts(location);

        expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith('location_36_0687_137_9646');
        expect(result.success).toBe(true);
      });

      it('should handle missing location data', async () => {
        const result = await NotificationService.subscribeToLocationAlerts({});

        expect(result.success).toBe(false);
        expect(result.error).toBe('Location coordinates are required');
      });
    });
  });

  describe('Token Management', () => {
    describe('getFCMToken', () => {
      it('should get FCM token successfully', async () => {
        mockMessaging.getToken.mockResolvedValueOnce('mock-fcm-token');

        const token = await NotificationService.getFCMToken();

        expect(mockMessaging.getToken).toHaveBeenCalled();
        expect(token).toBe('mock-fcm-token');
      });

      it('should handle token retrieval failure', async () => {
        mockMessaging.getToken.mockRejectedValueOnce(new Error('Token failed'));

        const token = await NotificationService.getFCMToken();

        expect(token).toBeNull();
      });
    });

    describe('refreshFCMToken', () => {
      it('should refresh FCM token successfully', async () => {
        mockMessaging.getToken.mockResolvedValueOnce('new-fcm-token');
        mockApiService.registerFCMToken.mockResolvedValueOnce({ success: true });

        const result = await NotificationService.refreshFCMToken();

        expect(mockMessaging.getToken).toHaveBeenCalled();
        expect(mockApiService.registerFCMToken).toHaveBeenCalledWith('new-fcm-token');
        expect(result.success).toBe(true);
        expect(result.token).toBe('new-fcm-token');
      });

      it('should handle token refresh failure', async () => {
        mockMessaging.getToken.mockRejectedValueOnce(new Error('Refresh failed'));

        const result = await NotificationService.refreshFCMToken();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Refresh failed');
      });
    });

    describe('onTokenRefresh', () => {
      it('should setup token refresh listener', () => {
        const callback = jest.fn();
        const mockUnsubscribe = jest.fn();
        mockMessaging.onTokenRefresh.mockReturnValueOnce(mockUnsubscribe);

        const unsubscribe = NotificationService.onTokenRefresh(callback);

        expect(mockMessaging.onTokenRefresh).toHaveBeenCalled();
        expect(unsubscribe).toBe(mockUnsubscribe);
      });
    });
  });

  describe('Notification History', () => {
    describe('getNotificationHistory', () => {
      it('should get delivered notifications', async () => {
        const mockDeliveredNotifications = [
          { id: '1', title: 'Rainbow Alert', date: new Date() },
          { id: '2', title: 'Weather Update', date: new Date() }
        ];

        PushNotification.getDeliveredNotifications.mockImplementationOnce((callback) => {
          callback(mockDeliveredNotifications);
        });

        const result = await NotificationService.getNotificationHistory();

        expect(PushNotification.getDeliveredNotifications).toHaveBeenCalled();
        expect(result).toEqual(mockDeliveredNotifications);
      });
    });

    describe('clearNotificationHistory', () => {
      it('should clear all delivered notifications', () => {
        NotificationService.clearNotificationHistory();

        expect(PushNotification.removeAllDeliveredNotifications).toHaveBeenCalled();
      });
    });
  });

  describe('Rainbow-specific Notifications', () => {
    describe('showRainbowAlert', () => {
      it('should show rainbow alert notification', () => {
        const rainbowData = {
          location: 'Shiojiri City',
          distance: '2.5km',
          probability: 0.85
        };

        NotificationService.showRainbowAlert(rainbowData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rainbow Alert! 🌈',
            message: expect.stringContaining('Shiojiri City'),
            bigText: expect.stringContaining('85%'),
            userInfo: expect.objectContaining({
              type: 'rainbow_alert',
            }),
          })
        );
      });

      it('should show high probability rainbow alert', () => {
        const rainbowData = {
          location: 'Near you',
          probability: 0.95
        };

        NotificationService.showRainbowAlert(rainbowData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'High Probability Rainbow Alert! 🌈✨',
            priority: 'high',
            importance: 'high',
          })
        );
      });
    });

    describe('showWeatherUpdate', () => {
      it('should show weather update notification', () => {
        const weatherData = {
          temperature: 22.5,
          condition: 'partly cloudy',
          rainbowProbability: 0.65
        };

        NotificationService.showWeatherUpdate(weatherData);

        expect(PushNotification.localNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Weather Update',
            message: expect.stringContaining('22.5°C'),
            userInfo: expect.objectContaining({
              type: 'weather_update',
            }),
          })
        );
      });
    });

    describe('scheduleRainbowReminder', () => {
      it('should schedule rainbow watching reminder', () => {
        const reminderTime = new Date(Date.now() + 3600000); // 1 hour from now

        NotificationService.scheduleRainbowReminder(reminderTime);

        expect(PushNotification.localNotificationSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rainbow Watching Time! 🌈',
            message: expect.stringContaining('conditions look good'),
            date: reminderTime,
            userInfo: expect.objectContaining({
              type: 'rainbow_reminder',
            }),
          })
        );
      });
    });
  });

  describe('Permission Management', () => {
    describe('checkNotificationPermission', () => {
      it('should check notification permission status', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);

        const hasPermission = await NotificationService.checkNotificationPermission();

        expect(mockMessaging.hasPermission).toHaveBeenCalled();
        expect(hasPermission).toBe(true);
      });

      it('should return false for denied permission', async () => {
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.DENIED);

        const hasPermission = await NotificationService.checkNotificationPermission();

        expect(hasPermission).toBe(false);
      });

      it('should handle Android 13+ POST_NOTIFICATIONS permission', async () => {
        Platform.OS = 'android';
        PermissionsAndroid.check.mockResolvedValueOnce(true);
        mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);

        const hasPermission = await NotificationService.checkNotificationPermission();

        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        expect(hasPermission).toBe(true);
      });
    });

    describe('requestNotificationPermission', () => {
      it('should request notification permission successfully', async () => {
        mockMessaging.requestPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);

        const result = await NotificationService.requestNotificationPermission();

        expect(mockMessaging.requestPermission).toHaveBeenCalled();
        expect(result.granted).toBe(true);
      });

      it('should handle permission denied', async () => {
        mockMessaging.requestPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.DENIED);

        const result = await NotificationService.requestNotificationPermission();

        expect(result.granted).toBe(false);
        expect(result.status).toBe('denied');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle messaging service errors gracefully', async () => {
      mockMessaging.hasPermission.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await NotificationService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });

    it('should handle push notification errors gracefully', () => {
      PushNotification.localNotification.mockImplementationOnce(() => {
        throw new Error('Notification failed');
      });

      expect(() => {
        NotificationService.showLocalNotification({
          title: 'Test',
          message: 'Test message'
        });
      }).not.toThrow();
    });

    it('should handle API registration errors gracefully', async () => {
      mockMessaging.hasPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.AUTHORIZED);
      mockMessaging.getToken.mockResolvedValueOnce('mock-token');
      mockApiService.registerFCMToken.mockRejectedValueOnce(new Error('API Error'));

      const result = await NotificationService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('Configuration', () => {
    describe('updateNotificationSettings', () => {
      it('should update notification settings', async () => {
        const settings = {
          rainbowAlerts: true,
          weatherUpdates: false,
          locationBasedAlerts: true,
          soundEnabled: true,
          vibrationEnabled: false
        };

        const result = await NotificationService.updateNotificationSettings(settings);

        expect(result.success).toBe(true);
        expect(result.settings).toEqual(settings);
      });
    });

    describe('getNotificationSettings', () => {
      it('should get current notification settings', async () => {
        const settings = await NotificationService.getNotificationSettings();

        expect(settings).toEqual(
          expect.objectContaining({
            rainbowAlerts: expect.any(Boolean),
            weatherUpdates: expect.any(Boolean),
            locationBasedAlerts: expect.any(Boolean),
            soundEnabled: expect.any(Boolean),
            vibrationEnabled: expect.any(Boolean),
          })
        );
      });
    });
  });
});