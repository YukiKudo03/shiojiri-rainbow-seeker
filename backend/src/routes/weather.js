const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// @route   GET /api/weather/current
// @desc    Get current weather data for Shiojiri
// @access  Public
router.get('/current', weatherController.getCurrentWeather);

// @route   GET /api/weather/radar
// @desc    Get rain cloud radar data
// @access  Public
router.get('/radar', weatherController.getRadarData);

// @route   GET /api/weather/history/:date
// @desc    Get historical weather data
// @access  Public
router.get('/history/:date', weatherController.getHistoricalWeather);

// @route   GET /api/weather/prediction
// @desc    Get rainbow prediction based on weather
// @access  Public
router.get('/prediction', weatherController.getRainbowPrediction);

module.exports = router;