const axios = require('axios');
const Weather = require('../models/Weather');

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.apiUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
    this.shiojiriCoords = {
      latitude: 36.1127,
      longitude: 137.9545
    };
  }

  // Get current weather data for Shiojiri
  async getCurrentWeather() {
    try {
      const response = await axios.get(`${this.apiUrl}/weather`, {
        params: {
          lat: this.shiojiriCoords.latitude,
          lon: this.shiojiriCoords.longitude,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind.speed,
        windDirection: response.data.wind.deg,
        cloudCover: response.data.clouds.all,
        visibility: response.data.visibility / 1000, // Convert to km
        weatherCondition: response.data.weather[0].description,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Weather API error: ${error.message}`);
    }
  }

  // Get rain cloud radar data
  async getRadarData() {
    try {
      // TODO: Implement radar data fetching from Japan Meteorological Agency
      // For now, return mock data
      return {
        timestamp: new Date(),
        radarLayers: [
          {
            time: new Date(),
            precipitation: 0.5,
            coverage: 'light'
          }
        ]
      };
    } catch (error) {
      throw new Error(`Radar API error: ${error.message}`);
    }
  }

  // Collect weather data for a rainbow sighting
  async collectWeatherData(rainbowSightingId, latitude, longitude) {
    try {
      const weatherData = await this.getCurrentWeather();
      const radarData = await this.getRadarData();

      // Store weather data in database
      const weatherRecord = await Weather.create({
        rainbowSightingId,
        timestamp: new Date(),
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        precipitation: 0, // TODO: Get from radar data
        cloudCover: weatherData.cloudCover,
        visibility: weatherData.visibility,
        uvIndex: null, // TODO: Get UV index data
        weatherCondition: weatherData.weatherCondition,
        radarData: radarData
      });

      return weatherRecord;
    } catch (error) {
      throw error;
    }
  }

  // Get rainbow prediction based on current weather
  async getRainbowPrediction() {
    try {
      const currentWeather = await this.getCurrentWeather();
      
      // Simple rule-based prediction (to be replaced with ML model)
      const predictionScore = this.calculateRainbowProbability(currentWeather);
      
      return {
        probability: predictionScore,
        conditions: currentWeather,
        recommendation: this.getRecommendation(predictionScore),
        timestamp: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate rainbow probability based on weather conditions
  calculateRainbowProbability(weather) {
    let score = 0;

    // Temperature (optimal range: 15-25°C)
    if (weather.temperature >= 15 && weather.temperature <= 25) {
      score += 20;
    } else if (weather.temperature >= 10 && weather.temperature <= 30) {
      score += 10;
    }

    // Humidity (higher humidity increases chance)
    if (weather.humidity >= 60) {
      score += 25;
    } else if (weather.humidity >= 40) {
      score += 15;
    }

    // Cloud cover (partial clouds are ideal)
    if (weather.cloudCover >= 20 && weather.cloudCover <= 60) {
      score += 30;
    } else if (weather.cloudCover >= 10 && weather.cloudCover <= 80) {
      score += 20;
    }

    // Wind speed (light wind is better)
    if (weather.windSpeed <= 5) {
      score += 15;
    } else if (weather.windSpeed <= 10) {
      score += 10;
    }

    // Visibility (good visibility needed)
    if (weather.visibility >= 10) {
      score += 10;
    } else if (weather.visibility >= 5) {
      score += 5;
    }

    return Math.min(score, 100); // Cap at 100%
  }

  // Get recommendation based on prediction score
  getRecommendation(score) {
    if (score >= 70) {
      return 'High chance of rainbow! Keep your camera ready.';
    } else if (score >= 50) {
      return 'Moderate chance of rainbow. Worth staying alert.';
    } else if (score >= 30) {
      return 'Low chance of rainbow, but conditions could change.';
    } else {
      return 'Rainbow unlikely under current conditions.';
    }
  }
}

module.exports = new WeatherService();