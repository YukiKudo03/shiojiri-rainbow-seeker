"""
Flask API for rainbow prediction service
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
import psutil
from datetime import datetime, timedelta
import json
from typing import Dict, Any

from .predictor import prediction_service
from ..model_training.trainer import RainbowPredictor
from ..data_processing.data_loader import DataLoader
from ..utils.config import config
from ..utils.logger import get_api_logger

logger = get_api_logger()

# Metrics collection
class MLMetrics:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.prediction_count = 0
        self.training_count = 0
        self.error_count = 0
        self.response_times = []
        self.model_accuracy = None
        
    def record_request(self, duration):
        self.request_count += 1
        self.response_times.append(duration)
        # Keep only last 100 response times
        if len(self.response_times) > 100:
            self.response_times.pop(0)
    
    def record_prediction(self):
        self.prediction_count += 1
    
    def record_training(self):
        self.training_count += 1
    
    def record_error(self):
        self.error_count += 1
    
    def get_metrics(self):
        uptime = time.time() - self.start_time
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        
        return {
            'uptime_seconds': int(uptime),
            'request_count': self.request_count,
            'prediction_count': self.prediction_count,
            'training_count': self.training_count,
            'error_count': self.error_count,
            'error_rate': (self.error_count / max(self.request_count, 1)) * 100,
            'avg_response_time_ms': round(avg_response_time * 1000, 2),
            'model_accuracy': self.model_accuracy,
            'system': {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent
            },
            'timestamp': datetime.utcnow().isoformat()
        }

ml_metrics = MLMetrics()

# Create Flask app
app = Flask(__name__)
CORS(app)

# Configure Flask
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

@app.before_request
def log_request():
    """Log incoming requests"""
    logger.logger.info(f"API Request: {request.method} {request.path}")

@app.after_request
def log_response(response):
    """Log outgoing responses"""
    logger.log_api_request(
        f"{request.method} {request.path}",
        0,  # Response time will be calculated elsewhere
        response.status_code
    )
    return response

@app.errorhandler(Exception)
def handle_exception(error):
    """Global error handler"""
    logger.log_error("api_error", str(error))
    return jsonify({
        'success': False,
        'error': str(error),
        'timestamp': datetime.now().isoformat()
    }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        health_status = prediction_service.health_check()
        status_code = 200 if health_status['service_status'] == 'healthy' else 503
        return jsonify(health_status), status_code
    except Exception as e:
        return jsonify({
            'service_status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/predict', methods=['POST'])
def predict_rainbow():
    """Predict rainbow probability for given weather conditions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        weather_data = data.get('weather_data', {})
        location = data.get('location')
        use_cache = data.get('use_cache', True)
        
        if not weather_data:
            return jsonify({
                'success': False,
                'error': 'Weather data is required'
            }), 400
        
        # Validate required weather fields
        required_fields = ['temperature', 'humidity', 'pressure']
        missing_fields = [field for field in required_fields if field not in weather_data]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required weather fields: {", ".join(missing_fields)}'
            }), 400
        
        result = prediction_service.predict_rainbow_probability(
            weather_data, location, use_cache
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("predict_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_rainbow_batch():
    """Predict rainbow probability for multiple weather conditions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        weather_data_list = data.get('weather_data_list', [])
        location = data.get('location')
        
        if not weather_data_list:
            return jsonify({
                'success': False,
                'error': 'Weather data list is required'
            }), 400
        
        if len(weather_data_list) > 100:  # Limit batch size
            return jsonify({
                'success': False,
                'error': 'Batch size too large. Maximum 100 predictions per request.'
            }), 400
        
        results = prediction_service.predict_batch(weather_data_list, location)
        
        return jsonify({
            'success': True,
            'data': {
                'predictions': results,
                'count': len(results)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("predict_batch_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/predict/forecast', methods=['POST'])
def predict_rainbow_forecast():
    """Predict rainbow probability for upcoming hours"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        current_weather = data.get('current_weather', {})
        forecast_hours = data.get('forecast_hours', 24)
        location = data.get('location')
        
        if not current_weather:
            return jsonify({
                'success': False,
                'error': 'Current weather data is required'
            }), 400
        
        if forecast_hours > 168:  # Max 7 days
            return jsonify({
                'success': False,
                'error': 'Forecast hours too large. Maximum 168 hours (7 days).'
            }), 400
        
        result = prediction_service.predict_time_series(
            current_weather, forecast_hours, location
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("predict_forecast_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/model/info', methods=['GET'])
def get_model_info():
    """Get information about the loaded model"""
    try:
        if not prediction_service.model_loaded:
            return jsonify({
                'success': False,
                'error': 'No model loaded'
            }), 404
        
        model_summary = prediction_service.predictor.get_model_summary()
        
        return jsonify({
            'success': True,
            'data': model_summary,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("model_info_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/model/feature-importance', methods=['GET'])
def get_feature_importance():
    """Get feature importance from the model"""
    try:
        if not prediction_service.model_loaded:
            return jsonify({
                'success': False,
                'error': 'No model loaded'
            }), 404
        
        feature_importance = prediction_service.predictor.get_feature_importance()
        
        return jsonify({
            'success': True,
            'data': {
                'feature_importance': feature_importance,
                'total_features': len(feature_importance)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("feature_importance_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/statistics', methods=['GET'])
def get_prediction_statistics():
    """Get prediction statistics"""
    try:
        days_back = request.args.get('days', 7, type=int)
        
        if days_back > 30:
            return jsonify({
                'success': False,
                'error': 'Days parameter too large. Maximum 30 days.'
            }), 400
        
        stats = prediction_service.get_prediction_statistics(days_back)
        
        return jsonify({
            'success': True,
            'data': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("statistics_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/train', methods=['POST'])
def train_model():
    """Train a new model (admin endpoint)"""
    try:
        data = request.get_json() or {}
        
        # Get training parameters
        days_back = data.get('days_back', 30)
        location_filter = data.get('location_filter')
        test_size = data.get('test_size', 0.2)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Initialize trainer
        trainer = RainbowPredictor()
        
        # Train models
        logger.logger.info(f"Starting model training with {days_back} days of data")
        results = trainer.train_models(start_date, end_date, location_filter, test_size)
        
        # Save the trained model
        model_path = trainer.save_model()
        
        # Reload the model in the prediction service
        prediction_service.predictor = trainer
        prediction_service.model_loaded = True
        
        return jsonify({
            'success': True,
            'data': {
                'training_results': results,
                'model_path': model_path,
                'training_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days_back
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("train_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/data/summary', methods=['GET'])
def get_data_summary():
    """Get summary of available training data"""
    try:
        days_back = request.args.get('days', 30, type=int)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Load data
        data_loader = DataLoader()
        df = data_loader.load_training_data(start_date, end_date)
        
        if df.empty:
            return jsonify({
                'success': True,
                'data': {'message': 'No data available for the specified period'},
                'timestamp': datetime.now().isoformat()
            })
        
        # Get data summary
        summary = data_loader.get_data_summary(df)
        data_quality = data_loader.validate_data_quality(df)
        
        return jsonify({
            'success': True,
            'data': {
                'summary': summary,
                'data_quality': data_quality,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days_back
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("data_summary_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    """Get current configuration"""
    try:
        config_data = {
            'prediction_threshold': config.PREDICTION_THRESHOLD,
            'cache_ttl': config.PREDICTION_CACHE_TTL,
            'feature_columns': config.FEATURE_COLUMNS,
            'model_path': config.MODEL_PATH,
            'training_config': config.get_training_config()
        }
        
        return jsonify({
            'success': True,
            'data': config_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.log_error("config_endpoint", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

def create_app():
    """Create and configure the Flask app"""
    return app

def run_api(host=None, port=None, debug=None):
    """Run the API server"""
    host = host or config.API_HOST
    port = port or config.API_PORT
    debug = debug or config.API_DEBUG
    
    logger.logger.info(f"Starting Rainbow Prediction API on {host}:{port}")
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    run_api()