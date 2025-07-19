"""
Tests for the Rainbow Prediction API
"""

import pytest
import json
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from prediction.api import create_app
    from prediction.predictor import prediction_service
except ImportError:
    from src.prediction.api import create_app
    from src.prediction.predictor import prediction_service


@pytest.fixture
def app():
    """Create test Flask app"""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def mock_prediction_service():
    """Mock prediction service for isolated testing"""
    with patch('prediction.api.prediction_service') as mock:
        # Mock health check
        mock.health_check.return_value = {
            'service_status': 'healthy',
            'model_loaded': True,
            'redis_connected': True,
            'database_connected': True,
            'last_check': datetime.now().isoformat()
        }
        
        # Mock prediction
        mock.predict_rainbow_probability.return_value = {
            'probability': 0.75,
            'prediction': 1,
            'confidence': 'high',
            'model_used': 'random_forest',
            'execution_time': 0.045,
            'timestamp': datetime.now().isoformat(),
            'weather_conditions': 'mild, humid, light rain',
            'recommendation': 'Good chance of rainbow. Keep an eye on the sky and be prepared.',
            'cached': False
        }
        
        # Mock batch prediction
        mock.predict_batch.return_value = [
            {
                'probability': 0.75,
                'prediction': 1,
                'confidence': 'high',
                'batch_index': 0
            },
            {
                'probability': 0.35,
                'prediction': 0,
                'confidence': 'medium',
                'batch_index': 1
            }
        ]
        
        # Mock time series prediction
        mock.predict_time_series.return_value = {
            'predictions': [
                {
                    'probability': 0.65,
                    'prediction': 1,
                    'forecast_hour': 0,
                    'forecast_time': datetime.now().isoformat()
                }
            ],
            'peak_windows': [
                {
                    'start_hour': 0,
                    'end_hour': 2,
                    'max_probability': 0.75,
                    'avg_probability': 0.65,
                    'duration': 3
                }
            ],
            'max_probability': 0.75,
            'forecast_summary': {
                'max_probability': 0.75,
                'avg_probability': 0.55,
                'peak_hour': 1,
                'favorable_hours': 8,
                'total_hours': 24
            },
            'generated_at': datetime.now().isoformat()
        }
        
        # Mock statistics
        mock.get_prediction_statistics.return_value = {
            'period': {
                'start_date': (datetime.now() - timedelta(days=7)).isoformat(),
                'end_date': datetime.now().isoformat(),
                'days': 7
            },
            'total_predictions': 150,
            'avg_probability': 0.45,
            'high_confidence_predictions': 25,
            'low_confidence_predictions': 45,
            'predictions_per_day': 21.4
        }
        
        yield mock


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check_healthy(self, client, mock_prediction_service):
        """Test healthy service response"""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['service_status'] == 'healthy'
        assert data['model_loaded'] == True
        assert data['redis_connected'] == True
    
    def test_health_check_unhealthy(self, client):
        """Test unhealthy service response"""
        with patch('prediction.api.prediction_service') as mock:
            mock.health_check.return_value = {
                'service_status': 'degraded',
                'model_loaded': False,
                'issues': ['No trained model available']
            }
            
            response = client.get('/health')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['service_status'] == 'degraded'
    
    def test_health_check_exception(self, client):
        """Test health check with service exception"""
        with patch('prediction.api.prediction_service') as mock:
            mock.health_check.side_effect = Exception('Service error')
            
            response = client.get('/health')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['service_status'] == 'error'


class TestPredictEndpoint:
    """Test single prediction endpoint"""
    
    def test_predict_success(self, client, mock_prediction_service):
        """Test successful prediction"""
        weather_data = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2,
            'wind_speed': 3.5,
            'precipitation': 1.2,
            'cloud_cover': 60
        }
        
        location = {
            'latitude': 36.0687,
            'longitude': 137.9646
        }
        
        response = client.post('/predict', 
                             json={
                                 'weather_data': weather_data,
                                 'location': location,
                                 'use_cache': True
                             })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'data' in data
        assert data['data']['probability'] == 0.75
        assert data['data']['prediction'] == 1
        assert data['data']['confidence'] == 'high'
        
        mock_prediction_service.predict_rainbow_probability.assert_called_once_with(
            weather_data, location, True
        )
    
    def test_predict_no_data(self, client):
        """Test prediction with no data"""
        response = client.post('/predict')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'error' in data
    
    def test_predict_missing_weather_data(self, client):
        """Test prediction with missing weather data"""
        response = client.post('/predict', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Weather data is required' in data['error']
    
    def test_predict_missing_required_fields(self, client):
        """Test prediction with incomplete weather data"""
        incomplete_weather = {
            'temperature': 22.5
            # Missing humidity and pressure
        }
        
        response = client.post('/predict', 
                             json={'weather_data': incomplete_weather})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Missing required weather fields' in data['error']
    
    def test_predict_service_exception(self, client):
        """Test prediction with service exception"""
        with patch('prediction.api.prediction_service') as mock:
            mock.predict_rainbow_probability.side_effect = Exception('Prediction failed')
            
            weather_data = {
                'temperature': 22.5,
                'humidity': 75.0,
                'pressure': 1013.2
            }
            
            response = client.post('/predict', 
                                 json={'weather_data': weather_data})
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] == False


