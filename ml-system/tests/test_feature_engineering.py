"""
Tests for the FeatureEngineer class
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import os
import sys

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from model_training.feature_engineering import FeatureEngineer


@pytest.fixture
def feature_engineer():
    """Create FeatureEngineer instance for testing"""
    return FeatureEngineer()


@pytest.fixture
def sample_weather_data():
    """Create sample weather data for testing"""
    return pd.DataFrame({
        'timestamp': [
            datetime(2023, 6, 15, 14, 30),  # Summer afternoon
            datetime(2023, 12, 10, 8, 0),   # Winter morning
            datetime(2023, 3, 20, 18, 45),  # Spring evening
            datetime(2023, 9, 25, 12, 15),  # Autumn noon
            datetime(2023, 7, 4, 20, 0)     # Summer evening
        ],
        'temperature': [25.5, 5.0, 15.2, 18.8, 28.0],
        'humidity': [65.0, 85.0, 70.0, 60.0, 55.0],
        'pressure': [1015.2, 1020.1, 1012.8, 1018.5, 1013.0],
        'wind_speed': [3.5, 1.2, 5.8, 2.1, 4.2],
        'wind_direction': [180, 270, 90, 45, 225],
        'precipitation': [0.0, 2.5, 1.0, 0.5, 0.0],
        'cloud_cover': [40, 90, 65, 30, 20],
        'visibility': [12.0, 5.5, 8.0, 15.0, 18.0],
        'uv_index': [7, 1, 4, 5, 8]
    })


@pytest.fixture
def sample_data_with_missing():
    """Create sample data with missing values"""
    return pd.DataFrame({
        'timestamp': [
            datetime(2023, 6, 15, 14, 30),
            datetime(2023, 12, 10, 8, 0),
            datetime(2023, 3, 20, 18, 45)
        ],
        'temperature': [25.5, np.nan, 15.2],
        'humidity': [65.0, 85.0, np.nan],
        'pressure': [1015.2, 1020.1, 1012.8],
        'wind_speed': [3.5, 1.2, np.nan],
        'precipitation': [0.0, np.nan, 1.0],
        'cloud_cover': [40, 90, 65],
        'visibility': [12.0, 5.5, 8.0],
        'uv_index': [7, 1, 4]
    })


class TestFeatureEngineerInitialization:
    """Test FeatureEngineer initialization"""
    
    def test_initialization(self, feature_engineer):
        """Test FeatureEngineer initializes correctly"""
        assert feature_engineer is not None
        assert hasattr(feature_engineer, 'feature_columns')
        assert isinstance(feature_engineer.feature_columns, list)
        assert len(feature_engineer.feature_columns) > 0


class TestTimeFeatures:
    """Test time-based feature engineering"""
    
    def test_add_time_features_success(self, feature_engineer, sample_weather_data):
        """Test successful time feature extraction"""
        result = feature_engineer._add_time_features(sample_weather_data.copy())
        
        # Check that time features are added
        assert 'hour' in result.columns
        assert 'month' in result.columns
        assert 'season' in result.columns
        assert 'day_of_year' in result.columns
        assert 'day_of_week' in result.columns
        
        # Check specific values
        first_row = result.iloc[0]
        assert first_row['hour'] == 14  # 2:30 PM
        assert first_row['month'] == 6  # June
        assert first_row['season'] == 2  # Summer
    
    def test_add_time_features_time_of_day(self, feature_engineer, sample_weather_data):
        """Test time of day categorical features"""
        result = feature_engineer._add_time_features(sample_weather_data.copy())
        
        assert 'is_morning' in result.columns
        assert 'is_afternoon' in result.columns
        assert 'is_evening' in result.columns
        
        # Check afternoon detection (14:30)
        assert result.iloc[0]['is_afternoon'] == 1
        assert result.iloc[0]['is_morning'] == 0
        assert result.iloc[0]['is_evening'] == 0
        
        # Check morning detection (8:00)
        assert result.iloc[1]['is_morning'] == 1
        assert result.iloc[1]['is_afternoon'] == 0
        
        # Check evening detection (18:45)
        assert result.iloc[2]['is_evening'] == 1
        assert result.iloc[2]['is_afternoon'] == 0
    
    def test_add_time_features_cyclical_encoding(self, feature_engineer, sample_weather_data):
        """Test cyclical encoding of time features"""
        result = feature_engineer._add_time_features(sample_weather_data.copy())
        
        assert 'hour_sin' in result.columns
        assert 'hour_cos' in result.columns
        assert 'month_sin' in result.columns
        assert 'month_cos' in result.columns
        
        # Check that cyclical values are in valid range
        assert all(result['hour_sin'].between(-1, 1))
        assert all(result['hour_cos'].between(-1, 1))
        assert all(result['month_sin'].between(-1, 1))
        assert all(result['month_cos'].between(-1, 1))
    
    def test_add_time_features_no_timestamp(self, feature_engineer):
        """Test time features with no timestamp column"""
        data_no_timestamp = pd.DataFrame({
            'temperature': [20.0, 25.0],
            'humidity': [70.0, 65.0]
        })
        
        result = feature_engineer._add_time_features(data_no_timestamp)
        
        # Should return original data unchanged
        assert len(result.columns) == len(data_no_timestamp.columns)
        assert 'hour' not in result.columns
    
    def test_season_mapping(self, feature_engineer):
        """Test season mapping correctness"""
        # Create data spanning all seasons
        seasonal_data = pd.DataFrame({
            'timestamp': [
                datetime(2023, 1, 15),  # Winter
                datetime(2023, 4, 15),  # Spring
                datetime(2023, 7, 15),  # Summer
                datetime(2023, 10, 15), # Autumn
                datetime(2023, 12, 25)  # Winter
            ]
        })
        
        result = feature_engineer._add_time_features(seasonal_data)
        
        expected_seasons = [0, 1, 2, 3, 0]  # Winter, Spring, Summer, Autumn, Winter
        assert list(result['season']) == expected_seasons


class TestInteractionFeatures:
    """Test weather interaction features"""
    
    def test_add_interaction_features_success(self, feature_engineer, sample_weather_data):
        """Test successful interaction feature creation"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        # Check interaction features are added
        assert 'temp_humidity_interaction' in result.columns
        assert 'pressure_diff' in result.columns
        assert 'wind_pressure_interaction' in result.columns
        assert 'heat_index' in result.columns
        
        # Check values are calculated
        first_row = result.iloc[0]
        expected_temp_humidity = 25.5 * 65.0 / 100
        assert abs(first_row['temp_humidity_interaction'] - expected_temp_humidity) < 0.01
    
    def test_pressure_features(self, feature_engineer, sample_weather_data):
        """Test pressure-related features"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        assert 'pressure_diff' in result.columns
        assert 'pressure_normalized' in result.columns
        
        # Check pressure difference calculation
        standard_pressure = 1013.25
        first_pressure_diff = 1015.2 - standard_pressure
        assert abs(result.iloc[0]['pressure_diff'] - first_pressure_diff) < 0.01
    
    def test_precipitation_categories(self, feature_engineer, sample_weather_data):
        """Test precipitation categorization"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        assert 'is_light_rain' in result.columns
        assert 'is_moderate_rain' in result.columns
        assert 'is_heavy_rain' in result.columns
        assert 'has_precipitation' in result.columns
        
        # Check categorization logic
        # Row 1 has 2.5mm precipitation (moderate)
        assert result.iloc[1]['is_moderate_rain'] == 1
        assert result.iloc[1]['is_light_rain'] == 0
        assert result.iloc[1]['has_precipitation'] == 1
        
        # Row 0 has 0.0mm precipitation (no rain)
        assert result.iloc[0]['has_precipitation'] == 0
    
    def test_cloud_cover_categories(self, feature_engineer, sample_weather_data):
        """Test cloud cover categorization"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        assert 'is_partly_cloudy' in result.columns
        assert 'is_mostly_cloudy' in result.columns
        assert 'is_clear' in result.columns
        
        # Check categorization
        # Row 0 has 40% cloud cover (partly cloudy)
        assert result.iloc[0]['is_partly_cloudy'] == 1
        assert result.iloc[0]['is_clear'] == 0
        
        # Row 1 has 90% cloud cover (mostly cloudy)
        assert result.iloc[1]['is_mostly_cloudy'] == 1
        assert result.iloc[1]['is_partly_cloudy'] == 0
    
    def test_visibility_categories(self, feature_engineer, sample_weather_data):
        """Test visibility categorization"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        assert 'good_visibility' in result.columns
        assert 'poor_visibility' in result.columns
        
        # Row 0 has 12.0km visibility (good)
        assert result.iloc[0]['good_visibility'] == 1
        assert result.iloc[0]['poor_visibility'] == 0
        
        # Row 1 has 5.5km visibility (neither good nor poor)
        assert result.iloc[1]['good_visibility'] == 0
        assert result.iloc[1]['poor_visibility'] == 0
    
    def test_uv_index_categories(self, feature_engineer, sample_weather_data):
        """Test UV index categorization"""
        result = feature_engineer._add_interaction_features(sample_weather_data.copy())
        
        assert 'low_uv' in result.columns
        assert 'moderate_uv' in result.columns
        assert 'high_uv' in result.columns
        
        # Row 0 has UV index 7 (high)
        assert result.iloc[0]['high_uv'] == 1
        assert result.iloc[0]['moderate_uv'] == 0
        
        # Row 1 has UV index 1 (low)
        assert result.iloc[1]['low_uv'] == 1
        assert result.iloc[1]['high_uv'] == 0


