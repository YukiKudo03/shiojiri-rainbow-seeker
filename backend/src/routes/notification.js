const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// @route   POST /api/notification/register-token
// @desc    Register FCM token for push notifications
// @access  Private
router.post('/register-token', auth, notificationController.registerToken);

// @route   POST /api/notification/send-rainbow-alert
// @desc    Send rainbow alert to nearby users
// @access  Private (internal use)
router.post('/send-rainbow-alert', auth, notificationController.sendRainbowAlert);

// @route   GET /api/notification/history
// @desc    Get user's notification history
// @access  Private
router.get('/history', auth, notificationController.getNotificationHistory);

module.exports = router;