class TestBatchPredictEndpoint:
    """Test batch prediction endpoint"""
    
    def test_batch_predict_success(self, client, mock_prediction_service):
        """Test successful batch prediction"""
        weather_data_list = [
            {
                'temperature': 22.5,
                'humidity': 75.0,
                'pressure': 1013.2
            },
            {
                'temperature': 18.0,
                'humidity': 60.0,
                'pressure': 1015.0
            }
        ]
        
        response = client.post('/predict/batch', 
                             json={'weather_data_list': weather_data_list})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['data']['count'] == 2
        assert len(data['data']['predictions']) == 2
        
        mock_prediction_service.predict_batch.assert_called_once()
    
    def test_batch_predict_no_data(self, client):
        """Test batch prediction with no data"""
        response = client.post('/predict/batch')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
    
    def test_batch_predict_empty_list(self, client):
        """Test batch prediction with empty list"""
        response = client.post('/predict/batch', 
                             json={'weather_data_list': []})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Weather data list is required' in data['error']
    
    def test_batch_predict_too_large(self, client):
        """Test batch prediction with too many items"""
        large_list = [{'temperature': 20, 'humidity': 70, 'pressure': 1013}] * 101
        
        response = client.post('/predict/batch', 
                             json={'weather_data_list': large_list})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Batch size too large' in data['error']


class TestForecastEndpoint:
    """Test forecast prediction endpoint"""
    
    def test_forecast_predict_success(self, client, mock_prediction_service):
        """Test successful forecast prediction"""
        current_weather = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2
        }
        
        response = client.post('/predict/forecast', 
                             json={
                                 'current_weather': current_weather,
                                 'forecast_hours': 24
                             })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'data' in data
        assert 'predictions' in data['data']
        assert 'peak_windows' in data['data']
        assert 'forecast_summary' in data['data']
        
        mock_prediction_service.predict_time_series.assert_called_once()
    
    def test_forecast_no_weather_data(self, client):
        """Test forecast with no weather data"""
        response = client.post('/predict/forecast', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Current weather data is required' in data['error']
    
    def test_forecast_too_many_hours(self, client):
        """Test forecast with too many hours"""
        current_weather = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2
        }
        
        response = client.post('/predict/forecast', 
                             json={
                                 'current_weather': current_weather,
                                 'forecast_hours': 200  # > 168 hours limit
                             })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Forecast hours too large' in data['error']


class TestModelInfoEndpoint:
    """Test model information endpoints"""
    
    def test_model_info_success(self, client):
        """Test model info with loaded model"""
        with patch('prediction.api.prediction_service') as mock:
            mock.model_loaded = True
            mock.predictor.get_model_summary.return_value = {
                'best_model': 'random_forest',
                'feature_count': 25,
                'training_runs': 5
            }
            
            response = client.get('/model/info')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert data['data']['best_model'] == 'random_forest'
    
    def test_model_info_no_model(self, client):
        """Test model info with no loaded model"""
        with patch('prediction.api.prediction_service') as mock:
            mock.model_loaded = False
            
            response = client.get('/model/info')
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert data['success'] == False
            assert 'No model loaded' in data['error']
    
    def test_feature_importance_success(self, client):
        """Test feature importance endpoint"""
        with patch('prediction.api.prediction_service') as mock:
            mock.model_loaded = True
            mock.predictor.get_feature_importance.return_value = {
                'temperature': 0.25,
                'humidity': 0.20,
                'pressure': 0.15
            }
            
            response = client.get('/model/feature-importance')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert data['data']['total_features'] == 3
            assert 'feature_importance' in data['data']


class TestStatisticsEndpoint:
    """Test statistics endpoint"""
    
    def test_statistics_success(self, client, mock_prediction_service):
        """Test statistics endpoint"""
        response = client.get('/statistics?days=7')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['data']['total_predictions'] == 150
        assert data['data']['period']['days'] == 7
        
        mock_prediction_service.get_prediction_statistics.assert_called_once_with(7)
    
    def test_statistics_invalid_days(self, client):
        """Test statistics with invalid days parameter"""
        response = client.get('/statistics?days=50')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Days parameter too large' in data['error']


