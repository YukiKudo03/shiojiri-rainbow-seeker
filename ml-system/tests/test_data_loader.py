"""
Tests for the DataLoader class
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import os
import sys

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from data_processing.data_loader import DataLoader
except ImportError:
    # Try alternative import path
    from src.data_processing.data_loader import DataLoader


@pytest.fixture
def data_loader():
    """Create DataLoader instance for testing"""
    with patch('data_processing.data_loader.db_manager') as mock_db:
        loader = DataLoader()
        return loader, mock_db


@pytest.fixture
def sample_weather_data():
    """Create sample weather data for testing"""
    return pd.DataFrame({
        'id': [1, 2, 3, 4, 5],
        'timestamp': [
            datetime.now() - timedelta(hours=i) 
            for i in range(5)
        ],
        'temperature': [20.5, 22.0, 21.5, 19.0, 18.5],
        'humidity': [75.0, 70.0, 80.0, 85.0, 90.0],
        'pressure': [1013.2, 1015.0, 1012.5, 1010.0, 1008.0],
        'wind_speed': [3.5, 2.0, 4.5, 5.0, 1.5],
        'wind_direction': [180, 200, 160, 220, 190],
        'precipitation': [0.0, 0.5, 1.2, 2.0, 0.0],
        'cloud_cover': [50, 60, 70, 80, 40],
        'visibility': [10.0, 8.5, 6.0, 5.0, 12.0],
        'uv_index': [3, 4, 2, 1, 3],
        'location_latitude': [36.0687, 36.0690, 36.0685, 36.0692, 36.0688],
        'location_longitude': [137.9646, 137.9649, 137.9643, 137.9651, 137.9647]
    })


@pytest.fixture
def sample_rainbow_data():
    """Create sample rainbow data for testing"""
    return pd.DataFrame({
        'id': [1, 2],
        'timestamp': [
            datetime.now() - timedelta(hours=2),
            datetime.now() - timedelta(hours=1)
        ],
        'latitude': [36.0687, 36.0690],
        'longitude': [137.9646, 137.9649],
        'description': ['Beautiful rainbow', 'Double rainbow'],
        'user_name': ['User1', 'User2'],
        'has_rainbow': [1, 1]
    })


class TestDataLoaderInitialization:
    """Test DataLoader initialization"""
    
    def test_initialization(self):
        """Test DataLoader initializes correctly"""
        with patch('data_processing.data_loader.db_manager'):
            loader = DataLoader()
            assert loader.db_manager is not None


class TestLoadWeatherData:
    """Test weather data loading"""
    
    def test_load_weather_data_success(self, data_loader, sample_weather_data):
        """Test successful weather data loading"""
        loader, mock_db = data_loader
        mock_db.load_weather_data.return_value = sample_weather_data
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        
        result = loader.load_weather_data(start_date, end_date)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 5
        assert 'temperature' in result.columns
        assert 'humidity' in result.columns
        mock_db.load_weather_data.assert_called_once_with(start_date, end_date)
    
    def test_load_weather_data_with_location_filter(self, data_loader, sample_weather_data):
        """Test weather data loading with location filter"""
        loader, mock_db = data_loader
        mock_db.load_weather_data.return_value = sample_weather_data
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        location_filter = {
            'latitude': 36.0687,
            'longitude': 137.9646,
            'radius_km': 10
        }
        
        result = loader.load_weather_data(start_date, end_date, location_filter)
        
        assert isinstance(result, pd.DataFrame)
        # All sample data should be within 10km of the center
        assert len(result) <= len(sample_weather_data)
    
    def test_load_weather_data_empty_result(self, data_loader):
        """Test weather data loading with empty result"""
        loader, mock_db = data_loader
        mock_db.load_weather_data.return_value = pd.DataFrame()
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        
        result = loader.load_weather_data(start_date, end_date)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0
    
    def test_load_weather_data_exception(self, data_loader):
        """Test weather data loading with database exception"""
        loader, mock_db = data_loader
        mock_db.load_weather_data.side_effect = Exception('Database error')
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        
        with pytest.raises(Exception):
            loader.load_weather_data(start_date, end_date)


class TestLoadRainbowData:
    """Test rainbow data loading"""
    
    def test_load_rainbow_data_success(self, data_loader, sample_rainbow_data):
        """Test successful rainbow data loading"""
        loader, mock_db = data_loader
        mock_db.load_rainbow_data.return_value = sample_rainbow_data
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        
        result = loader.load_rainbow_data(start_date, end_date)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2
        assert 'latitude' in result.columns
        assert 'longitude' in result.columns
        mock_db.load_rainbow_data.assert_called_once_with(start_date, end_date)
    
    def test_load_rainbow_data_with_location_filter(self, data_loader, sample_rainbow_data):
        """Test rainbow data loading with location filter"""
        loader, mock_db = data_loader
        mock_db.load_rainbow_data.return_value = sample_rainbow_data
        
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        location_filter = {
            'latitude': 36.0687,
            'longitude': 137.9646,
            'radius_km': 5
        }
        
        result = loader.load_rainbow_data(start_date, end_date, location_filter)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) <= len(sample_rainbow_data)


class TestLoadTrainingData:
    """Test training data loading and merging"""
    
    def test_load_training_data_success(self, data_loader, sample_weather_data, sample_rainbow_data):
        """Test successful training data loading"""
        loader, mock_db = data_loader
        
        with patch.object(loader, 'load_weather_data') as mock_weather, \
             patch.object(loader, 'load_rainbow_data') as mock_rainbow, \
             patch.object(loader, '_merge_weather_rainbow_data') as mock_merge, \
             patch.object(loader, '_balance_training_data') as mock_balance:
            
            mock_weather.return_value = sample_weather_data
            mock_rainbow.return_value = sample_rainbow_data
            mock_merge.return_value = sample_weather_data.copy()
            mock_balance.return_value = sample_weather_data.copy()
            
            start_date = datetime.now() - timedelta(days=1)
            end_date = datetime.now()
            
            result = loader.load_training_data(start_date, end_date)
            
            assert isinstance(result, pd.DataFrame)
            mock_weather.assert_called_once()
            mock_rainbow.assert_called_once()
            mock_merge.assert_called_once()
            mock_balance.assert_called_once()
    
    def test_load_training_data_no_balance(self, data_loader, sample_weather_data, sample_rainbow_data):
        """Test training data loading without balancing"""
        loader, mock_db = data_loader
        
        with patch.object(loader, 'load_weather_data') as mock_weather, \
             patch.object(loader, 'load_rainbow_data') as mock_rainbow, \
             patch.object(loader, '_merge_weather_rainbow_data') as mock_merge, \
             patch.object(loader, '_balance_training_data') as mock_balance:
            
            mock_weather.return_value = sample_weather_data
            mock_rainbow.return_value = sample_rainbow_data
            mock_merge.return_value = sample_weather_data.copy()
            
            start_date = datetime.now() - timedelta(days=1)
            end_date = datetime.now()
            
            result = loader.load_training_data(start_date, end_date, balance_data=False)
            
            assert isinstance(result, pd.DataFrame)
            mock_balance.assert_not_called()


class TestLocationFiltering:
    """Test location filtering functionality"""
    
    def test_filter_by_location_success(self, data_loader, sample_weather_data):
        """Test location filtering with valid data"""
        loader, mock_db = data_loader
        
        # Center point in Shiojiri
        lat_center = 36.0687
        lon_center = 137.9646
        radius_km = 1.0  # 1km radius
        
        result = loader._filter_by_location(sample_weather_data, lat_center, lon_center, radius_km)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) <= len(sample_weather_data)
        
        # Check that all points are within the radius
        for _, row in result.iterrows():
            # Calculate distance manually to verify
            lat_diff = abs(row['location_latitude'] - lat_center)
            lon_diff = abs(row['location_longitude'] - lon_center)
            # Simple approximation check
            assert lat_diff < 0.1 and lon_diff < 0.1
    
    def test_filter_by_location_empty_data(self, data_loader):
        """Test location filtering with empty DataFrame"""
        loader, mock_db = data_loader
        
        empty_df = pd.DataFrame()
        result = loader._filter_by_location(empty_df, 36.0, 137.0, 10.0)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0
    
    def test_filter_by_location_missing_columns(self, data_loader):
        """Test location filtering with missing location columns"""
        loader, mock_db = data_loader
        
        df_no_location = pd.DataFrame({
            'temperature': [20.0, 21.0],
            'humidity': [70.0, 75.0]
        })
        
        result = loader._filter_by_location(df_no_location, 36.0, 137.0, 10.0)
        
        # Should return original data when location columns are missing
        assert len(result) == len(df_no_location)


class TestDataMerging:
    """Test weather and rainbow data merging"""
    
    def test_merge_weather_rainbow_data_success(self, data_loader, sample_weather_data):
        """Test successful merging of weather and rainbow data"""
        loader, mock_db = data_loader
        
        # Create rainbow data that should match some weather data
        rainbow_data = pd.DataFrame({
            'timestamp': [sample_weather_data.iloc[1]['timestamp']],
            'latitude': [sample_weather_data.iloc[1]['location_latitude']],
            'longitude': [sample_weather_data.iloc[1]['location_longitude']]
        })
        
        result = loader._merge_weather_rainbow_data(sample_weather_data, rainbow_data)
        
        assert isinstance(result, pd.DataFrame)
        assert 'has_rainbow' in result.columns
        assert len(result) == len(sample_weather_data)
        # At least one record should be marked as having a rainbow
        assert result['has_rainbow'].sum() >= 1
    
    def test_merge_weather_rainbow_data_no_rainbow(self, data_loader, sample_weather_data):
        """Test merging with no rainbow data"""
        loader, mock_db = data_loader
        
        empty_rainbow = pd.DataFrame()
        result = loader._merge_weather_rainbow_data(sample_weather_data, empty_rainbow)
        
        assert isinstance(result, pd.DataFrame)
        assert 'has_rainbow' in result.columns
        assert result['has_rainbow'].sum() == 0  # No rainbows
    
    def test_merge_weather_rainbow_data_empty_weather(self, data_loader):
        """Test merging with empty weather data"""
        loader, mock_db = data_loader
        
        empty_weather = pd.DataFrame()
        rainbow_data = pd.DataFrame({
            'timestamp': [datetime.now()],
            'latitude': [36.0],
            'longitude': [137.0]
        })
        
        result = loader._merge_weather_rainbow_data(empty_weather, rainbow_data)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0


class TestDataBalancing:
    """Test data balancing functionality"""
    
    def test_balance_training_data_imbalanced(self, data_loader):
        """Test balancing with imbalanced data"""
        loader, mock_db = data_loader
        
        # Create highly imbalanced dataset
        imbalanced_data = pd.DataFrame({
            'temperature': [20.0] * 100 + [25.0] * 5,
            'humidity': [70.0] * 100 + [80.0] * 5,
            'has_rainbow': [0] * 100 + [1] * 5  # 5% positive class
        })
        
        result = loader._balance_training_data(imbalanced_data)
        
        assert isinstance(result, pd.DataFrame)
        # Should reduce the number of negative samples
        assert len(result) < len(imbalanced_data)
        
        positive_count = (result['has_rainbow'] == 1).sum()
        negative_count = (result['has_rainbow'] == 0).sum()
        
        # Negative samples should be reduced but not eliminated
        assert negative_count > 0
        assert negative_count <= positive_count * 3  # Max 3:1 ratio
    
    def test_balance_training_data_balanced(self, data_loader):
        """Test balancing with already balanced data"""
        loader, mock_db = data_loader
        
        # Create balanced dataset
        balanced_data = pd.DataFrame({
            'temperature': [20.0] * 50 + [25.0] * 50,
            'humidity': [70.0] * 50 + [80.0] * 50,
            'has_rainbow': [0] * 50 + [1] * 50  # 50% positive class
        })
        
        result = loader._balance_training_data(balanced_data)
        
        assert isinstance(result, pd.DataFrame)
        # Should return data unchanged
        assert len(result) == len(balanced_data)
    
    def test_balance_training_data_no_target(self, data_loader):
        """Test balancing with missing target column"""
        loader, mock_db = data_loader
        
        data_no_target = pd.DataFrame({
            'temperature': [20.0, 21.0, 22.0],
            'humidity': [70.0, 75.0, 80.0]
        })
        
        result = loader._balance_training_data(data_no_target)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == len(data_no_target)


class TestPredictionData:
    """Test prediction data preparation"""
    
    def test_load_prediction_data_success(self, data_loader):
        """Test loading prediction data"""
        loader, mock_db = data_loader
        
        weather_data = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2
        }
        
        location = {
            'latitude': 36.0687,
            'longitude': 137.9646
        }
        
        result = loader.load_prediction_data(weather_data, location)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 1
        assert result.iloc[0]['temperature'] == 22.5
        assert result.iloc[0]['latitude'] == 36.0687
        assert 'timestamp' in result.columns
    
    def test_load_prediction_data_no_location(self, data_loader):
        """Test loading prediction data without location"""
        loader, mock_db = data_loader
        
        weather_data = {
            'temperature': 22.5,
            'humidity': 75.0,
            'pressure': 1013.2
        }
        
        result = loader.load_prediction_data(weather_data)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 1
        assert result.iloc[0]['temperature'] == 22.5
        # Should use default location
        assert result.iloc[0]['latitude'] == 36.0687


class TestDataSummary:
    """Test data summary functionality"""
    
    def test_get_data_summary_success(self, data_loader, sample_weather_data):
        """Test data summary generation"""
        loader, mock_db = data_loader
        
        # Add has_rainbow column for testing
        sample_data = sample_weather_data.copy()
        sample_data['has_rainbow'] = [0, 1, 0, 1, 0]
        
        result = loader.get_data_summary(sample_data)
        
        assert isinstance(result, dict)
        assert result['total_records'] == 5
        assert 'date_range' in result
        assert 'columns' in result
        assert 'missing_values' in result
        assert 'class_distribution' in result
        assert result['class_distribution'][0] == 3  # 3 no-rainbow records
        assert result['class_distribution'][1] == 2  # 2 rainbow records
    
    def test_get_data_summary_empty(self, data_loader):
        """Test data summary with empty DataFrame"""
        loader, mock_db = data_loader
        
        empty_df = pd.DataFrame()
        result = loader.get_data_summary(empty_df)
        
        assert isinstance(result, dict)
        assert len(result) == 0


class TestDataQualityValidation:
    """Test data quality validation"""
    
    def test_validate_data_quality_good(self, data_loader, sample_weather_data):
        """Test data quality validation with good data"""
        loader, mock_db = data_loader
        
        result = loader.validate_data_quality(sample_weather_data)
        
        assert isinstance(result, dict)
        assert result['status'] in ['good', 'fair', 'poor']
        assert 'issues' in result
        assert 'warnings' in result
        assert 'record_count' in result
        assert 'completeness' in result
        assert result['record_count'] == 5
    
    def test_validate_data_quality_missing_values(self, data_loader):
        """Test data quality validation with missing values"""
        loader, mock_db = data_loader
        
        # Create data with many missing values
        data_with_missing = pd.DataFrame({
            'temperature': [20.0, None, 22.0, None, None],
            'humidity': [70.0, 75.0, None, None, None],
            'pressure': [1013.2, 1015.0, 1012.0, None, None]
        })
        
        result = loader.validate_data_quality(data_with_missing)
        
        assert isinstance(result, dict)
        assert result['status'] in ['fair', 'poor']
        assert result['completeness'] < 100
    
    def test_validate_data_quality_empty(self, data_loader):
        """Test data quality validation with empty data"""
        loader, mock_db = data_loader
        
        empty_df = pd.DataFrame()
        result = loader.validate_data_quality(empty_df)
        
        assert isinstance(result, dict)
        assert result['status'] == 'empty'
        assert 'Dataset is empty' in result['issues']


class TestDataExport:
    """Test data export functionality"""
    
    def test_export_data_csv(self, data_loader, sample_weather_data, tmp_path):
        """Test exporting data to CSV"""
        loader, mock_db = data_loader
        
        filepath = tmp_path / "test_export.csv"
        result = loader.export_data(sample_weather_data, str(filepath), 'csv')
        
        assert result == True
        assert filepath.exists()
    
    def test_export_data_invalid_format(self, data_loader, sample_weather_data, tmp_path):
        """Test exporting data with invalid format"""
        loader, mock_db = data_loader
        
        filepath = tmp_path / "test_export.xyz"
        result = loader.export_data(sample_weather_data, str(filepath), 'invalid')
        
        assert result == False


class TestHistoricalData:
    """Test historical data loading"""
    
    def test_load_historical_data(self, data_loader, sample_weather_data):
        """Test loading historical data"""
        loader, mock_db = data_loader
        
        with patch.object(loader, 'load_training_data') as mock_load:
            mock_load.return_value = sample_weather_data
            
            result = loader.load_historical_data(days_back=7)
            
            assert isinstance(result, pd.DataFrame)
            mock_load.assert_called_once()
            
            # Check that the date range is correct
            call_args = mock_load.call_args[0]
            start_date, end_date = call_args[0], call_args[1]
            
            assert isinstance(start_date, datetime)
            assert isinstance(end_date, datetime)
            assert (end_date - start_date).days == 7


if __name__ == '__main__':
    pytest.main([__file__])