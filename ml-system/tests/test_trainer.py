"""
Tests for the RainbowPredictor trainer class
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import pickle
import os
import sys

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from model_training.trainer import RainbowPredictor


@pytest.fixture
def rainbow_predictor():
    """Create RainbowPredictor instance for testing"""
    return RainbowPredictor()


@pytest.fixture
def sample_training_data():
    """Create sample training data for testing"""
    np.random.seed(42)
    n_samples = 1000
    
    return pd.DataFrame({
        'timestamp': pd.date_range('2023-01-01', periods=n_samples, freq='H'),
        'temperature': np.random.normal(20, 10, n_samples),
        'humidity': np.random.normal(70, 15, n_samples),
        'pressure': np.random.normal(1013, 10, n_samples),
        'wind_speed': np.random.exponential(3, n_samples),
        'wind_direction': np.random.uniform(0, 360, n_samples),
        'precipitation': np.random.exponential(1, n_samples),
        'cloud_cover': np.random.uniform(0, 100, n_samples),
        'visibility': np.random.uniform(1, 20, n_samples),
        'uv_index': np.random.uniform(0, 11, n_samples),
        'latitude': np.random.normal(36.0687, 0.01, n_samples),
        'longitude': np.random.normal(137.9646, 0.01, n_samples),
        'has_rainbow': np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
    })


@pytest.fixture
def balanced_training_data():
    """Create balanced training data for testing"""
    np.random.seed(42)
    
    # Create balanced dataset
    positive_samples = pd.DataFrame({
        'temperature': np.random.normal(22, 3, 250),  # Optimal conditions
        'humidity': np.random.normal(75, 10, 250),
        'pressure': np.random.normal(1013, 5, 250),
        'wind_speed': np.random.normal(2, 1, 250),
        'precipitation': np.random.normal(0.5, 0.3, 250),
        'cloud_cover': np.random.normal(50, 20, 250),
        'has_rainbow': [1] * 250
    })
    
    negative_samples = pd.DataFrame({
        'temperature': np.random.normal(15, 8, 250),  # Less optimal
        'humidity': np.random.normal(45, 15, 250),
        'pressure': np.random.normal(1020, 15, 250),
        'wind_speed': np.random.normal(8, 3, 250),
        'precipitation': np.random.normal(0, 0.1, 250),
        'cloud_cover': np.random.normal(20, 15, 250),
        'has_rainbow': [0] * 250
    })
    
    return pd.concat([positive_samples, negative_samples], ignore_index=True)


class TestRainbowPredictorInitialization:
    """Test RainbowPredictor initialization"""
    
    def test_initialization(self, rainbow_predictor):
        """Test RainbowPredictor initializes correctly"""
        assert rainbow_predictor is not None
        assert hasattr(rainbow_predictor, 'models')
        assert hasattr(rainbow_predictor, 'feature_engineer')
        assert hasattr(rainbow_predictor, 'data_loader')
        assert rainbow_predictor.models == {}
    
    def test_model_types_configuration(self, rainbow_predictor):
        """Test that model types are properly configured"""
        expected_models = ['random_forest', 'xgboost', 'lightgbm']
        
        # Check that the predictor knows about these model types
        assert hasattr(rainbow_predictor, '_get_model_instance')
        
        for model_type in expected_models:
            model = rainbow_predictor._get_model_instance(model_type)
            assert model is not None


class TestModelInstantiation:
    """Test model instantiation and configuration"""
    
    def test_get_random_forest_model(self, rainbow_predictor):
        """Test Random Forest model instantiation"""
        model = rainbow_predictor._get_model_instance('random_forest')
        
        assert model is not None
        assert hasattr(model, 'fit')
        assert hasattr(model, 'predict')
        assert hasattr(model, 'predict_proba')
        
        # Check hyperparameters
        assert model.n_estimators >= 100
        assert model.random_state is not None
    
    def test_get_xgboost_model(self, rainbow_predictor):
        """Test XGBoost model instantiation"""
        model = rainbow_predictor._get_model_instance('xgboost')
        
        assert model is not None
        assert hasattr(model, 'fit')
        assert hasattr(model, 'predict')
        assert hasattr(model, 'predict_proba')
        
        # Check that it's configured for binary classification
        assert model.objective == 'binary:logistic'
    
    def test_get_lightgbm_model(self, rainbow_predictor):
        """Test LightGBM model instantiation"""
        model = rainbow_predictor._get_model_instance('lightgbm')
        
        assert model is not None
        assert hasattr(model, 'fit')
        assert hasattr(model, 'predict')
        assert hasattr(model, 'predict_proba')
        
        # Check that it's configured for binary classification
        assert model.objective == 'binary'
    
    def test_invalid_model_type(self, rainbow_predictor):
        """Test handling of invalid model type"""
        with pytest.raises(ValueError):
            rainbow_predictor._get_model_instance('invalid_model')


class TestDataPreparation:
    """Test data preparation for training"""
    
    def test_prepare_training_data_success(self, rainbow_predictor, sample_training_data):
        """Test successful data preparation"""
        with patch.object(rainbow_predictor.feature_engineer, 'engineer_features') as mock_engineer, \
             patch.object(rainbow_predictor.feature_engineer, 'select_features') as mock_select:
            
            mock_engineer.return_value = sample_training_data
            mock_select.return_value = (
                sample_training_data.drop('has_rainbow', axis=1),
                sample_training_data['has_rainbow']
            )
            
            X, y = rainbow_predictor._prepare_training_data(sample_training_data)
            
            assert isinstance(X, pd.DataFrame)
            assert isinstance(y, pd.Series)
            assert len(X) == len(y)
            assert len(X) == len(sample_training_data)
            
            mock_engineer.assert_called_once_with(sample_training_data)
            mock_select.assert_called_once()
    
    def test_prepare_training_data_with_missing_values(self, rainbow_predictor):
        """Test data preparation with missing values"""
        data_with_missing = pd.DataFrame({
            'temperature': [20, None, 25, 22],
            'humidity': [70, 75, None, 80],
            'has_rainbow': [0, 1, 0, 1]
        })
        
        with patch.object(rainbow_predictor.feature_engineer, 'engineer_features') as mock_engineer, \
             patch.object(rainbow_predictor.feature_engineer, 'select_features') as mock_select:
            
            # Mock feature engineering to handle missing values
            cleaned_data = data_with_missing.fillna(data_with_missing.mean())
            mock_engineer.return_value = cleaned_data
            mock_select.return_value = (
                cleaned_data.drop('has_rainbow', axis=1),
                cleaned_data['has_rainbow']
            )
            
            X, y = rainbow_predictor._prepare_training_data(data_with_missing)
            
            assert not X.isnull().any().any()
            assert not y.isnull().any()
    
    def test_prepare_training_data_empty_dataset(self, rainbow_predictor):
        """Test data preparation with empty dataset"""
        empty_data = pd.DataFrame()
        
        with pytest.raises(ValueError):
            rainbow_predictor._prepare_training_data(empty_data)
    
    def test_prepare_training_data_no_target(self, rainbow_predictor, sample_training_data):
        """Test data preparation without target column"""
        data_no_target = sample_training_data.drop('has_rainbow', axis=1)
        
        with patch.object(rainbow_predictor.feature_engineer, 'engineer_features') as mock_engineer, \
             patch.object(rainbow_predictor.feature_engineer, 'select_features') as mock_select:
            
            mock_engineer.return_value = data_no_target
            mock_select.return_value = (data_no_target, None)
            
            with pytest.raises(ValueError):
                rainbow_predictor._prepare_training_data(data_no_target)


class TestModelTraining:
    """Test individual model training"""
    
    def test_train_single_model_success(self, rainbow_predictor, balanced_training_data):
        """Test successful single model training"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            # Train Random Forest
            model, metrics = rainbow_predictor._train_single_model(
                'random_forest', balanced_training_data
            )
            
            assert model is not None
            assert hasattr(model, 'predict')
            assert isinstance(metrics, dict)
            assert 'accuracy' in metrics
            assert 'precision' in metrics
            assert 'recall' in metrics
            assert 'f1_score' in metrics
            assert 'auc_roc' in metrics
            
            # Check that metrics are reasonable
            assert 0 <= metrics['accuracy'] <= 1
            assert 0 <= metrics['precision'] <= 1
            assert 0 <= metrics['recall'] <= 1
            assert 0 <= metrics['f1_score'] <= 1
            assert 0 <= metrics['auc_roc'] <= 1
    
    def test_train_single_model_cross_validation(self, rainbow_predictor, balanced_training_data):
        """Test model training with cross-validation"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            model, metrics = rainbow_predictor._train_single_model(
                'random_forest', balanced_training_data, cv_folds=3
            )
            
            assert 'cv_accuracy' in metrics
            assert 'cv_precision' in metrics
            assert 'cv_recall' in metrics
            assert isinstance(metrics['cv_accuracy'], list)
            assert len(metrics['cv_accuracy']) == 3
    
    def test_train_single_model_insufficient_data(self, rainbow_predictor):
        """Test model training with insufficient data"""
        small_data = pd.DataFrame({
            'temperature': [20, 25],
            'humidity': [70, 75],
            'has_rainbow': [0, 1]
        })
        
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = small_data.drop('has_rainbow', axis=1)
            y = small_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            with pytest.raises(ValueError):
                rainbow_predictor._train_single_model('random_forest', small_data)
    
    def test_train_single_model_imbalanced_data(self, rainbow_predictor, sample_training_data):
        """Test model training with imbalanced data"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = sample_training_data.drop('has_rainbow', axis=1)
            y = sample_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            model, metrics = rainbow_predictor._train_single_model(
                'random_forest', sample_training_data
            )
            
            # Should handle imbalanced data appropriately
            assert model is not None
            assert isinstance(metrics, dict)
            # Precision might be lower for imbalanced data
            assert 0 <= metrics['precision'] <= 1


