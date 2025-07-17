"""
Data loader for the ML system
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import time

from ..utils.database import db_manager
from ..utils.logger import get_data_logger

logger = get_data_logger()

class DataLoader:
    """Data loader class for loading and preparing training data"""
    
    def __init__(self):
        self.db_manager = db_manager
    
    def load_weather_data(self, 
                         start_date: datetime, 
                         end_date: datetime,
                         location_filter: Optional[Dict[str, float]] = None) -> pd.DataFrame:
        """Load weather data from database"""
        start_time = time.time()
        
        try:
            df = self.db_manager.load_weather_data(start_date, end_date)
            
            # Apply location filter if provided
            if location_filter:
                lat_center = location_filter.get('latitude', 36.0687)
                lon_center = location_filter.get('longitude', 137.9646)
                radius_km = location_filter.get('radius_km', 50)
                
                df = self._filter_by_location(df, lat_center, lon_center, radius_km)
            
            processing_time = time.time() - start_time
            logger.log_data_processing("load_weather_data", len(df), processing_time)
            
            return df
            
        except Exception as e:
            logger.log_error("load_weather_data", str(e))
            raise
    
    def load_rainbow_data(self, 
                         start_date: datetime, 
                         end_date: datetime,
                         location_filter: Optional[Dict[str, float]] = None) -> pd.DataFrame:
        """Load rainbow sighting data from database"""
        start_time = time.time()
        
        try:
            df = self.db_manager.load_rainbow_data(start_date, end_date)
            
            # Apply location filter if provided
            if location_filter:
                lat_center = location_filter.get('latitude', 36.0687)
                lon_center = location_filter.get('longitude', 137.9646)
                radius_km = location_filter.get('radius_km', 50)
                
                df = self._filter_by_location(df, lat_center, lon_center, radius_km)
            
            processing_time = time.time() - start_time
            logger.log_data_processing("load_rainbow_data", len(df), processing_time)
            
            return df
            
        except Exception as e:
            logger.log_error("load_rainbow_data", str(e))
            raise
    
    def load_training_data(self, 
                          start_date: datetime, 
                          end_date: datetime,
                          location_filter: Optional[Dict[str, float]] = None,
                          balance_data: bool = True) -> pd.DataFrame:
        """Load combined training data"""
        start_time = time.time()
        
        try:
            # Load weather data
            weather_df = self.load_weather_data(start_date, end_date, location_filter)
            
            # Load rainbow data
            rainbow_df = self.load_rainbow_data(start_date, end_date, location_filter)
            
            # Merge data
            training_df = self._merge_weather_rainbow_data(weather_df, rainbow_df)
            
            # Balance data if requested
            if balance_data:
                training_df = self._balance_training_data(training_df)
            
            processing_time = time.time() - start_time
            logger.log_data_processing("load_training_data", len(training_df), processing_time)
            
            return training_df
            
        except Exception as e:
            logger.log_error("load_training_data", str(e))
            raise
    
    def _filter_by_location(self, df: pd.DataFrame, 
                           lat_center: float, 
                           lon_center: float, 
                           radius_km: float) -> pd.DataFrame:
        """Filter data by location"""
        if df.empty:
            return df
        
        # Calculate distance using haversine formula
        lat_col = 'latitude' if 'latitude' in df.columns else 'location_latitude'
        lon_col = 'longitude' if 'longitude' in df.columns else 'location_longitude'
        
        if lat_col not in df.columns or lon_col not in df.columns:
            logger.logger.warning("Location columns not found, skipping location filter")
            return df
        
        df_filtered = df.copy()
        
        # Convert to radians
        lat1_rad = np.radians(df_filtered[lat_col])
        lon1_rad = np.radians(df_filtered[lon_col])
        lat2_rad = np.radians(lat_center)
        lon2_rad = np.radians(lon_center)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Earth's radius in kilometers
        R = 6371
        distance = R * c
        
        # Filter by radius
        mask = distance <= radius_km
        df_filtered = df_filtered[mask]
        
        logger.logger.info(f"Location filter applied: {len(df)} -> {len(df_filtered)} records")
        
        return df_filtered
    
    def _merge_weather_rainbow_data(self, weather_df: pd.DataFrame, 
                                   rainbow_df: pd.DataFrame) -> pd.DataFrame:
        """Merge weather and rainbow data"""
        if weather_df.empty:
            return pd.DataFrame()
        
        # Initialize has_rainbow column
        weather_df = weather_df.copy()
        weather_df['has_rainbow'] = 0
        
        if rainbow_df.empty:
            return weather_df
        
        # For each rainbow sighting, mark corresponding weather records
        for _, rainbow_row in rainbow_df.iterrows():
            # Find weather records within time and location window
            time_window = timedelta(hours=1)
            location_threshold = 0.01  # ~1km
            
            time_mask = (
                (weather_df['timestamp'] >= rainbow_row['timestamp'] - time_window) &
                (weather_df['timestamp'] <= rainbow_row['timestamp'] + time_window)
            )
            
            # Use appropriate location columns
            weather_lat_col = 'location_latitude' if 'location_latitude' in weather_df.columns else 'latitude'
            weather_lon_col = 'location_longitude' if 'location_longitude' in weather_df.columns else 'longitude'
            
            if weather_lat_col in weather_df.columns and weather_lon_col in weather_df.columns:
                location_mask = (
                    (abs(weather_df[weather_lat_col] - rainbow_row['latitude']) < location_threshold) &
                    (abs(weather_df[weather_lon_col] - rainbow_row['longitude']) < location_threshold)
                )
                
                combined_mask = time_mask & location_mask
            else:
                combined_mask = time_mask
            
            weather_df.loc[combined_mask, 'has_rainbow'] = 1
        
        return weather_df
    
    def _balance_training_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Balance training data to handle class imbalance"""
        if df.empty or 'has_rainbow' not in df.columns:
            return df
        
        # Count positive and negative samples
        positive_count = (df['has_rainbow'] == 1).sum()
        negative_count = (df['has_rainbow'] == 0).sum()
        
        logger.logger.info(f"Class distribution - Positive: {positive_count}, Negative: {negative_count}")
        
        if positive_count == 0 or negative_count == 0:
            return df
        
        # If negative samples are much more than positive, undersample negatives
        if negative_count > positive_count * 5:
            positive_samples = df[df['has_rainbow'] == 1]
            negative_samples = df[df['has_rainbow'] == 0]
            
            # Sample negative examples (keep 3x positive samples)
            sample_size = min(positive_count * 3, negative_count)
            negative_samples_sampled = negative_samples.sample(n=sample_size, random_state=42)
            
            balanced_df = pd.concat([positive_samples, negative_samples_sampled], ignore_index=True)
            
            logger.logger.info(f"Balanced dataset - Final size: {len(balanced_df)}")
            return balanced_df
        
        return df
    
    def load_prediction_data(self, 
                           weather_data: Dict[str, Any],
                           location: Optional[Dict[str, float]] = None) -> pd.DataFrame:
        """Load and prepare data for prediction"""
        try:
            # Create DataFrame from weather data
            df = pd.DataFrame([weather_data])
            
            # Add location if provided
            if location:
                df['latitude'] = location.get('latitude', 36.0687)
                df['longitude'] = location.get('longitude', 137.9646)
            
            # Add timestamp
            df['timestamp'] = datetime.now()
            
            return df
            
        except Exception as e:
            logger.log_error("load_prediction_data", str(e))
            raise
    
    def get_data_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get summary statistics of the dataset"""
        if df.empty:
            return {}
        
        summary = {
            'total_records': len(df),
            'date_range': {
                'start': df['timestamp'].min().isoformat() if 'timestamp' in df.columns else None,
                'end': df['timestamp'].max().isoformat() if 'timestamp' in df.columns else None
            },
            'columns': list(df.columns),
            'missing_values': df.isnull().sum().to_dict(),
            'data_types': df.dtypes.astype(str).to_dict()
        }
        
        # Add class distribution if target column exists
        if 'has_rainbow' in df.columns:
            summary['class_distribution'] = df['has_rainbow'].value_counts().to_dict()
        
        # Add basic statistics for numeric columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) > 0:
            summary['numeric_stats'] = df[numeric_columns].describe().to_dict()
        
        return summary
    
    def export_data(self, df: pd.DataFrame, filepath: str, format: str = 'csv') -> bool:
        """Export data to file"""
        try:
            if format.lower() == 'csv':
                df.to_csv(filepath, index=False)
            elif format.lower() == 'parquet':
                df.to_parquet(filepath, index=False)
            elif format.lower() == 'json':
                df.to_json(filepath, orient='records', date_format='iso')
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            logger.logger.info(f"Data exported to {filepath} (format: {format})")
            return True
            
        except Exception as e:
            logger.log_error("export_data", str(e))
            return False
    
    def load_historical_data(self, 
                           days_back: int = 30,
                           location_filter: Optional[Dict[str, float]] = None) -> pd.DataFrame:
        """Load historical data for the specified number of days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        return self.load_training_data(start_date, end_date, location_filter)
    
    def validate_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate data quality and return quality metrics"""
        if df.empty:
            return {'status': 'empty', 'issues': ['Dataset is empty']}
        
        issues = []
        warnings = []
        
        # Check for missing values
        missing_counts = df.isnull().sum()
        critical_missing = missing_counts[missing_counts > len(df) * 0.5]
        if len(critical_missing) > 0:
            issues.append(f"Critical missing values: {critical_missing.to_dict()}")
        
        moderate_missing = missing_counts[(missing_counts > len(df) * 0.1) & (missing_counts <= len(df) * 0.5)]
        if len(moderate_missing) > 0:
            warnings.append(f"Moderate missing values: {moderate_missing.to_dict()}")
        
        # Check for duplicate records
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            warnings.append(f"Duplicate records: {duplicates}")
        
        # Check date range
        if 'timestamp' in df.columns:
            date_range = (df['timestamp'].max() - df['timestamp'].min()).days
            if date_range < 7:
                warnings.append(f"Short date range: {date_range} days")
        
        # Check class balance if target exists
        if 'has_rainbow' in df.columns:
            class_counts = df['has_rainbow'].value_counts()
            if len(class_counts) > 1:
                minority_ratio = class_counts.min() / class_counts.max()
                if minority_ratio < 0.1:
                    warnings.append(f"Severe class imbalance: {minority_ratio:.3f}")
                elif minority_ratio < 0.3:
                    warnings.append(f"Moderate class imbalance: {minority_ratio:.3f}")
        
        # Determine overall status
        if len(issues) > 0:
            status = 'poor'
        elif len(warnings) > 0:
            status = 'fair'
        else:
            status = 'good'
        
        return {
            'status': status,
            'issues': issues,
            'warnings': warnings,
            'record_count': len(df),
            'completeness': (1 - df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        }