class TestHeatIndexCalculation:
    """Test heat index calculation"""
    
    def test_calculate_heat_index_normal(self, feature_engineer):
        """Test heat index calculation for normal temperatures"""
        temperature = pd.Series([25.0, 30.0, 20.0])
        humidity = pd.Series([60.0, 80.0, 50.0])
        
        heat_index = feature_engineer._calculate_heat_index(temperature, humidity)
        
        assert isinstance(heat_index, pd.Series)
        assert len(heat_index) == 3
        # Heat index should be close to actual temperature for moderate conditions
        assert all(heat_index > temperature - 5)  # Generally warmer feeling
    
    def test_calculate_heat_index_high_temp(self, feature_engineer):
        """Test heat index calculation for high temperatures"""
        temperature = pd.Series([35.0, 40.0])  # High temperatures
        humidity = pd.Series([70.0, 80.0])
        
        heat_index = feature_engineer._calculate_heat_index(temperature, humidity)
        
        # Heat index should be significantly higher than actual temperature
        assert all(heat_index > temperature)
    
    def test_calculate_heat_index_low_temp(self, feature_engineer):
        """Test heat index calculation for low temperatures"""
        temperature = pd.Series([10.0, 5.0])  # Low temperatures
        humidity = pd.Series([60.0, 70.0])
        
        heat_index = feature_engineer._calculate_heat_index(temperature, humidity)
        
        # Heat index should be close to actual temperature for low temps
        assert all(abs(heat_index - temperature) < 5)


