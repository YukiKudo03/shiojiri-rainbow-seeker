"""
Feature engineering for rainbow prediction model
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Tuple
import time

from ..utils.logger import get_model_logger

logger = get_model_logger()

class FeatureEngineer:
    """Feature engineering class for rainbow prediction"""
    
    def __init__(self):
        self.feature_columns = [
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'wind_direction', 'precipitation', 'cloud_cover',
            'visibility', 'uv_index', 'hour', 'month', 'season',
            'temp_humidity_interaction', 'pressure_diff',
            'wind_pressure_interaction', 'is_afternoon'
        ]
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply feature engineering to the dataset"""
        start_time = time.time()
        
        try:
            df_processed = df.copy()
            
            # Time-based features
            df_processed = self._add_time_features(df_processed)
            
            # Weather interaction features
            df_processed = self._add_interaction_features(df_processed)
            
            # Statistical features
            df_processed = self._add_statistical_features(df_processed)
            
            # Clean and validate features
            df_processed = self._clean_features(df_processed)
            
            processing_time = time.time() - start_time
            logger.log_data_processing("feature_engineering", len(df_processed), processing_time)
            
            return df_processed
            
        except Exception as e:
            logger.log_error("feature_engineering", str(e))
            raise
    
    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add time-based features"""
        if 'timestamp' not in df.columns:
            return df
        
        # Convert timestamp to datetime if it's not already
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extract time components
        df['hour'] = df['timestamp'].dt.hour
        df['month'] = df['timestamp'].dt.month
        df['day_of_year'] = df['timestamp'].dt.dayofyear
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Season mapping
        season_map = {12: 0, 1: 0, 2: 0,  # Winter
                     3: 1, 4: 1, 5: 1,   # Spring
                     6: 2, 7: 2, 8: 2,   # Summer
                     9: 3, 10: 3, 11: 3} # Autumn
        df['season'] = df['month'].map(season_map)
        
        # Time of day categories
        df['is_morning'] = ((df['hour'] >= 6) & (df['hour'] < 12)).astype(int)
        df['is_afternoon'] = ((df['hour'] >= 12) & (df['hour'] < 18)).astype(int)
        df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] < 22)).astype(int)
        
        # Cyclical encoding for hour and month
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        return df
    
    def _add_interaction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add weather interaction features"""
        
        # Temperature-humidity interaction
        if 'temperature' in df.columns and 'humidity' in df.columns:
            df['temp_humidity_interaction'] = df['temperature'] * df['humidity'] / 100
            df['heat_index'] = self._calculate_heat_index(df['temperature'], df['humidity'])
        
        # Pressure difference (current vs standard)
        if 'pressure' in df.columns:
            standard_pressure = 1013.25  # hPa at sea level
            df['pressure_diff'] = df['pressure'] - standard_pressure
            df['pressure_normalized'] = df['pressure'] / standard_pressure
        
        # Wind-pressure interaction
        if 'wind_speed' in df.columns and 'pressure' in df.columns:
            df['wind_pressure_interaction'] = df['wind_speed'] * df['pressure_diff']
        
        # Precipitation categories
        if 'precipitation' in df.columns:
            df['is_light_rain'] = ((df['precipitation'] > 0) & (df['precipitation'] <= 2.5)).astype(int)
            df['is_moderate_rain'] = ((df['precipitation'] > 2.5) & (df['precipitation'] <= 10)).astype(int)
            df['is_heavy_rain'] = (df['precipitation'] > 10).astype(int)
            df['has_precipitation'] = (df['precipitation'] > 0).astype(int)
        
        # Cloud cover categories
        if 'cloud_cover' in df.columns:
            df['is_partly_cloudy'] = ((df['cloud_cover'] > 25) & (df['cloud_cover'] <= 75)).astype(int)
            df['is_mostly_cloudy'] = (df['cloud_cover'] > 75).astype(int)
            df['is_clear'] = (df['cloud_cover'] <= 25).astype(int)
        
        # Visibility categories
        if 'visibility' in df.columns:
            df['good_visibility'] = (df['visibility'] >= 10).astype(int)
            df['poor_visibility'] = (df['visibility'] < 5).astype(int)
        
        # UV index categories
        if 'uv_index' in df.columns:
            df['low_uv'] = (df['uv_index'] <= 3).astype(int)
            df['moderate_uv'] = ((df['uv_index'] > 3) & (df['uv_index'] <= 6)).astype(int)
            df['high_uv'] = (df['uv_index'] > 6).astype(int)
        
        return df
    
    def _calculate_heat_index(self, temperature: pd.Series, humidity: pd.Series) -> pd.Series:
        """Calculate heat index (feels-like temperature)"""
        # Convert Celsius to Fahrenheit for calculation
        temp_f = temperature * 9/5 + 32
        
        # Heat index formula (simplified version)
        hi = 0.5 * (temp_f + 61.0 + ((temp_f - 68.0) * 1.2) + (humidity * 0.094))
        
        # For high temperatures, use more complex formula
        mask = temp_f >= 80
        if mask.any():
            hi_complex = (-42.379 + 2.04901523 * temp_f + 10.14333127 * humidity
                         - 0.22475541 * temp_f * humidity
                         - 0.00683783 * temp_f * temp_f
                         - 0.05481717 * humidity * humidity
                         + 0.00122874 * temp_f * temp_f * humidity
                         + 0.00085282 * temp_f * humidity * humidity
                         - 0.00000199 * temp_f * temp_f * humidity * humidity)
            hi[mask] = hi_complex[mask]
        
        # Convert back to Celsius
        return (hi - 32) * 5/9
    
    def _add_statistical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add statistical features based on rolling windows"""
        
        # Sort by timestamp for rolling calculations
        if 'timestamp' in df.columns:
            df = df.sort_values('timestamp')
        
        # Rolling statistics for numeric columns
        numeric_columns = ['temperature', 'humidity', 'pressure', 'wind_speed']
        
        for col in numeric_columns:
            if col in df.columns:
                # 3-hour rolling statistics
                df[f'{col}_rolling_mean_3h'] = df[col].rolling(window=3, min_periods=1).mean()
                df[f'{col}_rolling_std_3h'] = df[col].rolling(window=3, min_periods=1).std()
                
                # 6-hour rolling statistics
                df[f'{col}_rolling_mean_6h'] = df[col].rolling(window=6, min_periods=1).mean()
                
                # Rate of change
                df[f'{col}_change_1h'] = df[col].diff(1)
                df[f'{col}_change_3h'] = df[col].diff(3)
        
        return df
    
    def _clean_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and validate features"""
        
        # Fill NaN values with appropriate defaults
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            # Fill NaN with median for most columns
            if df[col].isnull().sum() > 0:
                if col.endswith('_change_1h') or col.endswith('_change_3h'):
                    # For change columns, fill with 0
                    df[col] = df[col].fillna(0)
                elif col.endswith('_std_3h'):
                    # For standard deviation columns, fill with 0
                    df[col] = df[col].fillna(0)
                else:
                    # For other columns, fill with median
                    df[col] = df[col].fillna(df[col].median())
        
        # Cap outliers
        for col in numeric_columns:
            if col in ['temperature', 'humidity', 'pressure', 'wind_speed']:
                # Use IQR method to cap outliers
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df[col] = df[col].clip(lower_bound, upper_bound)
        
        # Remove infinite values
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna(0)
        
        return df
    
    def select_features(self, df: pd.DataFrame, target_column: str = 'has_rainbow') -> Tuple[pd.DataFrame, pd.Series]:
        """Select final features for training"""
        
        # Core weather features
        core_features = [
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'precipitation', 'cloud_cover', 'visibility'
        ]
        
        # Time features
        time_features = [
            'hour', 'month', 'season', 'is_afternoon',
            'hour_sin', 'hour_cos', 'month_sin', 'month_cos'
        ]
        
        # Interaction features
        interaction_features = [
            'temp_humidity_interaction', 'pressure_diff',
            'wind_pressure_interaction', 'heat_index'
        ]
        
        # Category features
        category_features = [
            'is_light_rain', 'is_moderate_rain', 'is_partly_cloudy',
            'good_visibility', 'moderate_uv'
        ]
        
        # Rolling features
        rolling_features = [col for col in df.columns if 'rolling' in col or 'change' in col]
        
        # Combine all feature sets
        all_features = core_features + time_features + interaction_features + category_features + rolling_features
        
        # Filter features that actually exist in the dataframe
        available_features = [f for f in all_features if f in df.columns]
        
        logger.logger.info(f"Selected {len(available_features)} features for training")
        
        X = df[available_features]
        y = df[target_column] if target_column in df.columns else None
        
        return X, y
    
    def get_feature_importance_names(self) -> List[str]:
        """Get feature names for importance analysis"""
        return [
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'precipitation', 'cloud_cover', 'visibility', 'uv_index',
            'hour', 'month', 'season', 'is_afternoon',
            'temp_humidity_interaction', 'pressure_diff',
            'wind_pressure_interaction', 'heat_index',
            'is_light_rain', 'is_moderate_rain', 'is_partly_cloudy',
            'good_visibility', 'moderate_uv'
        ]
    
    def transform_single_prediction(self, weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform single weather data point for prediction"""
        
        # Create DataFrame from single data point
        df = pd.DataFrame([weather_data])
        
        # Add current timestamp if not provided
        if 'timestamp' not in df.columns:
            df['timestamp'] = datetime.now()
        
        # Apply feature engineering
        df_processed = self.engineer_features(df)
        
        # Select features
        X, _ = self.select_features(df_processed)
        
        # Return as dictionary
        return X.iloc[0].to_dict()