class TestTrainEndpoint:
    """Test model training endpoint"""
    
    def test_train_success(self, client):
        """Test successful model training"""
        with patch('prediction.api.RainbowPredictor') as mock_trainer_class:
            mock_trainer = Mock()
            mock_trainer_class.return_value = mock_trainer
            
            # Mock training results
            mock_trainer.train_models.return_value = {
                'random_forest': {
                    'accuracy': 0.85,
                    'precision': 0.80,
                    'recall': 0.75,
                    'f1_score': 0.77
                }
            }
            mock_trainer.save_model.return_value = 'models/test_model.pkl'
            
            response = client.post('/train', 
                                 json={'days_back': 30})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert 'training_results' in data['data']
            assert 'model_path' in data['data']
    
    def test_train_exception(self, client):
        """Test training with exception"""
        with patch('prediction.api.RainbowPredictor') as mock_trainer_class:
            mock_trainer_class.side_effect = Exception('Training failed')
            
            response = client.post('/train')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] == False


class TestDataSummaryEndpoint:
    """Test data summary endpoint"""
    
    def test_data_summary_success(self, client):
        """Test data summary endpoint"""
        with patch('prediction.api.DataLoader') as mock_loader_class:
            mock_loader = Mock()
            mock_loader_class.return_value = mock_loader
            
            # Mock data loading
            mock_df = Mock()
            mock_df.empty = False
            mock_loader.load_training_data.return_value = mock_df
            mock_loader.get_data_summary.return_value = {
                'total_records': 1000,
                'date_range': {
                    'start': '2023-01-01T00:00:00',
                    'end': '2023-01-31T23:59:59'
                }
            }
            mock_loader.validate_data_quality.return_value = {
                'status': 'good',
                'completeness': 95.5
            }
            
            response = client.get('/data/summary?days=30')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert data['data']['summary']['total_records'] == 1000
    
    def test_data_summary_no_data(self, client):
        """Test data summary with no data"""
        with patch('prediction.api.DataLoader') as mock_loader_class:
            mock_loader = Mock()
            mock_loader_class.return_value = mock_loader
            
            # Mock empty data
            mock_df = Mock()
            mock_df.empty = True
            mock_loader.load_training_data.return_value = mock_df
            
            response = client.get('/data/summary')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert 'No data available' in data['data']['message']


class TestConfigEndpoint:
    """Test configuration endpoint"""
    
    def test_config_success(self, client):
        """Test configuration endpoint"""
        with patch('prediction.api.config') as mock_config:
            mock_config.PREDICTION_THRESHOLD = 0.5
            mock_config.PREDICTION_CACHE_TTL = 300
            mock_config.FEATURE_COLUMNS = ['temperature', 'humidity']
            mock_config.MODEL_PATH = 'models/model.pkl'
            mock_config.get_training_config.return_value = {
                'test_size': 0.2,
                'cv_folds': 5
            }
            
            response = client.get('/config')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert data['data']['prediction_threshold'] == 0.5
            assert data['data']['cache_ttl'] == 300


class TestErrorHandling:
    """Test error handling across endpoints"""
    
    def test_global_exception_handler(self, client):
        """Test global exception handler"""
        with patch('prediction.api.prediction_service') as mock:
            mock.health_check.side_effect = RuntimeError('Unexpected error')
            
            response = client.get('/health')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] == False
            assert 'error' in data
            assert 'timestamp' in data
    
    def test_json_parse_error(self, client):
        """Test invalid JSON handling"""
        response = client.post('/predict', 
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
    
    def test_method_not_allowed(self, client):
        """Test method not allowed"""
        response = client.delete('/predict')
        
        assert response.status_code == 405


class TestRequestValidation:
    """Test request validation"""
    
    def test_content_type_validation(self, client):
        """Test content type validation for POST requests"""
        response = client.post('/predict', 
                             data='{"test": "data"}',
                             content_type='text/plain')
        
        # Should still work or return appropriate error
        assert response.status_code in [200, 400, 415]
    
    def test_request_size_limit(self, client):
        """Test request size limits"""
        large_data = {'weather_data': {'temperature': 20}} 
        # In real scenario, would test with very large payload
        
        response = client.post('/predict', json=large_data)
        
        # Should handle normally for reasonable size
        assert response.status_code in [200, 400, 413]


if __name__ == '__main__':
    pytest.main([__file__])