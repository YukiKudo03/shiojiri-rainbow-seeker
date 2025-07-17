"""
Model training for rainbow prediction
"""

import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import time

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb

from ..data_processing.data_loader import DataLoader
from .feature_engineering import FeatureEngineer
from ..utils.config import config
from ..utils.logger import get_model_logger

logger = get_model_logger()

class RainbowPredictor:
    """Rainbow prediction model trainer and predictor"""
    
    def __init__(self):
        self.data_loader = DataLoader()
        self.feature_engineer = FeatureEngineer()
        self.models = {}
        self.scalers = {}
        self.feature_names = []
        self.best_model_name = None
        self.training_history = []
    
    def train_models(self, 
                    start_date: datetime, 
                    end_date: datetime,
                    location_filter: Optional[Dict[str, float]] = None,
                    test_size: float = None) -> Dict[str, Dict[str, float]]:
        """Train multiple models and return performance metrics"""
        
        start_time = time.time()
        test_size = test_size or config.TRAIN_TEST_SPLIT
        
        try:
            # Load and prepare data
            logger.logger.info("Loading training data...")
            df = self.data_loader.load_training_data(start_date, end_date, location_filter)
            
            if df.empty:
                raise ValueError("No training data available")
            
            # Validate data quality
            data_quality = self.data_loader.validate_data_quality(df)
            if data_quality['status'] == 'poor':
                logger.logger.warning(f"Poor data quality detected: {data_quality['issues']}")
            
            # Feature engineering
            logger.logger.info("Engineering features...")
            df_processed = self.feature_engineer.engineer_features(df)
            
            # Select features
            X, y = self.feature_engineer.select_features(df_processed)
            self.feature_names = list(X.columns)
            
            logger.logger.info(f"Training with {len(X)} samples and {len(X.columns)} features")
            logger.logger.info(f"Class distribution: {y.value_counts().to_dict()}")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=config.RANDOM_STATE, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            self.scalers['standard'] = scaler
            
            # Train models
            results = {}
            
            # Random Forest
            logger.logger.info("Training Random Forest...")
            rf_results = self._train_random_forest(X_train, y_train, X_test, y_test)
            results['random_forest'] = rf_results
            
            # XGBoost
            logger.logger.info("Training XGBoost...")
            xgb_results = self._train_xgboost(X_train, y_train, X_test, y_test)
            results['xgboost'] = xgb_results
            
            # LightGBM
            logger.logger.info("Training LightGBM...")
            lgb_results = self._train_lightgbm(X_train, y_train, X_test, y_test)
            results['lightgbm'] = lgb_results
            
            # Select best model
            self._select_best_model(results)
            
            # Log training completion
            training_time = time.time() - start_time
            dataset_info = {
                'total_samples': len(df),
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'features': len(X.columns),
                'positive_samples': (y == 1).sum(),
                'negative_samples': (y == 0).sum()
            }
            
            logger.log_training_complete(
                f"ensemble_{self.best_model_name}",
                training_time,
                results[self.best_model_name]
            )
            
            # Save training history
            self.training_history.append({
                'timestamp': datetime.now(),
                'dataset_info': dataset_info,
                'results': results,
                'best_model': self.best_model_name,
                'training_time': training_time
            })
            
            return results
            
        except Exception as e:
            logger.log_error("model_training", str(e))
            raise
    
    def _train_random_forest(self, X_train, y_train, X_test, y_test) -> Dict[str, float]:
        """Train Random Forest model"""
        
        # Grid search for hyperparameters
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [None, 10, 20],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4]
        }
        
        rf = RandomForestClassifier(random_state=config.RANDOM_STATE)
        
        # Use a subset for grid search if dataset is large
        if len(X_train) > 10000:
            grid_search = GridSearchCV(rf, param_grid, cv=3, scoring='f1', n_jobs=-1)
        else:
            grid_search = GridSearchCV(rf, param_grid, cv=5, scoring='f1', n_jobs=-1)
        
        grid_search.fit(X_train, y_train)
        
        # Train final model with best parameters
        best_rf = grid_search.best_estimator_
        best_rf.fit(X_train, y_train)
        
        # Store model
        self.models['random_forest'] = best_rf
        
        # Evaluate
        y_pred = best_rf.predict(X_test)
        y_pred_proba = best_rf.predict_proba(X_test)[:, 1]
        
        metrics = self._calculate_metrics(y_test, y_pred, y_pred_proba)
        metrics['best_params'] = grid_search.best_params_
        
        return metrics
    
    def _train_xgboost(self, X_train, y_train, X_test, y_test) -> Dict[str, float]:
        """Train XGBoost model"""
        
        # Calculate scale_pos_weight for class imbalance
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
        
        param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [3, 6, 10],
            'learning_rate': [0.01, 0.1, 0.2],
            'subsample': [0.8, 0.9],
            'colsample_bytree': [0.8, 0.9]
        }
        
        xgb_model = xgb.XGBClassifier(
            random_state=config.RANDOM_STATE,
            scale_pos_weight=scale_pos_weight,
            eval_metric='logloss'
        )
        
        # Grid search
        grid_search = GridSearchCV(xgb_model, param_grid, cv=3, scoring='f1', n_jobs=-1)
        grid_search.fit(X_train, y_train)
        
        # Train final model
        best_xgb = grid_search.best_estimator_
        
        # Store model
        self.models['xgboost'] = best_xgb
        
        # Evaluate
        y_pred = best_xgb.predict(X_test)
        y_pred_proba = best_xgb.predict_proba(X_test)[:, 1]
        
        metrics = self._calculate_metrics(y_test, y_pred, y_pred_proba)
        metrics['best_params'] = grid_search.best_params_
        
        return metrics
    
    def _train_lightgbm(self, X_train, y_train, X_test, y_test) -> Dict[str, float]:
        """Train LightGBM model"""
        
        # Calculate scale_pos_weight for class imbalance
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
        
        param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [3, 6, 10],
            'learning_rate': [0.01, 0.1, 0.2],
            'subsample': [0.8, 0.9],
            'colsample_bytree': [0.8, 0.9]
        }
        
        lgb_model = lgb.LGBMClassifier(
            random_state=config.RANDOM_STATE,
            scale_pos_weight=scale_pos_weight,
            verbose=-1
        )
        
        # Grid search
        grid_search = GridSearchCV(lgb_model, param_grid, cv=3, scoring='f1', n_jobs=-1)
        grid_search.fit(X_train, y_train)
        
        # Train final model
        best_lgb = grid_search.best_estimator_
        
        # Store model
        self.models['lightgbm'] = best_lgb
        
        # Evaluate
        y_pred = best_lgb.predict(X_test)
        y_pred_proba = best_lgb.predict_proba(X_test)[:, 1]
        
        metrics = self._calculate_metrics(y_test, y_pred, y_pred_proba)
        metrics['best_params'] = grid_search.best_params_
        
        return metrics
    
    def _calculate_metrics(self, y_true, y_pred, y_pred_proba) -> Dict[str, float]:
        """Calculate comprehensive metrics"""
        
        metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred, zero_division=0),
            'recall': recall_score(y_true, y_pred, zero_division=0),
            'f1_score': f1_score(y_true, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_true, y_pred_proba) if len(np.unique(y_true)) > 1 else 0
        }
        
        return metrics
    
    def _select_best_model(self, results: Dict[str, Dict[str, float]]):
        """Select best model based on F1 score"""
        
        best_f1 = 0
        best_model = None
        
        for model_name, metrics in results.items():
            if metrics['f1_score'] > best_f1:
                best_f1 = metrics['f1_score']
                best_model = model_name
        
        self.best_model_name = best_model
        logger.logger.info(f"Best model selected: {best_model} (F1: {best_f1:.4f})")
    
    def predict(self, weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction for single weather data point"""
        
        if not self.best_model_name or self.best_model_name not in self.models:
            raise ValueError("No trained model available")
        
        start_time = time.time()
        
        try:
            # Feature engineering
            features = self.feature_engineer.transform_single_prediction(weather_data)
            
            # Ensure all required features are present
            feature_vector = []
            for feature_name in self.feature_names:
                feature_vector.append(features.get(feature_name, 0))
            
            # Convert to numpy array
            X = np.array(feature_vector).reshape(1, -1)
            
            # Scale if necessary
            if self.best_model_name in ['logistic_regression', 'neural_network']:
                X = self.scalers['standard'].transform(X)
            
            # Make prediction
            model = self.models[self.best_model_name]
            probability = model.predict_proba(X)[0, 1]
            prediction = int(probability >= config.PREDICTION_THRESHOLD)
            
            execution_time = time.time() - start_time
            
            # Log prediction
            logger.log_prediction(probability, execution_time, weather_data)
            
            result = {
                'probability': float(probability),
                'prediction': prediction,
                'confidence': 'high' if probability > 0.7 or probability < 0.3 else 'medium',
                'model_used': self.best_model_name,
                'execution_time': execution_time,
                'timestamp': datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            logger.log_error("prediction", str(e))
            raise
    
    def predict_batch(self, weather_data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Make predictions for multiple weather data points"""
        
        results = []
        for weather_data in weather_data_list:
            try:
                result = self.predict(weather_data)
                results.append(result)
            except Exception as e:
                logger.log_error("batch_prediction", str(e))
                results.append({
                    'probability': 0.0,
                    'prediction': 0,
                    'confidence': 'low',
                    'error': str(e)
                })
        
        return results
    
    def save_model(self, filepath: str = None) -> str:
        """Save trained model to file"""
        
        if not self.best_model_name:
            raise ValueError("No trained model to save")
        
        filepath = filepath or config.MODEL_PATH
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Prepare model data
        model_data = {
            'model': self.models[self.best_model_name],
            'model_name': self.best_model_name,
            'feature_names': self.feature_names,
            'scalers': self.scalers,
            'feature_engineer': self.feature_engineer,
            'training_history': self.training_history,
            'config': {
                'threshold': config.PREDICTION_THRESHOLD,
                'version': '1.0.0',
                'created_at': datetime.now().isoformat()
            }
        }
        
        # Save to pickle file
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.logger.info(f"Model saved to {filepath}")
        return filepath
    
    def load_model(self, filepath: str = None) -> bool:
        """Load trained model from file"""
        
        filepath = filepath or config.MODEL_PATH
        
        if not os.path.exists(filepath):
            logger.logger.error(f"Model file not found: {filepath}")
            return False
        
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.models = {model_data['model_name']: model_data['model']}
            self.best_model_name = model_data['model_name']
            self.feature_names = model_data['feature_names']
            self.scalers = model_data['scalers']
            self.feature_engineer = model_data['feature_engineer']
            self.training_history = model_data.get('training_history', [])
            
            logger.logger.info(f"Model loaded from {filepath}")
            return True
            
        except Exception as e:
            logger.log_error("model_loading", str(e))
            return False
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from the best model"""
        
        if not self.best_model_name or self.best_model_name not in self.models:
            return {}
        
        model = self.models[self.best_model_name]
        
        if hasattr(model, 'feature_importances_'):
            importance_dict = dict(zip(self.feature_names, model.feature_importances_))
            # Sort by importance
            return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
        
        return {}
    
    def get_model_summary(self) -> Dict[str, Any]:
        """Get comprehensive model summary"""
        
        summary = {
            'best_model': self.best_model_name,
            'available_models': list(self.models.keys()),
            'feature_count': len(self.feature_names),
            'feature_names': self.feature_names,
            'training_runs': len(self.training_history)
        }
        
        if self.training_history:
            latest_training = self.training_history[-1]
            summary['latest_training'] = {
                'timestamp': latest_training['timestamp'].isoformat(),
                'dataset_info': latest_training['dataset_info'],
                'best_metrics': latest_training['results'].get(self.best_model_name, {})
            }
        
        feature_importance = self.get_feature_importance()
        if feature_importance:
            summary['top_features'] = dict(list(feature_importance.items())[:10])
        
        return summary