class TestStatisticalFeatures:
    """Test statistical feature engineering"""
    
    def test_add_statistical_features_success(self, feature_engineer, sample_weather_data):
        """Test successful statistical feature creation"""
        result = feature_engineer._add_statistical_features(sample_weather_data.copy())
        
        # Check rolling mean features
        assert 'temperature_rolling_mean_3h' in result.columns
        assert 'humidity_rolling_mean_3h' in result.columns
        
        # Check rolling std features
        assert 'temperature_rolling_std_3h' in result.columns
        assert 'humidity_rolling_std_3h' in result.columns
        
        # Check change features
        assert 'temperature_change_1h' in result.columns
        assert 'temperature_change_3h' in result.columns
    
    def test_rolling_calculations(self, feature_engineer):
        """Test rolling window calculations"""
        # Create data with known pattern
        data = pd.DataFrame({
            'timestamp': pd.date_range('2023-01-01', periods=5, freq='H'),
            'temperature': [10, 15, 20, 25, 30],
            'humidity': [50, 60, 70, 80, 90]
        })
        
        result = feature_engineer._add_statistical_features(data)
        
        # Check rolling mean calculation (3-hour window)
        # Third value should be mean of [10, 15, 20] = 15
        assert abs(result.iloc[2]['temperature_rolling_mean_3h'] - 15.0) < 0.01
    
    def test_change_calculations(self, feature_engineer):
        """Test change rate calculations"""
        data = pd.DataFrame({
            'timestamp': pd.date_range('2023-01-01', periods=5, freq='H'),
            'temperature': [10, 15, 20, 25, 30]
        })
        
        result = feature_engineer._add_statistical_features(data)
        
        # Check 1-hour change
        # Second value should be 15 - 10 = 5
        assert result.iloc[1]['temperature_change_1h'] == 5.0
        
        # Fourth value should be 25 - 10 = 15 (3-hour change)
        assert result.iloc[3]['temperature_change_3h'] == 15.0


