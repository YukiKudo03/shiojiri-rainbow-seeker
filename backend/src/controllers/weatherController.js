const weatherService = require('../services/weatherService');
const Weather = require('../models/Weather');

// Get current weather data for Shiojiri
exports.getCurrentWeather = async (req, res, next) => {
  try {
    const weatherData = await weatherService.getCurrentWeather();
    
    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    next(error);
  }
};

// Get rain cloud radar data
exports.getRadarData = async (req, res, next) => {
  try {
    const radarData = await weatherService.getRadarData();
    
    res.json({
      success: true,
      data: radarData
    });
  } catch (error) {
    next(error);
  }
};

// Get historical weather data
exports.getHistoricalWeather = async (req, res, next) => {
  try {
    const { date } = req.params;
    const weatherData = await Weather.findByDate(date);
    
    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Weather data not found for this date' }
      });
    }
    
    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    next(error);
  }
};

// Get rainbow prediction based on weather
exports.getRainbowPrediction = async (req, res, next) => {
  try {
    const prediction = await weatherService.getRainbowPrediction();
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
};