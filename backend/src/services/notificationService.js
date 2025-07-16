const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.initializeFirebase();
  }

  // Initialize Firebase Admin SDK
  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            type: process.env.FIREBASE_TYPE,
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
          })
        });
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  // Register FCM token for a user
  async registerToken(userId, token) {
    try {
      await User.updateFcmToken(userId, token);
      console.log(`FCM token registered for user ${userId}`);
    } catch (error) {
      throw error;
    }
  }

  // Send rainbow alert to nearby users
  async sendRainbowAlert(reporterUserId, latitude, longitude, message) {
    try {
      const radius = 10; // 10km radius
      const nearbyUsers = await User.findUsersWithinRadius(latitude, longitude, radius);
      
      // Filter out the reporter
      const targetUsers = nearbyUsers.filter(user => user.id !== reporterUserId);
      
      if (targetUsers.length === 0) {
        return { message: 'No nearby users to notify' };
      }

      const title = '🌈 Rainbow Alert!';
      const body = message || 'A rainbow has been spotted near you!';
      
      // Send push notifications
      const notificationPromises = targetUsers.map(async (user) => {
        if (user.fcm_token) {
          await this.sendPushNotification(user.fcm_token, title, body);
        }
        
        // Store notification in database
        return await Notification.create({
          userId: user.id,
          rainbowSightingId: null, // Will be set when rainbow is created
          title,
          message: body,
          type: 'rainbow_alert'
        });
      });

      const notifications = await Promise.all(notificationPromises);
      
      return {
        message: `Rainbow alert sent to ${targetUsers.length} nearby users`,
        notificationsSent: notifications.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Send push notification to specific token
  async sendPushNotification(token, title, body, data = {}) {
    try {
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        token
      };

      const response = await admin.messaging().send(message);
      console.log('Push notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(tokens, title, body, data = {}) {
    try {
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Bulk notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
      return response;
    } catch (error) {
      console.error('Bulk notification error:', error);
      throw error;
    }
  }

  // Send rainbow prediction notification
  async sendPredictionNotification(prediction) {
    try {
      if (prediction.probability < 70) {
        return { message: 'Prediction probability too low for notification' };
      }

      // Get all users in Shiojiri area
      const shiojiriUsers = await User.findUsersWithinRadius(36.1127, 137.9545, 15);
      const tokens = shiojiriUsers.map(user => user.fcm_token).filter(token => token);

      if (tokens.length === 0) {
        return { message: 'No users with FCM tokens found' };
      }

      const title = '🌈 Rainbow Prediction';
      const body = `High chance of rainbow! ${prediction.recommendation}`;

      const response = await this.sendBulkNotifications(tokens, title, body, {
        type: 'prediction',
        probability: prediction.probability.toString()
      });

      // Store notifications in database
      const notifications = await Notification.createBulk(
        shiojiriUsers.map(user => ({
          userId: user.id,
          rainbowSightingId: null,
          title,
          message: body,
          type: 'prediction'
        }))
      );

      return {
        message: `Prediction notification sent to ${tokens.length} users`,
        notificationsSent: notifications.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Send welcome notification to new user
  async sendWelcomeNotification(userId, userToken) {
    try {
      const title = 'Welcome to Rainbow Seeker!';
      const body = 'Thank you for joining the Shiojiri Rainbow community!';

      if (userToken) {
        await this.sendPushNotification(userToken, title, body);
      }

      const notification = await Notification.create({
        userId,
        rainbowSightingId: null,
        title,
        message: body,
        type: 'welcome'
      });

      return notification;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new NotificationService();