class TestHyperparameterOptimization:
    """Test hyperparameter optimization"""
    
    def test_optimize_hyperparameters_random_forest(self, rainbow_predictor, balanced_training_data):
        """Test hyperparameter optimization for Random Forest"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            best_params = rainbow_predictor._optimize_hyperparameters(
                'random_forest', X, y, n_trials=5
            )
            
            assert isinstance(best_params, dict)
            assert len(best_params) > 0
            
            # Check that typical RF parameters are optimized
            expected_params = ['n_estimators', 'max_depth', 'min_samples_split']
            for param in expected_params:
                if param in best_params:
                    assert isinstance(best_params[param], (int, float))
    
    def test_optimize_hyperparameters_xgboost(self, rainbow_predictor, balanced_training_data):
        """Test hyperparameter optimization for XGBoost"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            best_params = rainbow_predictor._optimize_hyperparameters(
                'xgboost', X, y, n_trials=5
            )
            
            assert isinstance(best_params, dict)
            # XGBoost should have different parameters than RF
            if 'learning_rate' in best_params:
                assert 0 < best_params['learning_rate'] <= 1
    
    def test_optimize_hyperparameters_with_timeout(self, rainbow_predictor, balanced_training_data):
        """Test hyperparameter optimization with timeout"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            import time
            start_time = time.time()
            
            best_params = rainbow_predictor._optimize_hyperparameters(
                'random_forest', X, y, n_trials=100, timeout=2  # 2 second timeout
            )
            
            end_time = time.time()
            
            # Should respect timeout
            assert end_time - start_time < 5  # Some buffer for test execution
            assert isinstance(best_params, dict)


class TestFullTrainingPipeline:
    """Test complete training pipeline"""
    
    def test_train_models_success(self, rainbow_predictor, balanced_training_data):
        """Test successful multi-model training"""
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = balanced_training_data
            
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
            
            results = rainbow_predictor.train_models(start_date, end_date)
            
            assert isinstance(results, dict)
            assert 'models_trained' in results
            assert 'best_model' in results
            assert 'training_metrics' in results
            assert 'training_time' in results
            
            # Check that at least one model was trained
            assert len(results['models_trained']) > 0
            assert results['best_model'] in results['models_trained']
            
            # Check that models are stored
            assert len(rainbow_predictor.models) > 0
    
    def test_train_models_with_location_filter(self, rainbow_predictor, balanced_training_data):
        """Test training with location filter"""
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = balanced_training_data
            
            location_filter = {
                'latitude': 36.0687,
                'longitude': 137.9646,
                'radius_km': 10
            }
            
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
            
            results = rainbow_predictor.train_models(
                start_date, end_date, location_filter=location_filter
            )
            
            assert isinstance(results, dict)
            mock_load.assert_called_with(start_date, end_date, location_filter)
    
    def test_train_models_with_custom_test_size(self, rainbow_predictor, balanced_training_data):
        """Test training with custom test size"""
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = balanced_training_data
            
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
            
            results = rainbow_predictor.train_models(
                start_date, end_date, test_size=0.3
            )
            
            assert isinstance(results, dict)
            # Check that test size was respected in the metrics
            assert 'training_metrics' in results
    
    def test_train_models_insufficient_data(self, rainbow_predictor):
        """Test training with insufficient data"""
        small_data = pd.DataFrame({
            'temperature': [20, 25, 22],
            'humidity': [70, 75, 80],
            'has_rainbow': [0, 1, 0]
        })
        
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = small_data
            
            start_date = datetime.now() - timedelta(days=1)
            end_date = datetime.now()
            
            with pytest.raises(ValueError):
                rainbow_predictor.train_models(start_date, end_date)
    
    def test_train_models_no_data(self, rainbow_predictor):
        """Test training with no data"""
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = pd.DataFrame()
            
            start_date = datetime.now() - timedelta(days=1)
            end_date = datetime.now()
            
            with pytest.raises(ValueError):
                rainbow_predictor.train_models(start_date, end_date)


class TestModelComparison:
    """Test model comparison and selection"""
    
    def test_compare_models(self, rainbow_predictor):
        """Test model comparison functionality"""
        # Mock trained models with different performance
        mock_models = {
            'random_forest': (Mock(), {
                'accuracy': 0.85,
                'precision': 0.80,
                'recall': 0.75,
                'f1_score': 0.77,
                'auc_roc': 0.82
            }),
            'xgboost': (Mock(), {
                'accuracy': 0.88,
                'precision': 0.85,
                'recall': 0.82,
                'f1_score': 0.83,
                'auc_roc': 0.87
            }),
            'lightgbm': (Mock(), {
                'accuracy': 0.86,
                'precision': 0.83,
                'recall': 0.78,
                'f1_score': 0.80,
                'auc_roc': 0.84
            })
        }
        
        best_model = rainbow_predictor._select_best_model(mock_models)
        
        # XGBoost should be selected as it has the highest F1 score
        assert best_model == 'xgboost'
    
    def test_compare_models_tie_breaking(self, rainbow_predictor):
        """Test model comparison with tie-breaking"""
        mock_models = {
            'random_forest': (Mock(), {
                'accuracy': 0.85,
                'precision': 0.85,
                'recall': 0.85,
                'f1_score': 0.85,
                'auc_roc': 0.85
            }),
            'xgboost': (Mock(), {
                'accuracy': 0.85,
                'precision': 0.85,
                'recall': 0.85,
                'f1_score': 0.85,
                'auc_roc': 0.86  # Slightly higher AUC
            })
        }
        
        best_model = rainbow_predictor._select_best_model(mock_models)
        
        # Should use AUC as tiebreaker
        assert best_model == 'xgboost'
    
    def test_compare_models_single_model(self, rainbow_predictor):
        """Test model comparison with single model"""
        mock_models = {
            'random_forest': (Mock(), {
                'accuracy': 0.80,
                'f1_score': 0.75,
                'auc_roc': 0.78
            })
        }
        
        best_model = rainbow_predictor._select_best_model(mock_models)
        assert best_model == 'random_forest'


class TestModelPersistence:
    """Test model saving and loading"""
    
    def test_save_model_success(self, rainbow_predictor, tmp_path):
        """Test successful model saving"""
        # Create a mock trained model
        mock_model = Mock()
        mock_model.predict.return_value = [0, 1, 0]
        
        rainbow_predictor.models['test_model'] = mock_model
        
        model_path = tmp_path / "test_model.pkl"
        
        success = rainbow_predictor.save_model('test_model', str(model_path))
        
        assert success is True
        assert model_path.exists()
    
    def test_save_model_not_trained(self, rainbow_predictor, tmp_path):
        """Test saving model that hasn't been trained"""
        model_path = tmp_path / "nonexistent_model.pkl"
        
        success = rainbow_predictor.save_model('nonexistent_model', str(model_path))
        
        assert success is False
        assert not model_path.exists()
    
    def test_load_model_success(self, rainbow_predictor, tmp_path):
        """Test successful model loading"""
        # Create and save a model first
        mock_model = Mock()
        model_path = tmp_path / "test_model.pkl"
        
        with open(model_path, 'wb') as f:
            pickle.dump(mock_model, f)
        
        success = rainbow_predictor.load_model('test_model', str(model_path))
        
        assert success is True
        assert 'test_model' in rainbow_predictor.models
    
    def test_load_model_file_not_found(self, rainbow_predictor):
        """Test loading model from non-existent file"""
        success = rainbow_predictor.load_model('test_model', 'nonexistent_path.pkl')
        
        assert success is False
        assert 'test_model' not in rainbow_predictor.models
    
    def test_load_model_corrupted_file(self, rainbow_predictor, tmp_path):
        """Test loading corrupted model file"""
        model_path = tmp_path / "corrupted_model.pkl"
        
        # Create corrupted file
        with open(model_path, 'w') as f:
            f.write("This is not a pickle file")
        
        success = rainbow_predictor.load_model('test_model', str(model_path))
        
        assert success is False
        assert 'test_model' not in rainbow_predictor.models


