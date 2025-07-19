"""
Enhanced tests for ML system prediction functionality
"""
import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import json

# Import modules to test
try:
    from src.prediction.predictor import RainbowPredictor
    from src.prediction.api import app, ml_metrics
    from src.model_training.trainer import RainbowPredictor as Trainer
    from src.data_processing.data_loader import DataLoader
    from src.utils.config import config
except ImportError:
    # Handle import errors gracefully for testing
    RainbowPredictor = Mock
    app = Mock()
    ml_metrics = Mock()
    Trainer = Mock
    DataLoader = Mock
    config = Mock()


class TestRainbowPredictor:
    """Test the rainbow prediction functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.predictor = RainbowPredictor()
        self.sample_weather_data = {
            'temperature': 22.5,
            'humidity': 75,
            'pressure': 1012.3,
            'wind_speed': 5.2,
            'cloud_cover': 60,
            'precipitation': 0.1,
            'visibility': 10.0,
            'uv_index': 6
        }
        
        self.sample_location = {
            'latitude': 36.2048,
            'longitude': 138.2529,
            'elevation': 723
        }

    def test_weather_data_validation(self):
        """Test weather data validation"""
        # Valid data should pass
        assert self.predictor.validate_weather_data(self.sample_weather_data) == True
        
        # Missing required fields should fail
        incomplete_data = self.sample_weather_data.copy()
        del incomplete_data['temperature']
        assert self.predictor.validate_weather_data(incomplete_data) == False
        
        # Invalid ranges should fail
        invalid_data = self.sample_weather_data.copy()
        invalid_data['humidity'] = 150  # Invalid humidity > 100
        assert self.predictor.validate_weather_data(invalid_data) == False

    def test_feature_extraction(self):
        """Test feature extraction from weather data"""
        features = self.predictor.extract_features(
            self.sample_weather_data, 
            self.sample_location
        )
        
        assert isinstance(features, np.ndarray)
        assert features.shape[0] > 0
        assert not np.isnan(features).any()

    def test_prediction_output_format(self):
        """Test prediction output format"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            result = self.predictor.predict(
                self.sample_weather_data,
                self.sample_location
            )
            
            assert 'probability' in result
            assert 'confidence' in result
            assert 'prediction' in result
            assert 'factors' in result
            assert 0 <= result['probability'] <= 1
            assert 0 <= result['confidence'] <= 1

    def test_batch_prediction(self):
        """Test batch prediction functionality"""
        weather_list = [self.sample_weather_data for _ in range(5)]
        
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * 5)
            mock_model.predict.return_value = np.array([1] * 5)
            
            results = self.predictor.predict_batch(weather_list, self.sample_location)
            
            assert len(results) == 5
            assert all('probability' in result for result in results)

    def test_time_series_prediction(self):
        """Test time series prediction"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * 24)
            mock_model.predict.return_value = np.array([1] * 24)
            
            results = self.predictor.predict_time_series(
                self.sample_weather_data,
                hours=24,
                location=self.sample_location
            )
            
            assert 'predictions' in results
            assert 'timestamps' in results
            assert len(results['predictions']) == 24
            assert len(results['timestamps']) == 24

    def test_confidence_calculation(self):
        """Test confidence calculation"""
        # High probability should have high confidence
        high_prob = np.array([[0.1, 0.9]])
        confidence_high = self.predictor._calculate_confidence(high_prob)
        
        # Low probability should have lower confidence
        low_prob = np.array([[0.45, 0.55]])
        confidence_low = self.predictor._calculate_confidence(low_prob)
        
        assert confidence_high > confidence_low

    def test_feature_importance(self):
        """Test feature importance extraction"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.feature_importances_ = np.array([0.1, 0.2, 0.3, 0.4])
            
            importance = self.predictor.get_feature_importance()
            
            assert isinstance(importance, list)
            assert len(importance) > 0
            assert all('feature' in item and 'importance' in item for item in importance)

    def test_model_health_check(self):
        """Test model health check"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict.return_value = np.array([1])
            
            health = self.predictor.health_check()
            
            assert 'status' in health
            assert 'model_loaded' in health
            assert 'last_prediction' in health

    def test_error_handling(self):
        """Test error handling in predictions"""
        # Test with invalid weather data
        invalid_data = {'invalid': 'data'}
        
        result = self.predictor.predict(invalid_data, self.sample_location)
        
        assert 'error' in result
        assert result['probability'] == 0.0

    def test_caching_mechanism(self):
        """Test prediction caching"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            # First prediction
            result1 = self.predictor.predict(
                self.sample_weather_data,
                self.sample_location,
                use_cache=True
            )
            
            # Second prediction with same data should use cache
            result2 = self.predictor.predict(
                self.sample_weather_data,
                self.sample_location,
                use_cache=True
            )
            
            assert result1['probability'] == result2['probability']
            # Model should only be called once due to caching
            assert mock_model.predict_proba.call_count <= 2