class TestFeatureCleaning:
    """Test feature cleaning and validation"""
    
    def test_clean_features_fill_nan(self, feature_engineer, sample_data_with_missing):
        """Test NaN value filling"""
        result = feature_engineer._clean_features(sample_data_with_missing.copy())
        
        # Check that NaN values are filled
        assert not result.isnull().any().any()
        
        # Check that median filling works
        temp_median = sample_data_with_missing['temperature'].median()
        nan_temp_idx = sample_data_with_missing['temperature'].isnull().idxmax()
        assert result.loc[nan_temp_idx, 'temperature'] == temp_median
    
    def test_clean_features_outlier_capping(self, feature_engineer):
        """Test outlier capping"""
        # Create data with outliers
        data_with_outliers = pd.DataFrame({
            'temperature': [-50, 20, 25, 30, 100],  # Extreme values
            'humidity': [0, 50, 60, 70, 150],       # Invalid humidity
            'pressure': [500, 1010, 1015, 1020, 2000]  # Extreme pressure
        })
        
        result = feature_engineer._clean_features(data_with_outliers)
        
        # Check that extreme values are capped
        assert result['temperature'].max() < 100
        assert result['temperature'].min() > -50
        assert result['humidity'].max() <= 100
    
    def test_clean_features_infinite_values(self, feature_engineer):
        """Test infinite value handling"""
        data_with_inf = pd.DataFrame({
            'temperature': [20, 25, np.inf, 30],
            'humidity': [60, -np.inf, 70, 80]
        })
        
        result = feature_engineer._clean_features(data_with_inf)
        
        # Check that infinite values are handled
        assert not np.isinf(result).any().any()
        assert not result.isnull().any().any()


