"""
Logging configuration for the ML system
"""

import logging
import logging.handlers
import os
from datetime import datetime
from typing import Optional

from .config import config

def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    log_level: str = None,
    format_string: Optional[str] = None
) -> logging.Logger:
    """Set up logger with file and console handlers"""
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level or config.LOG_LEVEL))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Default format
    if format_string is None:
        format_string = (
            '%(asctime)s - %(name)s - %(levelname)s - '
            '%(filename)s:%(lineno)d - %(message)s'
        )
    
    formatter = logging.Formatter(format_string)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    if log_file:
        # Create log directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Use rotating file handler
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(getattr(logging, log_level or config.LOG_LEVEL))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return setup_logger(name, config.LOG_FILE)

class MLSystemLogger:
    """ML system specific logger with additional functionality"""
    
    def __init__(self, name: str):
        self.logger = get_logger(name)
        self.performance_logger = self._setup_performance_logger()
    
    def _setup_performance_logger(self) -> logging.Logger:
        """Set up performance specific logger"""
        return setup_logger(
            f"{self.logger.name}.performance",
            config.PERFORMANCE_LOG_FILE,
            format_string=(
                '%(asctime)s - PERFORMANCE - %(message)s'
            )
        )
    
    def log_prediction(self, probability: float, execution_time: float, 
                      weather_data: dict, model_version: str = "1.0.0"):
        """Log prediction with performance metrics"""
        self.logger.info(
            f"Prediction completed - Probability: {probability:.4f}, "
            f"Time: {execution_time:.3f}s, Model: {model_version}"
        )
        
        self.performance_logger.info(
            f"PREDICTION - probability={probability:.4f}, "
            f"execution_time={execution_time:.3f}, "
            f"model_version={model_version}, "
            f"weather_temp={weather_data.get('temperature', 'N/A')}, "
            f"weather_humidity={weather_data.get('humidity', 'N/A')}"
        )
    
    def log_training_start(self, dataset_size: int, model_name: str):
        """Log training start"""
        self.logger.info(
            f"Training started - Model: {model_name}, "
            f"Dataset size: {dataset_size}"
        )
        
        self.performance_logger.info(
            f"TRAINING_START - model={model_name}, "
            f"dataset_size={dataset_size}, "
            f"timestamp={datetime.now().isoformat()}"
        )
    
    def log_training_complete(self, model_name: str, training_time: float, 
                             metrics: dict):
        """Log training completion with metrics"""
        self.logger.info(
            f"Training completed - Model: {model_name}, "
            f"Time: {training_time:.2f}s, "
            f"Accuracy: {metrics.get('accuracy', 'N/A'):.4f}, "
            f"F1: {metrics.get('f1_score', 'N/A'):.4f}"
        )
        
        self.performance_logger.info(
            f"TRAINING_COMPLETE - model={model_name}, "
            f"training_time={training_time:.2f}, "
            f"accuracy={metrics.get('accuracy', 0):.4f}, "
            f"f1_score={metrics.get('f1_score', 0):.4f}, "
            f"precision={metrics.get('precision', 0):.4f}, "
            f"recall={metrics.get('recall', 0):.4f}, "
            f"roc_auc={metrics.get('roc_auc', 0):.4f}"
        )
    
    def log_data_processing(self, operation: str, records_processed: int, 
                           processing_time: float):
        """Log data processing operations"""
        self.logger.info(
            f"Data processing - Operation: {operation}, "
            f"Records: {records_processed}, "
            f"Time: {processing_time:.2f}s"
        )
        
        self.performance_logger.info(
            f"DATA_PROCESSING - operation={operation}, "
            f"records_processed={records_processed}, "
            f"processing_time={processing_time:.2f}"
        )
    
    def log_model_performance(self, model_name: str, metrics: dict):
        """Log model performance metrics"""
        self.logger.info(
            f"Model performance - Model: {model_name}, "
            f"Metrics: {metrics}"
        )
        
        self.performance_logger.info(
            f"MODEL_PERFORMANCE - model={model_name}, "
            f"accuracy={metrics.get('accuracy', 0):.4f}, "
            f"f1_score={metrics.get('f1_score', 0):.4f}, "
            f"precision={metrics.get('precision', 0):.4f}, "
            f"recall={metrics.get('recall', 0):.4f}"
        )
    
    def log_api_request(self, endpoint: str, response_time: float, 
                       status_code: int):
        """Log API request"""
        self.logger.info(
            f"API request - Endpoint: {endpoint}, "
            f"Status: {status_code}, "
            f"Time: {response_time:.3f}s"
        )
        
        self.performance_logger.info(
            f"API_REQUEST - endpoint={endpoint}, "
            f"response_time={response_time:.3f}, "
            f"status_code={status_code}"
        )
    
    def log_error(self, error_type: str, error_message: str, 
                  context: Optional[dict] = None):
        """Log error with context"""
        self.logger.error(
            f"Error - Type: {error_type}, "
            f"Message: {error_message}, "
            f"Context: {context or {}}"
        )
    
    def log_system_metrics(self, cpu_usage: float, memory_usage: float, 
                          disk_usage: float):
        """Log system metrics"""
        self.performance_logger.info(
            f"SYSTEM_METRICS - cpu_usage={cpu_usage:.2f}, "
            f"memory_usage={memory_usage:.2f}, "
            f"disk_usage={disk_usage:.2f}"
        )
    
    def log_cache_operation(self, operation: str, key: str, hit: bool = None):
        """Log cache operations"""
        hit_status = "hit" if hit else "miss" if hit is not None else "write"
        self.logger.debug(
            f"Cache {operation} - Key: {key}, Status: {hit_status}"
        )
    
    def log_database_operation(self, operation: str, table: str, 
                              records: int, execution_time: float):
        """Log database operations"""
        self.logger.debug(
            f"Database {operation} - Table: {table}, "
            f"Records: {records}, "
            f"Time: {execution_time:.3f}s"
        )
        
        self.performance_logger.info(
            f"DATABASE_OPERATION - operation={operation}, "
            f"table={table}, "
            f"records={records}, "
            f"execution_time={execution_time:.3f}"
        )

# Global logger instances
main_logger = MLSystemLogger("ml_system")
data_logger = MLSystemLogger("ml_system.data")
model_logger = MLSystemLogger("ml_system.model")
api_logger = MLSystemLogger("ml_system.api")
prediction_logger = MLSystemLogger("ml_system.prediction")

# Convenience functions
def get_main_logger() -> MLSystemLogger:
    """Get main ML system logger"""
    return main_logger

def get_data_logger() -> MLSystemLogger:
    """Get data processing logger"""
    return data_logger

def get_model_logger() -> MLSystemLogger:
    """Get model training logger"""
    return model_logger

def get_api_logger() -> MLSystemLogger:
    """Get API logger"""
    return api_logger

def get_prediction_logger() -> MLSystemLogger:
    """Get prediction logger"""
    return prediction_logger