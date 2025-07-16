const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

// Register FCM token for push notifications
exports.registerToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    await notificationService.registerToken(userId, token);
    
    res.json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Send rainbow alert to nearby users
exports.sendRainbowAlert = async (req, res, next) => {
  try {
    const { latitude, longitude, message } = req.body;
    const userId = req.user.id;

    const result = await notificationService.sendRainbowAlert(userId, latitude, longitude, message);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get user's notification history
exports.getNotificationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.findByUserId(userId);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};