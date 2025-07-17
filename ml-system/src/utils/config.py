"""
Configuration management for the ML system
"""

import os
from dotenv import load_dotenv
from typing import Dict, Any

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for ML system"""
    
    # Database configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/shiojiri_rainbow')
    
    # Redis configuration
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    
    # Model configuration
    MODEL_PATH = os.getenv('MODEL_PATH', 'models/rainbow_model.pkl')
    MODEL_BACKUP_PATH = os.getenv('MODEL_BACKUP_PATH', 'models/backups/')
    
    # API configuration
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', 5000))
    API_DEBUG = os.getenv('API_DEBUG', 'False').lower() == 'true'
    
    # Weather API configuration
    WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
    WEATHER_API_URL = os.getenv('WEATHER_API_URL', 'https://api.openweathermap.org/data/2.5')
    
    # Logging configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/ml_system.log')
    
    # Training configuration
    TRAIN_TEST_SPLIT = float(os.getenv('TRAIN_TEST_SPLIT', 0.2))
    CROSS_VALIDATION_FOLDS = int(os.getenv('CROSS_VALIDATION_FOLDS', 5))
    RANDOM_STATE = int(os.getenv('RANDOM_STATE', 42))
    
    # Prediction configuration
    PREDICTION_THRESHOLD = float(os.getenv('PREDICTION_THRESHOLD', 0.5))
    PREDICTION_CACHE_TTL = int(os.getenv('PREDICTION_CACHE_TTL', 300))  # 5 minutes
    
    # Feature engineering configuration
    FEATURE_COLUMNS = [
        'temperature', 'humidity', 'pressure', 'wind_speed',
        'wind_direction', 'precipitation', 'cloud_cover',
        'visibility', 'uv_index', 'hour', 'month', 'season'
    ]
    
    # Model hyperparameters
    RANDOM_FOREST_PARAMS = {
        'n_estimators': int(os.getenv('RF_N_ESTIMATORS', 100)),
        'max_depth': int(os.getenv('RF_MAX_DEPTH', 10)),
        'min_samples_split': int(os.getenv('RF_MIN_SAMPLES_SPLIT', 2)),
        'min_samples_leaf': int(os.getenv('RF_MIN_SAMPLES_LEAF', 1)),
        'random_state': RANDOM_STATE
    }
    
    XGBOOST_PARAMS = {
        'n_estimators': int(os.getenv('XGB_N_ESTIMATORS', 100)),
        'max_depth': int(os.getenv('XGB_MAX_DEPTH', 6)),
        'learning_rate': float(os.getenv('XGB_LEARNING_RATE', 0.1)),
        'subsample': float(os.getenv('XGB_SUBSAMPLE', 0.8)),
        'colsample_bytree': float(os.getenv('XGB_COLSAMPLE_BYTREE', 0.8)),
        'random_state': RANDOM_STATE
    }
    
    LIGHTGBM_PARAMS = {
        'n_estimators': int(os.getenv('LGB_N_ESTIMATORS', 100)),
        'max_depth': int(os.getenv('LGB_MAX_DEPTH', 6)),
        'learning_rate': float(os.getenv('LGB_LEARNING_RATE', 0.1)),
        'subsample': float(os.getenv('LGB_SUBSAMPLE', 0.8)),
        'colsample_bytree': float(os.getenv('LGB_COLSAMPLE_BYTREE', 0.8)),
        'random_state': RANDOM_STATE
    }
    
    # Performance thresholds
    MIN_ACCURACY = float(os.getenv('MIN_ACCURACY', 0.7))
    MIN_F1_SCORE = float(os.getenv('MIN_F1_SCORE', 0.7))
    MIN_PRECISION = float(os.getenv('MIN_PRECISION', 0.65))
    MIN_RECALL = float(os.getenv('MIN_RECALL', 0.65))
    
    # Monitoring configuration
    MONITORING_INTERVAL = int(os.getenv('MONITORING_INTERVAL', 3600))  # 1 hour
    PERFORMANCE_LOG_FILE = os.getenv('PERFORMANCE_LOG_FILE', 'logs/performance.log')
    
    # Batch processing configuration
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 1000))
    BATCH_INTERVAL = int(os.getenv('BATCH_INTERVAL', 3600))  # 1 hour
    
    @classmethod
    def get_database_config(cls) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            'url': cls.DATABASE_URL,
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
            'pool_recycle': 3600
        }
    
    @classmethod
    def get_redis_config(cls) -> Dict[str, Any]:
        """Get Redis configuration"""
        return {
            'host': cls.REDIS_HOST,
            'port': cls.REDIS_PORT,
            'db': cls.REDIS_DB,
            'decode_responses': True
        }
    
    @classmethod
    def get_model_config(cls) -> Dict[str, Any]:
        """Get model configuration"""
        return {
            'path': cls.MODEL_PATH,
            'backup_path': cls.MODEL_BACKUP_PATH,
            'feature_columns': cls.FEATURE_COLUMNS,
            'threshold': cls.PREDICTION_THRESHOLD
        }
    
    @classmethod
    def get_training_config(cls) -> Dict[str, Any]:
        """Get training configuration"""
        return {
            'test_size': cls.TRAIN_TEST_SPLIT,
            'cv_folds': cls.CROSS_VALIDATION_FOLDS,
            'random_state': cls.RANDOM_STATE,
            'min_accuracy': cls.MIN_ACCURACY,
            'min_f1_score': cls.MIN_F1_SCORE,
            'min_precision': cls.MIN_PRECISION,
            'min_recall': cls.MIN_RECALL
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration"""
        required_vars = [
            'DATABASE_URL',
            'WEATHER_API_KEY'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Global configuration instance
config = Config()