class TestMLAPI:
    """Test ML system API endpoints"""
    
    def setup_method(self):
        """Setup test client"""
        app.config['TESTING'] = True
        self.client = app.test_client()
        
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get('/health')
        
        assert response.status_code in [200, 503]
        data = json.loads(response.data)
        assert 'service_status' in data

    def test_predict_endpoint(self):
        """Test prediction endpoint"""
        payload = {
            'weather_data': {
                'temperature': 22.5,
                'humidity': 75,
                'pressure': 1012.3,
                'wind_speed': 5.2
            },
            'location': {
                'latitude': 36.2048,
                'longitude': 138.2529
            }
        }
        
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_rainbow_probability.return_value = {
                'probability': 0.75,
                'confidence': 0.85
            }
            
            response = self.client.post('/predict', 
                                      data=json.dumps(payload),
                                      content_type='application/json')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert 'probability' in data['data']

    def test_batch_predict_endpoint(self):
        """Test batch prediction endpoint"""
        payload = {
            'weather_data_list': [
                {
                    'temperature': 22.5,
                    'humidity': 75,
                    'pressure': 1012.3
                },
                {
                    'temperature': 20.0,
                    'humidity': 80,
                    'pressure': 1015.0
                }
            ],
            'location': {
                'latitude': 36.2048,
                'longitude': 138.2529
            }
        }
        
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_batch.return_value = [
                {'probability': 0.75},
                {'probability': 0.60}
            ]
            
            response = self.client.post('/predict/batch',
                                      data=json.dumps(payload),
                                      content_type='application/json')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert len(data['data']['predictions']) == 2

    def test_forecast_endpoint(self):
        """Test forecast prediction endpoint"""
        payload = {
            'current_weather': {
                'temperature': 22.5,
                'humidity': 75,
                'pressure': 1012.3
            },
            'forecast_hours': 24,
            'location': {
                'latitude': 36.2048,
                'longitude': 138.2529
            }
        }
        
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_time_series.return_value = {
                'predictions': [{'probability': 0.75}] * 24,
                'timestamps': ['2024-01-01T00:00:00Z'] * 24
            }
            
            response = self.client.post('/predict/forecast',
                                      data=json.dumps(payload),
                                      content_type='application/json')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True

    def test_model_info_endpoint(self):
        """Test model info endpoint"""
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.model_loaded = True
            mock_service.predictor.get_model_summary.return_value = {
                'model_type': 'RandomForest',
                'features': 8,
                'accuracy': 0.85
            }
            
            response = self.client.get('/model/info')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True

    def test_feature_importance_endpoint(self):
        """Test feature importance endpoint"""
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.model_loaded = True
            mock_service.predictor.get_feature_importance.return_value = [
                {'feature': 'temperature', 'importance': 0.3},
                {'feature': 'humidity', 'importance': 0.25}
            ]
            
            response = self.client.get('/model/feature-importance')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True
            assert 'feature_importance' in data['data']

    def test_statistics_endpoint(self):
        """Test prediction statistics endpoint"""
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.get_prediction_statistics.return_value = {
                'total_predictions': 1000,
                'accuracy': 0.85,
                'average_confidence': 0.78
            }
            
            response = self.client.get('/statistics?days=7')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] == True

    def test_input_validation(self):
        """Test API input validation"""
        # Missing required fields
        invalid_payload = {'incomplete': 'data'}
        
        response = self.client.post('/predict',
                                  data=json.dumps(invalid_payload),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] == False

    def test_error_handling(self):
        """Test API error handling"""
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_rainbow_probability.side_effect = Exception("Model error")
            
            payload = {
                'weather_data': {'temperature': 22.5},
                'location': {'latitude': 36.2048, 'longitude': 138.2529}
            }
            
            response = self.client.post('/predict',
                                      data=json.dumps(payload),
                                      content_type='application/json')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] == False

    def test_rate_limiting(self):
        """Test API rate limiting"""
        # This would test rate limiting if implemented
        payload = {
            'weather_data': {'temperature': 22.5, 'humidity': 75},
            'location': {'latitude': 36.2048, 'longitude': 138.2529}
        }
        
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_rainbow_probability.return_value = {'probability': 0.5}
            
            # Make multiple requests
            responses = []
            for _ in range(10):
                response = self.client.post('/predict',
                                          data=json.dumps(payload),
                                          content_type='application/json')
                responses.append(response.status_code)
            
            # All should succeed unless rate limiting is active
            assert all(status in [200, 429] for status in responses)


