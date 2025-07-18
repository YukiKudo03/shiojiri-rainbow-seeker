import pytest
import os
import sys
import tempfile
import shutil

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Mock environment variables for testing
@pytest.fixture(scope='session', autouse=True)
def setup_test_environment():
    """Setup test environment with required environment variables."""
    os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'
    os.environ['REDIS_HOST'] = 'localhost'
    os.environ['REDIS_PORT'] = '6379'
    os.environ['REDIS_DB'] = '1'
    os.environ['WEATHER_API_KEY'] = 'test_api_key'
    os.environ['MODEL_PATH'] = 'models/test_model.pkl'
    os.environ['LOG_LEVEL'] = 'DEBUG'
    os.environ['LOG_FILE'] = 'test.log'
    
    yield
    
    # Cleanup test log file
    if os.path.exists('test.log'):
        os.remove('test.log')

@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_weather_data():
    """Sample weather data for testing."""
    return {
        'temperature': 22.5,
        'humidity': 75.0,
        'pressure': 1013.2,
        'wind_speed': 3.5,
        'wind_direction': 180,
        'precipitation': 1.2,
        'cloud_cover': 60,
        'visibility': 10.0,
        'uv_index': 5,
        'weather_description': 'light rain'
    }

@pytest.fixture
def sample_rainbow_data():
    """Sample rainbow data for testing."""
    return [
        {
            'id': 1,
            'latitude': 36.0687,
            'longitude': 137.9646,
            'timestamp': '2024-01-01T12:00:00Z',
            'weather_conditions': {
                'temperature': 22.5,
                'humidity': 75.0,
                'pressure': 1013.2,
                'wind_speed': 3.5,
                'precipitation': 1.2,
                'cloud_cover': 60
            }
        },
        {
            'id': 2,
            'latitude': 36.0700,
            'longitude': 137.9650,
            'timestamp': '2024-01-02T14:30:00Z',
            'weather_conditions': {
                'temperature': 20.0,
                'humidity': 80.0,
                'pressure': 1010.0,
                'wind_speed': 4.0,
                'precipitation': 2.0,
                'cloud_cover': 70
            }
        }
    ]