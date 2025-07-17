"""
Database connectivity and operations for the ML system
"""

import pandas as pd
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta

from .config import config

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database manager for ML system"""
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize database connection"""
        try:
            db_config = config.get_database_config()
            
            self.engine = create_engine(
                db_config['url'],
                poolclass=QueuePool,
                pool_size=db_config['pool_size'],
                max_overflow=db_config['max_overflow'],
                pool_timeout=db_config['pool_timeout'],
                pool_recycle=db_config['pool_recycle'],
                echo=False
            )
            
            self.session_factory = sessionmaker(bind=self.engine)
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Database connection initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {str(e)}")
            raise
    
    @contextmanager
    def get_session(self):
        """Get database session with context manager"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_connection(self):
        """Get raw database connection"""
        return self.engine.connect()
    
    def execute_query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        """Execute SQL query and return DataFrame"""
        try:
            with self.get_connection() as conn:
                return pd.read_sql_query(query, conn, params=params)
        except Exception as e:
            logger.error(f"Query execution error: {str(e)}")
            raise
    
    def load_weather_data(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load weather data from database"""
        query = """
        SELECT 
            id,
            timestamp,
            temperature,
            humidity,
            pressure,
            wind_speed,
            wind_direction,
            precipitation,
            cloud_cover,
            visibility,
            uv_index,
            weather_condition,
            location_latitude,
            location_longitude,
            created_at
        FROM weather_data
        WHERE timestamp >= %(start_date)s AND timestamp <= %(end_date)s
        ORDER BY timestamp
        """
        
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        
        return self.execute_query(query, params)
    
    def load_rainbow_data(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load rainbow sighting data from database"""
        query = """
        SELECT 
            rs.id,
            rs.timestamp,
            rs.latitude,
            rs.longitude,
            rs.description,
            rs.image_url,
            rs.user_id,
            rs.created_at,
            wd.temperature,
            wd.humidity,
            wd.pressure,
            wd.wind_speed,
            wd.wind_direction,
            wd.precipitation,
            wd.cloud_cover,
            wd.visibility,
            wd.uv_index,
            wd.weather_condition,
            1 as has_rainbow
        FROM rainbow_sightings rs
        LEFT JOIN weather_data wd ON rs.id = wd.rainbow_sighting_id
        WHERE rs.timestamp >= %(start_date)s AND rs.timestamp <= %(end_date)s
        ORDER BY rs.timestamp
        """
        
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        
        return self.execute_query(query, params)
    
    def load_training_data(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load combined training data (weather + rainbow sightings)"""
        # Get weather data
        weather_df = self.load_weather_data(start_date, end_date)
        
        # Get rainbow sightings
        rainbow_df = self.load_rainbow_data(start_date, end_date)
        
        # Mark weather data with rainbow occurrences
        weather_df['has_rainbow'] = 0
        
        # For each rainbow sighting, find matching weather data
        for _, rainbow_row in rainbow_df.iterrows():
            # Find weather data within 1 hour of rainbow sighting
            time_window = timedelta(hours=1)
            mask = (
                (weather_df['timestamp'] >= rainbow_row['timestamp'] - time_window) &
                (weather_df['timestamp'] <= rainbow_row['timestamp'] + time_window) &
                (abs(weather_df['location_latitude'] - rainbow_row['latitude']) < 0.01) &
                (abs(weather_df['location_longitude'] - rainbow_row['longitude']) < 0.01)
            )
            weather_df.loc[mask, 'has_rainbow'] = 1
        
        return weather_df
    
    def save_prediction_result(self, prediction_data: Dict[str, Any]) -> int:
        """Save prediction result to database"""
        query = """
        INSERT INTO predictions (
            timestamp,
            probability,
            weather_data,
            model_version,
            created_at
        ) VALUES (
            %(timestamp)s,
            %(probability)s,
            %(weather_data)s,
            %(model_version)s,
            %(created_at)s
        ) RETURNING id
        """
        
        params = {
            'timestamp': prediction_data['timestamp'],
            'probability': prediction_data['probability'],
            'weather_data': prediction_data['weather_data'],
            'model_version': prediction_data.get('model_version', '1.0.0'),
            'created_at': datetime.now()
        }
        
        try:
            with self.get_connection() as conn:
                result = conn.execute(text(query), params)
                prediction_id = result.fetchone()[0]
                conn.commit()
                return prediction_id
        except Exception as e:
            logger.error(f"Failed to save prediction result: {str(e)}")
            raise
    
    def get_recent_predictions(self, limit: int = 100) -> pd.DataFrame:
        """Get recent prediction results"""
        query = """
        SELECT 
            id,
            timestamp,
            probability,
            weather_data,
            model_version,
            created_at
        FROM predictions
        ORDER BY created_at DESC
        LIMIT %(limit)s
        """
        
        params = {'limit': limit}
        return self.execute_query(query, params)
    
    def get_model_performance_metrics(self, model_version: str) -> Dict[str, Any]:
        """Get model performance metrics"""
        query = """
        SELECT 
            COUNT(*) as total_predictions,
            AVG(probability) as avg_probability,
            COUNT(CASE WHEN probability >= 0.7 THEN 1 END) as high_confidence_predictions,
            COUNT(CASE WHEN probability >= 0.5 THEN 1 END) as medium_confidence_predictions,
            MIN(created_at) as first_prediction,
            MAX(created_at) as last_prediction
        FROM predictions
        WHERE model_version = %(model_version)s
        """
        
        params = {'model_version': model_version}
        result = self.execute_query(query, params)
        
        if not result.empty:
            return result.iloc[0].to_dict()
        return {}
    
    def cleanup_old_predictions(self, days_to_keep: int = 30) -> int:
        """Clean up old prediction records"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        query = """
        DELETE FROM predictions
        WHERE created_at < %(cutoff_date)s
        """
        
        params = {'cutoff_date': cutoff_date}
        
        try:
            with self.get_connection() as conn:
                result = conn.execute(text(query), params)
                deleted_count = result.rowcount
                conn.commit()
                logger.info(f"Cleaned up {deleted_count} old prediction records")
                return deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup old predictions: {str(e)}")
            raise
    
    def get_weather_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get weather statistics for the given period"""
        query = """
        SELECT 
            COUNT(*) as total_records,
            AVG(temperature) as avg_temperature,
            AVG(humidity) as avg_humidity,
            AVG(pressure) as avg_pressure,
            AVG(wind_speed) as avg_wind_speed,
            AVG(cloud_cover) as avg_cloud_cover,
            AVG(visibility) as avg_visibility,
            COUNT(DISTINCT DATE(timestamp)) as unique_days
        FROM weather_data
        WHERE timestamp >= %(start_date)s AND timestamp <= %(end_date)s
        """
        
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        
        result = self.execute_query(query, params)
        
        if not result.empty:
            return result.iloc[0].to_dict()
        return {}
    
    def get_rainbow_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get rainbow sighting statistics for the given period"""
        query = """
        SELECT 
            COUNT(*) as total_sightings,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT DATE(timestamp)) as unique_days,
            MIN(timestamp) as first_sighting,
            MAX(timestamp) as last_sighting,
            AVG(latitude) as avg_latitude,
            AVG(longitude) as avg_longitude
        FROM rainbow_sightings
        WHERE timestamp >= %(start_date)s AND timestamp <= %(end_date)s
        """
        
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        
        result = self.execute_query(query, params)
        
        if not result.empty:
            return result.iloc[0].to_dict()
        return {}
    
    def check_database_health(self) -> Dict[str, Any]:
        """Check database health and return status"""
        try:
            with self.get_connection() as conn:
                # Check connection
                conn.execute(text("SELECT 1"))
                
                # Check table existence
                tables_query = """
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN (
                    'weather_data', 'rainbow_sightings', 'predictions'
                )
                """
                
                result = conn.execute(text(tables_query))
                existing_tables = [row[0] for row in result.fetchall()]
                
                # Check recent data
                recent_weather = conn.execute(text("""
                    SELECT COUNT(*) FROM weather_data 
                    WHERE timestamp >= NOW() - INTERVAL '24 hours'
                """)).fetchone()[0]
                
                recent_predictions = conn.execute(text("""
                    SELECT COUNT(*) FROM predictions 
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                """)).fetchone()[0]
                
                return {
                    'status': 'healthy',
                    'existing_tables': existing_tables,
                    'recent_weather_records': recent_weather,
                    'recent_predictions': recent_predictions,
                    'connection_time': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'connection_time': datetime.now().isoformat()
            }

# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions
def get_db_connection():
    """Get database connection"""
    return db_manager.get_connection()

def get_db_session():
    """Get database session"""
    return db_manager.get_session()

def execute_query(query: str, params: Optional[Dict] = None) -> pd.DataFrame:
    """Execute query and return DataFrame"""
    return db_manager.execute_query(query, params)