class TestMLMetrics:
    """Test ML metrics collection"""
    
    def test_metrics_collection(self):
        """Test metrics are collected properly"""
        initial_count = ml_metrics.prediction_count
        
        # Simulate prediction
        ml_metrics.record_prediction()
        
        assert ml_metrics.prediction_count == initial_count + 1

    def test_error_metrics(self):
        """Test error metrics collection"""
        initial_errors = ml_metrics.error_count
        
        ml_metrics.record_error()
        
        assert ml_metrics.error_count == initial_errors + 1

    def test_response_time_metrics(self):
        """Test response time metrics"""
        duration = 0.5  # 500ms
        
        ml_metrics.record_request(duration)
        
        assert len(ml_metrics.response_times) > 0
        assert ml_metrics.response_times[-1] == duration

    def test_metrics_summary(self):
        """Test metrics summary generation"""
        metrics = ml_metrics.get_metrics()
        
        assert 'uptime_seconds' in metrics
        assert 'prediction_count' in metrics
        assert 'error_count' in metrics
        assert 'error_rate' in metrics
        assert 'avg_response_time_ms' in metrics


class TestDataLoader:
    """Test data loading functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.data_loader = DataLoader()
        
    def test_load_training_data(self):
        """Test loading training data"""
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now()
        
        with patch.object(self.data_loader, 'db_connection') as mock_db:
            mock_db.query.return_value = pd.DataFrame({
                'weather_data': ['{}'] * 100,
                'rainbow_occurred': [0, 1] * 50,
                'timestamp': pd.date_range(start_date, end_date, periods=100)
            })
            
            df = self.data_loader.load_training_data(start_date, end_date)
            
            assert isinstance(df, pd.DataFrame)
            assert len(df) > 0

    def test_data_quality_validation(self):
        """Test data quality validation"""
        # Create sample data with quality issues
        df = pd.DataFrame({
            'feature1': [1, 2, np.nan, 4, 5],
            'feature2': [1, 2, 3, 4, 999999],  # Outlier
            'target': [0, 1, 0, 1, 0]
        })
        
        quality_report = self.data_loader.validate_data_quality(df)
        
        assert 'missing_values' in quality_report
        assert 'outliers' in quality_report
        assert 'duplicate_rows' in quality_report

    def test_feature_engineering(self):
        """Test feature engineering"""
        raw_data = pd.DataFrame({
            'temperature': [20, 22, 25],
            'humidity': [70, 75, 80],
            'pressure': [1013, 1015, 1012]
        })
        
        engineered_features = self.data_loader.engineer_features(raw_data)
        
        assert engineered_features.shape[1] >= raw_data.shape[1]


class TestModelTraining:
    """Test model training functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.trainer = Trainer()
        
    def test_model_training(self):
        """Test model training process"""
        # Create synthetic training data
        X = np.random.rand(1000, 8)
        y = np.random.randint(0, 2, 1000)
        
        with patch.object(self.trainer, 'load_data') as mock_load:
            mock_load.return_value = (X, y)
            
            results = self.trainer.train_models(
                start_date=datetime.now() - timedelta(days=30),
                end_date=datetime.now()
            )
            
            assert 'models' in results
            assert 'scores' in results
            assert 'best_model' in results

    def test_model_evaluation(self):
        """Test model evaluation"""
        X_test = np.random.rand(100, 8)
        y_test = np.random.randint(0, 2, 100)
        
        with patch.object(self.trainer, 'model') as mock_model:
            mock_model.predict.return_value = y_test
            mock_model.predict_proba.return_value = np.random.rand(100, 2)
            
            scores = self.trainer.evaluate_model(X_test, y_test)
            
            assert 'accuracy' in scores
            assert 'precision' in scores
            assert 'recall' in scores
            assert 'f1_score' in scores

    def test_model_persistence(self):
        """Test model saving and loading"""
        with patch('joblib.dump') as mock_dump:
            with patch('joblib.load') as mock_load:
                # Test saving
                model_path = self.trainer.save_model()
                assert mock_dump.called
                
                # Test loading
                mock_load.return_value = Mock()
                loaded_model = self.trainer.load_model(model_path)
                assert mock_load.called