class TestTrainingValidation:
    """Test training validation and error handling"""
    
    def test_validate_training_parameters(self, rainbow_predictor):
        """Test training parameter validation"""
        # Test invalid date range
        start_date = datetime.now()
        end_date = datetime.now() - timedelta(days=1)  # End before start
        
        with pytest.raises(ValueError):
            rainbow_predictor.train_models(start_date, end_date)
    
    def test_validate_test_size(self, rainbow_predictor, balanced_training_data):
        """Test test size validation"""
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = balanced_training_data
            
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
            
            # Test invalid test sizes
            invalid_test_sizes = [-0.1, 0.0, 1.0, 1.1]
            
            for test_size in invalid_test_sizes:
                with pytest.raises(ValueError):
                    rainbow_predictor.train_models(
                        start_date, end_date, test_size=test_size
                    )
    
    def test_training_with_memory_constraints(self, rainbow_predictor):
        """Test training behavior under memory constraints"""
        # Create very large dataset
        large_data = pd.DataFrame({
            'temperature': np.random.normal(20, 10, 100000),
            'humidity': np.random.normal(70, 15, 100000),
            'pressure': np.random.normal(1013, 10, 100000),
            'has_rainbow': np.random.choice([0, 1], 100000, p=[0.9, 0.1])
        })
        
        with patch.object(rainbow_predictor.data_loader, 'load_training_data') as mock_load:
            mock_load.return_value = large_data
            
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
            
            # Should handle large datasets appropriately
            # This test verifies that the training doesn't crash with large data
            try:
                results = rainbow_predictor.train_models(start_date, end_date)
                assert isinstance(results, dict)
            except MemoryError:
                pytest.skip("Not enough memory for large dataset test")


