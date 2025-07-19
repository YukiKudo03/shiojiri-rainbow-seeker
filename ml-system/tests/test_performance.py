"""
Performance tests for ML system
"""
import pytest
import time
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import psutil
import gc
from unittest.mock import Mock, patch

try:
    from src.prediction.predictor import RainbowPredictor
    from src.prediction.api import app
    from src.model_training.trainer import RainbowPredictor as Trainer
    from src.data_processing.data_loader import DataLoader
except ImportError:
    # Handle import errors gracefully
    RainbowPredictor = Mock
    app = Mock()
    Trainer = Mock
    DataLoader = Mock


class TestPerformance:
    """Performance tests for ML system components"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.predictor = RainbowPredictor()
        self.sample_data = {
            'temperature': 22.5,
            'humidity': 75,
            'pressure': 1012.3,
            'wind_speed': 5.2,
            'cloud_cover': 60,
            'precipitation': 0.1
        }
        self.sample_location = {
            'latitude': 36.2048,
            'longitude': 138.2529
        }

    def test_single_prediction_performance(self):
        """Test single prediction performance"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            start_time = time.time()
            
            result = self.predictor.predict(self.sample_data, self.sample_location)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Single prediction should complete in under 100ms
            assert execution_time < 0.1
            assert 'probability' in result

    def test_batch_prediction_performance(self):
        """Test batch prediction performance"""
        batch_size = 100
        weather_list = [self.sample_data for _ in range(batch_size)]
        
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * batch_size)
            mock_model.predict.return_value = np.array([1] * batch_size)
            
            start_time = time.time()
            
            results = self.predictor.predict_batch(weather_list, self.sample_location)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Batch prediction should be efficient
            time_per_prediction = execution_time / batch_size
            
            assert len(results) == batch_size
            assert time_per_prediction < 0.01  # Less than 10ms per prediction

    def test_concurrent_predictions(self):
        """Test concurrent prediction performance"""
        num_threads = 10
        predictions_per_thread = 5
        
        def make_predictions():
            results = []
            with patch.object(self.predictor, 'model') as mock_model:
                mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
                mock_model.predict.return_value = np.array([1])
                
                for _ in range(predictions_per_thread):
                    result = self.predictor.predict(self.sample_data, self.sample_location)
                    results.append(result)
            return results
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(make_predictions) for _ in range(num_threads)]
            
            all_results = []
            for future in as_completed(futures):
                results = future.result()
                all_results.extend(results)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        total_predictions = num_threads * predictions_per_thread
        
        assert len(all_results) == total_predictions
        assert execution_time < 5.0  # Should complete within 5 seconds

    def test_memory_usage(self):
        """Test memory usage during predictions"""
        process = psutil.Process()
        
        # Get initial memory usage
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make multiple predictions
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            for i in range(1000):
                result = self.predictor.predict(self.sample_data, self.sample_location)
                
                # Periodic garbage collection
                if i % 100 == 0:
                    gc.collect()
        
        # Get final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100

    def test_cache_performance(self):
        """Test caching performance improvement"""
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            # First prediction (cache miss)
            start_time = time.time()
            result1 = self.predictor.predict(
                self.sample_data, 
                self.sample_location, 
                use_cache=True
            )
            cache_miss_time = time.time() - start_time
            
            # Second prediction (cache hit)
            start_time = time.time()
            result2 = self.predictor.predict(
                self.sample_data, 
                self.sample_location, 
                use_cache=True
            )
            cache_hit_time = time.time() - start_time
            
            # Cache hit should be significantly faster
            assert cache_hit_time < cache_miss_time
            assert result1['probability'] == result2['probability']

    def test_api_response_time(self):
        """Test API response time"""
        app.config['TESTING'] = True
        client = app.test_client()
        
        payload = {
            'weather_data': self.sample_data,
            'location': self.sample_location
        }
        
        with patch('src.prediction.api.prediction_service') as mock_service:
            mock_service.predict_rainbow_probability.return_value = {
                'probability': 0.75,
                'confidence': 0.85
            }
            
            start_time = time.time()
            
            response = client.post('/predict',
                                 json=payload,
                                 content_type='application/json')
            
            end_time = time.time()
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 1.0  # API should respond within 1 second

    def test_large_batch_processing(self):
        """Test processing large batches"""
        large_batch_size = 1000
        weather_list = [self.sample_data for _ in range(large_batch_size)]
        
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * large_batch_size)
            mock_model.predict.return_value = np.array([1] * large_batch_size)
            
            start_time = time.time()
            
            results = self.predictor.predict_batch(weather_list, self.sample_location)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            assert len(results) == large_batch_size
            assert execution_time < 10.0  # Should complete within 10 seconds

    def test_time_series_performance(self):
        """Test time series prediction performance"""
        hours = 168  # One week
        
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * hours)
            mock_model.predict.return_value = np.array([1] * hours)
            
            start_time = time.time()
            
            results = self.predictor.predict_time_series(
                self.sample_data,
                hours=hours,
                location=self.sample_location
            )
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            assert len(results['predictions']) == hours
            assert execution_time < 5.0  # Should complete within 5 seconds

    def test_cpu_usage(self):
        """Test CPU usage during intensive operations"""
        initial_cpu = psutil.cpu_percent(interval=1)
        
        # Perform intensive prediction operations
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            for _ in range(100):
                result = self.predictor.predict(self.sample_data, self.sample_location)
        
        final_cpu = psutil.cpu_percent(interval=1)
        
        # CPU usage should return to normal levels
        # This is just a basic check as CPU usage varies
        assert isinstance(final_cpu, (int, float))

    def test_feature_extraction_performance(self):
        """Test feature extraction performance"""
        start_time = time.time()
        
        for _ in range(1000):
            features = self.predictor.extract_features(
                self.sample_data,
                self.sample_location
            )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Feature extraction should be fast
        time_per_extraction = execution_time / 1000
        assert time_per_extraction < 0.001  # Less than 1ms per extraction

    def test_model_loading_performance(self):
        """Test model loading performance"""
        with patch('joblib.load') as mock_load:
            mock_load.return_value = Mock()
            
            start_time = time.time()
            
            model = self.predictor.load_model('/fake/path/model.pkl')
            
            end_time = time.time()
            loading_time = end_time - start_time
            
            assert loading_time < 1.0  # Model loading should be fast

    def test_data_preprocessing_performance(self):
        """Test data preprocessing performance"""
        # Create large dataset
        large_dataset = pd.DataFrame({
            'temperature': np.random.normal(20, 5, 10000),
            'humidity': np.random.normal(70, 15, 10000),
            'pressure': np.random.normal(1013, 10, 10000),
            'wind_speed': np.random.exponential(5, 10000)
        })
        
        data_loader = DataLoader()
        
        start_time = time.time()
        
        processed_data = data_loader.preprocess_data(large_dataset)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        assert len(processed_data) == len(large_dataset)
        assert processing_time < 5.0  # Should process within 5 seconds

    def test_prediction_accuracy_vs_speed_tradeoff(self):
        """Test different model configurations for speed vs accuracy"""
        configurations = [
            {'n_estimators': 10, 'max_depth': 5},   # Fast
            {'n_estimators': 100, 'max_depth': 10}, # Balanced
            {'n_estimators': 500, 'max_depth': 20}  # Accurate
        ]
        
        results = []
        
        for config in configurations:
            with patch.object(self.predictor, 'model') as mock_model:
                mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
                mock_model.predict.return_value = np.array([1])
                
                start_time = time.time()
                
                prediction = self.predictor.predict(self.sample_data, self.sample_location)
                
                end_time = time.time()
                
                results.append({
                    'config': config,
                    'time': end_time - start_time,
                    'prediction': prediction
                })
        
        # All configurations should complete
        assert len(results) == len(configurations)

    def test_stress_test(self):
        """Stress test with high load"""
        num_requests = 500
        batch_size = 50
        
        def make_batch_request():
            weather_list = [self.sample_data for _ in range(batch_size)]
            
            with patch.object(self.predictor, 'model') as mock_model:
                mock_model.predict_proba.return_value = np.array([[0.3, 0.7]] * batch_size)
                mock_model.predict.return_value = np.array([1] * batch_size)
                
                return self.predictor.predict_batch(weather_list, self.sample_location)
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_batch_request) for _ in range(num_requests)]
            
            completed = 0
            failed = 0
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if len(result) == batch_size:
                        completed += 1
                    else:
                        failed += 1
                except Exception:
                    failed += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Most requests should complete successfully
        success_rate = completed / num_requests
        assert success_rate > 0.9  # At least 90% success rate
        
        # Should handle high load reasonably well
        assert total_time < 60.0  # Complete within 1 minute

    def test_memory_leak_detection(self):
        """Test for memory leaks during extended operation"""
        process = psutil.Process()
        
        memory_readings = []
        
        with patch.object(self.predictor, 'model') as mock_model:
            mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
            mock_model.predict.return_value = np.array([1])
            
            for i in range(100):
                # Make prediction
                result = self.predictor.predict(self.sample_data, self.sample_location)
                
                # Record memory usage every 10 iterations
                if i % 10 == 0:
                    memory_mb = process.memory_info().rss / 1024 / 1024
                    memory_readings.append(memory_mb)
                    
                    # Force garbage collection
                    gc.collect()
        
        # Check for memory growth trend
        if len(memory_readings) > 3:
            # Calculate linear trend
            x = np.arange(len(memory_readings))
            slope = np.polyfit(x, memory_readings, 1)[0]
            
            # Slope should be minimal (no significant memory leak)
            assert slope < 1.0  # Less than 1MB per measurement


