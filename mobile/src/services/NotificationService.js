import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';
import { ApiService } from './ApiService';

export class NotificationService {
  static async initialize() {
    try {
      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Alert.alert(
          'Notification Permission',
          'Enable notifications to receive rainbow alerts!',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Configure local notifications
      this.configureLocalNotifications();

      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Register token with backend
      await this.registerToken(token);

      // Set up message handlers
      this.setupMessageHandlers();

      return true;
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  }

  static configureLocalNotifications() {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
      },

      onNotification: (notification) => {
        console.log('Local notification:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          this.handleNotificationTap(notification);
        }
      },

      onAction: (notification) => {
        console.log('Notification action:', notification);
      },

      onRegistrationError: (error) => {
        console.error('Push notification registration error:', error);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'rainbow-alerts',
          channelName: 'Rainbow Alerts',
          channelDescription: 'Notifications for rainbow sightings',
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
  }

  static setupMessageHandlers() {
    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      
      // Show local notification when app is in foreground
      this.showLocalNotification(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
        remoteMessage.data
      );
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    // Handle notification taps when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle notification taps when app is closed
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Initial notification:', remoteMessage);
        this.handleNotificationTap(remoteMessage);
      }
    });
  }

  static showLocalNotification(title, body, data = {}) {
    PushNotification.localNotification({
      channelId: 'rainbow-alerts',
      title,
      message: body,
      playSound: true,
      soundName: 'default',
      actions: ['View'],
      userInfo: data,
    });
  }

  static handleNotificationTap(notification) {
    // Handle different notification types
    const { type, rainbowId } = notification.data || {};
    
    switch (type) {
      case 'rainbow_alert':
        // Navigate to rainbow detail or map
        console.log('Navigate to rainbow:', rainbowId);
        break;
      case 'prediction':
        // Navigate to prediction screen
        console.log('Navigate to prediction');
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  }

  static async registerToken(token) {
    try {
      const response = await ApiService.registerFcmToken(token);
      console.log('Token registered:', response.data);
      return response.data.success;
    } catch (error) {
      console.error('Token registration error:', error);
      return false;
    }
  }

  static async sendRainbowAlert(latitude, longitude, message) {
    try {
      const response = await ApiService.sendRainbowAlert(latitude, longitude, message);
      return response.data;
    } catch (error) {
      console.error('Send rainbow alert error:', error);
      throw error;
    }
  }

  static async getNotificationHistory() {
    try {
      const response = await ApiService.getNotificationHistory();
      return response.data.data;
    } catch (error) {
      console.error('Get notification history error:', error);
      return [];
    }
  }

  static scheduleRainbowPredictionNotification(prediction) {
    if (prediction.probability >= 70) {
      PushNotification.localNotificationSchedule({
        channelId: 'rainbow-alerts',
        title: '🌈 Rainbow Prediction Alert',
        message: `High chance of rainbow! ${prediction.recommendation}`,
        date: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        userInfo: {
          type: 'prediction',
          probability: prediction.probability
        }
      });
    }
  }

  static cancelAllLocalNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static async checkPermissions() {
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }

  static async refreshToken() {
    try {
      const token = await messaging().getToken();
      await this.registerToken(token);
      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  static createTestNotification() {
    this.showLocalNotification(
      '🌈 Test Rainbow Alert',
      'This is a test notification for rainbow sightings!',
      { type: 'test' }
    );
  }
}