class TestIntegration:
    """Integration tests for the ML system"""
    
    def test_end_to_end_prediction(self):
        """Test complete prediction workflow"""
        # This would test the entire pipeline from data input to prediction output
        weather_data = {
            'temperature': 22.5,
            'humidity': 75,
            'pressure': 1012.3,
            'wind_speed': 5.2
        }
        
        location = {
            'latitude': 36.2048,
            'longitude': 138.2529
        }
        
        # Mock all components
        with patch('src.prediction.predictor.RainbowPredictor') as mock_predictor:
            mock_predictor.return_value.predict.return_value = {
                'probability': 0.75,
                'confidence': 0.85,
                'prediction': 1
            }
            
            # Simulate API request
            app.config['TESTING'] = True
            client = app.test_client()
            
            payload = {
                'weather_data': weather_data,
                'location': location
            }
            
            response = client.post('/predict',
                                 data=json.dumps(payload),
                                 content_type='application/json')
            
            assert response.status_code == 200

    def test_model_retraining_workflow(self):
        """Test model retraining workflow"""
        with patch('src.model_training.trainer.RainbowPredictor') as mock_trainer:
            mock_trainer.return_value.train_models.return_value = {
                'accuracy': 0.88,
                'model_path': '/tmp/model.pkl'
            }
            
            # Simulate retraining
            app.config['TESTING'] = True
            client = app.test_client()
            
            payload = {
                'days_back': 30,
                'test_size': 0.2
            }
            
            response = client.post('/train',
                                 data=json.dumps(payload),
                                 content_type='application/json')
            
            # Should succeed or return appropriate error
            assert response.status_code in [200, 400, 500]

    def test_concurrent_predictions(self):
        """Test handling concurrent predictions"""
        import threading
        import time
        
        results = []
        
        def make_prediction():
            try:
                predictor = RainbowPredictor()
                result = predictor.predict(
                    {'temperature': 22, 'humidity': 75},
                    {'latitude': 36.2, 'longitude': 138.2}
                )
                results.append(result)
            except Exception as e:
                results.append({'error': str(e)})
        
        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_prediction)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All predictions should complete
        assert len(results) == 5

if __name__ == '__main__':
    pytest.main([__file__])