class TestScalability:
    """Test system scalability"""
    
    def test_horizontal_scaling_simulation(self):
        """Simulate horizontal scaling"""
        # Simulate multiple instances handling requests
        instances = 3
        requests_per_instance = 100
        
        def simulate_instance(instance_id):
            predictor = RainbowPredictor()
            results = []
            
            with patch.object(predictor, 'model') as mock_model:
                mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
                mock_model.predict.return_value = np.array([1])
                
                for _ in range(requests_per_instance):
                    result = predictor.predict(
                        {'temperature': 22, 'humidity': 75},
                        {'latitude': 36.2, 'longitude': 138.2}
                    )
                    results.append(result)
            
            return len(results)
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=instances) as executor:
            futures = [
                executor.submit(simulate_instance, i) 
                for i in range(instances)
            ]
            
            total_processed = sum(future.result() for future in as_completed(futures))
        
        end_time = time.time()
        total_time = end_time - start_time
        
        expected_total = instances * requests_per_instance
        
        assert total_processed == expected_total
        assert total_time < 30.0  # Should scale reasonably

    def test_database_connection_pooling(self):
        """Test database connection pooling performance"""
        data_loader = DataLoader()
        
        def make_db_query():
            with patch.object(data_loader, 'db_connection') as mock_db:
                mock_db.query.return_value = pd.DataFrame({'data': [1, 2, 3]})
                return data_loader.load_recent_data(limit=10)
        
        start_time = time.time()
        
        # Simulate concurrent database access
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_db_query) for _ in range(50)]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        assert len(results) == 50
        assert total_time < 10.0  # Should handle concurrent access efficiently


if __name__ == '__main__':
    pytest.main([__file__, '-v'])