class TestFeatureSelection:
    """Test feature selection functionality"""
    
    def test_select_features_success(self, feature_engineer, sample_weather_data):
        """Test successful feature selection"""
        # First engineer features
        engineered_data = feature_engineer.engineer_features(sample_weather_data.copy())
        
        # Add target column
        engineered_data['has_rainbow'] = [0, 1, 0, 1, 0]
        
        X, y = feature_engineer.select_features(engineered_data)
        
        assert isinstance(X, pd.DataFrame)
        assert isinstance(y, pd.Series)
        assert len(X) == len(y) == 5
        assert len(X.columns) > 0
        
        # Check that target variable is correctly extracted
        assert list(y) == [0, 1, 0, 1, 0]
    
    def test_select_features_no_target(self, feature_engineer, sample_weather_data):
        """Test feature selection without target column"""
        engineered_data = feature_engineer.engineer_features(sample_weather_data.copy())
        
        X, y = feature_engineer.select_features(engineered_data, target_column='nonexistent')
        
        assert isinstance(X, pd.DataFrame)
        assert y is None
    
    def test_feature_availability(self, feature_engineer, sample_weather_data):
        """Test that only available features are selected"""
        # Create minimal data
        minimal_data = pd.DataFrame({
            'timestamp': [datetime.now()],
            'temperature': [20.0],
            'humidity': [70.0]
        })
        
        engineered_data = feature_engineer.engineer_features(minimal_data)
        X, y = feature_engineer.select_features(engineered_data)
        
        # Should only include features that exist in the data
        assert len(X.columns) > 0
        assert all(col in engineered_data.columns for col in X.columns)


class TestSinglePredictionTransform:
    """Test single prediction data transformation"""
    
    def test_transform_single_prediction_success(self, feature_engineer):
        """Test single prediction transformation"""
        weather_data = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2,
            'wind_speed': 3.5
        }
        
        result = feature_engineer.transform_single_prediction(weather_data)
        
        assert isinstance(result, dict)
        assert len(result) > len(weather_data)  # Should have more features
        
        # Check that original features are preserved
        assert result.get('temperature') == 22.5
        assert result.get('humidity') == 75.0
    
    def test_transform_single_prediction_with_timestamp(self, feature_engineer):
        """Test single prediction with provided timestamp"""
        weather_data = {
            'temperature': 22.5,
            'humidity': 75.0,
            'timestamp': datetime(2023, 6, 15, 14, 30)
        }
        
        result = feature_engineer.transform_single_prediction(weather_data)
        
        # Should use provided timestamp
        assert 'hour' in result
        assert 'month' in result


class TestFullPipeline:
    """Test full feature engineering pipeline"""
    
    def test_engineer_features_full_pipeline(self, feature_engineer, sample_weather_data):
        """Test complete feature engineering pipeline"""
        result = feature_engineer.engineer_features(sample_weather_data.copy())
        
        # Check that all types of features are added
        assert len(result.columns) > len(sample_weather_data.columns)
        
        # Time features
        assert 'hour' in result.columns
        assert 'season' in result.columns
        
        # Interaction features
        assert 'temp_humidity_interaction' in result.columns
        assert 'pressure_diff' in result.columns
        
        # Category features
        assert 'is_afternoon' in result.columns
        assert 'is_light_rain' in result.columns
        
        # Check data integrity
        assert len(result) == len(sample_weather_data)
        assert not result.isnull().any().any()
    
    def test_engineer_features_empty_data(self, feature_engineer):
        """Test feature engineering with empty data"""
        empty_data = pd.DataFrame()
        
        with pytest.raises(Exception):
            feature_engineer.engineer_features(empty_data)
    
    def test_engineer_features_minimal_data(self, feature_engineer):
        """Test feature engineering with minimal data"""
        minimal_data = pd.DataFrame({
            'timestamp': [datetime.now()],
            'temperature': [20.0]
        })
        
        result = feature_engineer.engineer_features(minimal_data)
        
        # Should still work with minimal data
        assert len(result) == 1
        assert 'temperature' in result.columns
        assert 'hour' in result.columns  # Time features should be added


class TestFeatureImportanceNames:
    """Test feature importance functionality"""
    
    def test_get_feature_importance_names(self, feature_engineer):
        """Test getting feature importance names"""
        names = feature_engineer.get_feature_importance_names()
        
        assert isinstance(names, list)
        assert len(names) > 0
        assert 'temperature' in names
        assert 'humidity' in names
        assert 'temp_humidity_interaction' in names


if __name__ == '__main__':
    pytest.main([__file__])