class TestTrainingMetrics:
    """Test training metrics collection and validation"""
    
    def test_metrics_calculation(self, rainbow_predictor, balanced_training_data):
        """Test that all required metrics are calculated"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            model, metrics = rainbow_predictor._train_single_model(
                'random_forest', balanced_training_data
            )
            
            required_metrics = [
                'accuracy', 'precision', 'recall', 'f1_score', 'auc_roc',
                'confusion_matrix', 'classification_report'
            ]
            
            for metric in required_metrics:
                assert metric in metrics
                
            # Validate metric ranges
            assert 0 <= metrics['accuracy'] <= 1
            assert 0 <= metrics['precision'] <= 1
            assert 0 <= metrics['recall'] <= 1
            assert 0 <= metrics['f1_score'] <= 1
            assert 0 <= metrics['auc_roc'] <= 1
    
    def test_feature_importance_extraction(self, rainbow_predictor, balanced_training_data):
        """Test feature importance extraction"""
        with patch.object(rainbow_predictor, '_prepare_training_data') as mock_prepare:
            X = balanced_training_data.drop('has_rainbow', axis=1)
            y = balanced_training_data['has_rainbow']
            mock_prepare.return_value = (X, y)
            
            model, metrics = rainbow_predictor._train_single_model(
                'random_forest', balanced_training_data
            )
            
            assert 'feature_importance' in metrics
            assert isinstance(metrics['feature_importance'], dict)
            assert len(metrics['feature_importance']) == len(X.columns)
            
            # Check that importances sum to approximately 1
            total_importance = sum(metrics['feature_importance'].values())
            assert abs(total_importance - 1.0) < 0.01


if __name__ == '__main__':
    pytest.main([__file__])