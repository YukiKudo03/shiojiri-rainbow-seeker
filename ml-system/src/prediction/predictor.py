"""
Real-time rainbow prediction service
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import time
import asyncio
import redis
import json

from ..model_training.trainer import RainbowPredictor
from ..utils.config import config
from ..utils.database import db_manager
from ..utils.logger import get_prediction_logger

logger = get_prediction_logger()

class RainbowPredictionService:
    """Real-time rainbow prediction service with caching"""
    
    def __init__(self):
        self.predictor = RainbowPredictor()
        self.redis_client = None
        self.model_loaded = False
        self._initialize_redis()
        self._load_model()
    
    def _initialize_redis(self):
        """Initialize Redis connection for caching"""
        try:
            redis_config = config.get_redis_config()
            self.redis_client = redis.Redis(**redis_config)
            self.redis_client.ping()
            logger.logger.info("Redis connection established")
        except Exception as e:
            logger.logger.warning(f"Redis connection failed: {e}. Predictions will not be cached.")
            self.redis_client = None
    
    def _load_model(self):
        """Load the trained model"""
        try:
            self.model_loaded = self.predictor.load_model()
            if self.model_loaded:
                logger.logger.info("Rainbow prediction model loaded successfully")
            else:
                logger.logger.warning("No trained model found. Please train a model first.")
        except Exception as e:
            logger.log_error("model_loading", str(e))
            self.model_loaded = False
    
    def predict_rainbow_probability(self, 
                                  weather_data: Dict[str, Any],
                                  location: Optional[Dict[str, float]] = None,
                                  use_cache: bool = True) -> Dict[str, Any]:
        """Predict rainbow probability for given weather conditions"""
        
        if not self.model_loaded:
            raise ValueError("No trained model available. Please train a model first.")
        
        start_time = time.time()
        
        try:
            # Create cache key
            cache_key = self._create_cache_key(weather_data, location) if use_cache else None
            
            # Check cache first
            if cache_key and self.redis_client:
                cached_result = self._get_cached_prediction(cache_key)
                if cached_result:
                    logger.log_cache_operation("prediction", cache_key, hit=True)
                    return cached_result
                logger.log_cache_operation("prediction", cache_key, hit=False)
            
            # Add location to weather data if provided
            if location:
                weather_data.update(location)
            
            # Make prediction
            result = self.predictor.predict(weather_data)
            
            # Add additional metadata
            result.update({
                'location': location,
                'weather_conditions': self._summarize_weather_conditions(weather_data),
                'recommendation': self._generate_recommendation(result['probability']),
                'cached': False
            })
            
            # Cache the result
            if cache_key and self.redis_client:
                self._cache_prediction(cache_key, result)
                logger.log_cache_operation("prediction", cache_key)
            
            # Save to database
            self._save_prediction_to_db(result, weather_data)
            
            execution_time = time.time() - start_time
            logger.logger.info(f"Prediction completed in {execution_time:.3f}s - Probability: {result['probability']:.4f}")
            
            return result
            
        except Exception as e:
            logger.log_error("rainbow_prediction", str(e))
            raise
    
    def predict_batch(self, 
                     weather_data_list: List[Dict[str, Any]],
                     location: Optional[Dict[str, float]] = None) -> List[Dict[str, Any]]:
        """Predict rainbow probability for multiple weather conditions"""
        
        start_time = time.time()
        results = []
        
        try:
            for i, weather_data in enumerate(weather_data_list):
                try:
                    result = self.predict_rainbow_probability(weather_data, location, use_cache=False)
                    result['batch_index'] = i
                    results.append(result)
                except Exception as e:
                    logger.log_error("batch_prediction_item", str(e))
                    results.append({
                        'probability': 0.0,
                        'prediction': 0,
                        'confidence': 'low',
                        'error': str(e),
                        'batch_index': i
                    })
            
            batch_time = time.time() - start_time
            logger.logger.info(f"Batch prediction completed for {len(weather_data_list)} items in {batch_time:.3f}s")
            
            return results
            
        except Exception as e:
            logger.log_error("batch_prediction", str(e))
            raise
    
    def predict_time_series(self,
                           current_weather: Dict[str, Any],
                           forecast_hours: int = 24,
                           location: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """Predict rainbow probability for upcoming hours based on forecast"""
        
        # This would typically integrate with weather forecast API
        # For now, we'll simulate forecast data
        
        base_time = datetime.now()
        predictions = []
        
        for hour in range(forecast_hours):
            # Simulate weather changes over time
            forecast_weather = self._simulate_weather_forecast(current_weather, hour)
            forecast_weather['timestamp'] = (base_time + timedelta(hours=hour)).isoformat()
            
            try:
                prediction = self.predict_rainbow_probability(forecast_weather, location, use_cache=False)
                prediction['forecast_hour'] = hour
                prediction['forecast_time'] = forecast_weather['timestamp']
                predictions.append(prediction)
            except Exception as e:
                logger.log_error("time_series_prediction", str(e))
                predictions.append({
                    'probability': 0.0,
                    'prediction': 0,
                    'confidence': 'low',
                    'error': str(e),
                    'forecast_hour': hour
                })
        
        # Analyze time series for peak probability windows
        peak_windows = self._find_peak_probability_windows(predictions)
        
        result = {
            'predictions': predictions,
            'peak_windows': peak_windows,
            'max_probability': max([p.get('probability', 0) for p in predictions]),
            'forecast_summary': self._summarize_forecast(predictions),
            'generated_at': datetime.now().isoformat()
        }
        
        return result
    
    def get_prediction_statistics(self, 
                                days_back: int = 7) -> Dict[str, Any]:
        """Get prediction statistics for the past period"""
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        try:
            # Get predictions from database
            predictions_df = db_manager.get_recent_predictions(limit=1000)
            
            if predictions_df.empty:
                return {'message': 'No prediction data available'}
            
            # Filter by date range
            predictions_df['created_at'] = pd.to_datetime(predictions_df['created_at'])
            mask = (predictions_df['created_at'] >= start_date) & (predictions_df['created_at'] <= end_date)
            recent_predictions = predictions_df[mask]
            
            if recent_predictions.empty:
                return {'message': f'No predictions in the last {days_back} days'}
            
            stats = {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days_back
                },
                'total_predictions': len(recent_predictions),
                'avg_probability': recent_predictions['probability'].mean(),
                'high_confidence_predictions': len(recent_predictions[recent_predictions['probability'] >= 0.7]),
                'low_confidence_predictions': len(recent_predictions[recent_predictions['probability'] <= 0.3]),
                'predictions_per_day': len(recent_predictions) / days_back,
                'probability_distribution': {
                    'min': recent_predictions['probability'].min(),
                    'max': recent_predictions['probability'].max(),
                    'median': recent_predictions['probability'].median(),
                    'std': recent_predictions['probability'].std()
                }
            }
            
            # Model performance if available
            if 'model_version' in recent_predictions.columns:
                stats['model_versions'] = recent_predictions['model_version'].value_counts().to_dict()
            
            return stats
            
        except Exception as e:
            logger.log_error("prediction_statistics", str(e))
            return {'error': str(e)}
    
    def _create_cache_key(self, weather_data: Dict[str, Any], location: Optional[Dict[str, float]]) -> str:
        """Create a cache key for the prediction"""
        
        # Round weather values for caching efficiency
        cache_data = {}
        for key, value in weather_data.items():
            if isinstance(value, (int, float)):
                cache_data[key] = round(value, 2)
            else:
                cache_data[key] = value
        
        if location:
            cache_data['lat'] = round(location.get('latitude', 0), 4)
            cache_data['lon'] = round(location.get('longitude', 0), 4)
        
        # Create hash from sorted data
        cache_string = json.dumps(cache_data, sort_keys=True)
        return f"rainbow_prediction:{hash(cache_string)}"
    
    def _get_cached_prediction(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached prediction result"""
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                result = json.loads(cached_data)
                result['cached'] = True
                return result
        except Exception as e:
            logger.logger.warning(f"Cache retrieval failed: {e}")
        return None
    
    def _cache_prediction(self, cache_key: str, result: Dict[str, Any]):
        """Cache prediction result"""
        try:
            cache_data = result.copy()
            cache_data['cached_at'] = datetime.now().isoformat()
            self.redis_client.setex(
                cache_key,
                config.PREDICTION_CACHE_TTL,
                json.dumps(cache_data, default=str)
            )
        except Exception as e:
            logger.logger.warning(f"Cache storage failed: {e}")
    
    def _save_prediction_to_db(self, result: Dict[str, Any], weather_data: Dict[str, Any]):
        """Save prediction result to database"""
        try:
            prediction_data = {
                'timestamp': datetime.now(),
                'probability': result['probability'],
                'weather_data': json.dumps(weather_data),
                'model_version': '1.0.0'
            }
            db_manager.save_prediction_result(prediction_data)
        except Exception as e:
            logger.logger.warning(f"Failed to save prediction to database: {e}")
    
    def _summarize_weather_conditions(self, weather_data: Dict[str, Any]) -> str:
        """Summarize weather conditions in human-readable format"""
        
        conditions = []
        
        if 'temperature' in weather_data:
            temp = weather_data['temperature']
            if temp < 10:
                conditions.append("cold")
            elif temp > 25:
                conditions.append("warm")
            else:
                conditions.append("mild")
        
        if 'humidity' in weather_data:
            humidity = weather_data['humidity']
            if humidity > 80:
                conditions.append("very humid")
            elif humidity > 60:
                conditions.append("humid")
            else:
                conditions.append("dry")
        
        if 'precipitation' in weather_data:
            precip = weather_data['precipitation']
            if precip > 5:
                conditions.append("heavy rain")
            elif precip > 0:
                conditions.append("light rain")
        
        if 'cloud_cover' in weather_data:
            clouds = weather_data['cloud_cover']
            if clouds > 75:
                conditions.append("overcast")
            elif clouds > 25:
                conditions.append("partly cloudy")
            else:
                conditions.append("clear")
        
        return ", ".join(conditions) if conditions else "unknown conditions"
    
    def _generate_recommendation(self, probability: float) -> str:
        """Generate recommendation based on probability"""
        
        if probability >= 0.8:
            return "Excellent chance of rainbow! Get your camera ready and head outside."
        elif probability >= 0.6:
            return "Good chance of rainbow. Keep an eye on the sky and be prepared."
        elif probability >= 0.4:
            return "Moderate chance of rainbow. Weather conditions are promising."
        elif probability >= 0.2:
            return "Low chance of rainbow, but still possible under right conditions."
        else:
            return "Very low chance of rainbow with current weather conditions."
    
    def _simulate_weather_forecast(self, current_weather: Dict[str, Any], hours_ahead: int) -> Dict[str, Any]:
        """Simulate weather forecast (placeholder for real forecast integration)"""
        
        # Simple simulation - in reality, this would use weather forecast API
        forecast = current_weather.copy()
        
        # Add some realistic variations
        if 'temperature' in forecast:
            # Temperature tends to drop at night, rise during day
            hour = (datetime.now().hour + hours_ahead) % 24
            temp_factor = 0.8 if 0 <= hour <= 6 else 1.1 if 12 <= hour <= 16 else 1.0
            forecast['temperature'] *= temp_factor
        
        if 'humidity' in forecast:
            # Humidity tends to be higher at night
            hour = (datetime.now().hour + hours_ahead) % 24
            humid_factor = 1.2 if 0 <= hour <= 6 else 0.9 if 12 <= hour <= 16 else 1.0
            forecast['humidity'] = min(100, forecast['humidity'] * humid_factor)
        
        if 'precipitation' in forecast:
            # Simple rain pattern simulation
            forecast['precipitation'] *= (0.5 + np.random.random())
        
        return forecast
    
    def _find_peak_probability_windows(self, predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find time windows with peak rainbow probability"""
        
        windows = []
        current_window = None
        threshold = 0.5  # Minimum probability for a "peak"
        
        for prediction in predictions:
            prob = prediction.get('probability', 0)
            hour = prediction.get('forecast_hour', 0)
            
            if prob >= threshold:
                if current_window is None:
                    current_window = {
                        'start_hour': hour,
                        'end_hour': hour,
                        'max_probability': prob,
                        'avg_probability': prob,
                        'duration': 1
                    }
                else:
                    current_window['end_hour'] = hour
                    current_window['max_probability'] = max(current_window['max_probability'], prob)
                    current_window['duration'] += 1
            else:
                if current_window is not None:
                    # Calculate average probability for the window
                    window_predictions = [p for p in predictions 
                                        if current_window['start_hour'] <= p.get('forecast_hour', 0) <= current_window['end_hour']]
                    current_window['avg_probability'] = np.mean([p.get('probability', 0) for p in window_predictions])
                    windows.append(current_window)
                    current_window = None
        
        # Add final window if it exists
        if current_window is not None:
            window_predictions = [p for p in predictions 
                                if current_window['start_hour'] <= p.get('forecast_hour', 0) <= current_window['end_hour']]
            current_window['avg_probability'] = np.mean([p.get('probability', 0) for p in window_predictions])
            windows.append(current_window)
        
        return windows
    
    def _summarize_forecast(self, predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize forecast predictions"""
        
        probabilities = [p.get('probability', 0) for p in predictions]
        
        return {
            'max_probability': max(probabilities),
            'avg_probability': np.mean(probabilities),
            'peak_hour': predictions[np.argmax(probabilities)].get('forecast_hour', 0),
            'favorable_hours': len([p for p in probabilities if p >= 0.4]),
            'total_hours': len(probabilities)
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check the health of the prediction service"""
        
        status = {
            'service_status': 'healthy',
            'model_loaded': self.model_loaded,
            'redis_connected': self.redis_client is not None,
            'database_connected': False,
            'last_check': datetime.now().isoformat()
        }
        
        # Check database connection
        try:
            db_health = db_manager.check_database_health()
            status['database_connected'] = db_health['status'] == 'healthy'
            status['database_info'] = db_health
        except Exception as e:
            status['database_error'] = str(e)
        
        # Check Redis connection
        if self.redis_client:
            try:
                self.redis_client.ping()
                status['redis_connected'] = True
            except Exception as e:
                status['redis_connected'] = False
                status['redis_error'] = str(e)
        
        # Overall status
        if not status['model_loaded']:
            status['service_status'] = 'degraded'
            status['issues'] = ['No trained model available']
        
        return status

# Global prediction service instance
prediction_service = RainbowPredictionService()

# Convenience functions
def predict_rainbow(weather_data: Dict[str, Any], location: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """Convenience function for single prediction"""
    return prediction_service.predict_rainbow_probability(weather_data, location)

def predict_rainbow_batch(weather_data_list: List[Dict[str, Any]], location: Optional[Dict[str, float]] = None) -> List[Dict[str, Any]]:
    """Convenience function for batch prediction"""
    return prediction_service.predict_batch(weather_data_list, location)

def get_service_health() -> Dict[str, Any]:
    """Convenience function for health check"""
    return prediction_service.health_check()