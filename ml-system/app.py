"""
Main application entry point for the Rainbow Prediction ML System
"""

import os
import sys
import argparse
from datetime import datetime, timedelta

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.model_training.trainer import RainbowPredictor
from src.prediction.api import run_api
from src.prediction.predictor import prediction_service
from src.data_processing.data_loader import DataLoader
from src.utils.config import config
from src.utils.logger import get_main_logger

logger = get_main_logger()

def train_model(args):
    """Train a new rainbow prediction model"""
    
    logger.logger.info("Starting model training...")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=args.days)
    
    # Location filter for Shiojiri area
    location_filter = None
    if args.shiojiri_only:
        location_filter = {
            'latitude': 36.0687,
            'longitude': 137.9646,
            'radius_km': 20
        }
    
    try:
        # Initialize trainer
        trainer = RainbowPredictor()
        
        # Train models
        results = trainer.train_models(
            start_date=start_date,
            end_date=end_date,
            location_filter=location_filter,
            test_size=args.test_size
        )
        
        # Print results
        print("\n" + "="*60)
        print("TRAINING RESULTS")
        print("="*60)
        
        for model_name, metrics in results.items():
            print(f"\n{model_name.upper()}:")
            print(f"  Accuracy:  {metrics['accuracy']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall:    {metrics['recall']:.4f}")
            print(f"  F1 Score:  {metrics['f1_score']:.4f}")
            print(f"  ROC AUC:   {metrics['roc_auc']:.4f}")
        
        print(f"\nBest model: {trainer.best_model_name}")
        
        # Save model
        if args.save:
            model_path = trainer.save_model(args.output)
            print(f"Model saved to: {model_path}")
        
        # Feature importance
        if args.show_features:
            feature_importance = trainer.get_feature_importance()
            if feature_importance:
                print("\nTOP 10 MOST IMPORTANT FEATURES:")
                for i, (feature, importance) in enumerate(list(feature_importance.items())[:10]):
                    print(f"  {i+1:2d}. {feature:<25} {importance:.4f}")
        
        print("\n" + "="*60)
        
    except Exception as e:
        logger.log_error("training", str(e))
        print(f"Training failed: {e}")
        sys.exit(1)

def run_prediction_api(args):
    """Run the prediction API server"""
    
    logger.logger.info("Starting Rainbow Prediction API...")
    
    try:
        run_api(host=args.host, port=args.port, debug=args.debug)
    except Exception as e:
        logger.log_error("api_startup", str(e))
        print(f"Failed to start API: {e}")
        sys.exit(1)

def make_prediction(args):
    """Make a single prediction"""
    
    logger.logger.info("Making rainbow prediction...")
    
    # Prepare weather data
    weather_data = {
        'temperature': args.temperature,
        'humidity': args.humidity,
        'pressure': args.pressure,
        'wind_speed': args.wind_speed or 0,
        'precipitation': args.precipitation or 0,
        'cloud_cover': args.cloud_cover or 50,
        'visibility': args.visibility or 10,
        'uv_index': args.uv_index or 0
    }
    
    # Location (default to Shiojiri)
    location = {
        'latitude': args.latitude or 36.0687,
        'longitude': args.longitude or 137.9646
    }
    
    try:
        result = prediction_service.predict_rainbow_probability(weather_data, location)
        
        print("\n" + "="*50)
        print("RAINBOW PREDICTION RESULT")
        print("="*50)
        print(f"Probability: {result['probability']:.4f} ({result['probability']*100:.1f}%)")
        print(f"Prediction:  {'Rainbow likely' if result['prediction'] else 'No rainbow expected'}")
        print(f"Confidence:  {result['confidence']}")
        print(f"Model used:  {result['model_used']}")
        print(f"Conditions:  {result['weather_conditions']}")
        print(f"Recommendation: {result['recommendation']}")
        print("="*50)
        
    except Exception as e:
        logger.log_error("prediction", str(e))
        print(f"Prediction failed: {e}")
        sys.exit(1)

def show_data_summary(args):
    """Show summary of available training data"""
    
    logger.logger.info("Loading data summary...")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=args.days)
    
    try:
        data_loader = DataLoader()
        df = data_loader.load_training_data(start_date, end_date)
        
        if df.empty:
            print("No data available for the specified period.")
            return
        
        summary = data_loader.get_data_summary(df)
        data_quality = data_loader.validate_data_quality(df)
        
        print("\n" + "="*60)
        print("DATA SUMMARY")
        print("="*60)
        print(f"Total records: {summary['total_records']}")
        print(f"Date range: {summary['date_range']['start']} to {summary['date_range']['end']}")
        
        if 'class_distribution' in summary:
            print(f"Rainbow sightings: {summary['class_distribution'].get(1, 0)}")
            print(f"Non-rainbow records: {summary['class_distribution'].get(0, 0)}")
        
        print(f"\nData quality: {data_quality['status']}")
        print(f"Completeness: {data_quality['completeness']:.1f}%")
        
        if data_quality['warnings']:
            print("\nWarnings:")
            for warning in data_quality['warnings']:
                print(f"  - {warning}")
        
        if data_quality['issues']:
            print("\nIssues:")
            for issue in data_quality['issues']:
                print(f"  - {issue}")
        
        print("="*60)
        
    except Exception as e:
        logger.log_error("data_summary", str(e))
        print(f"Failed to load data summary: {e}")
        sys.exit(1)

def main():
    """Main entry point"""
    
    parser = argparse.ArgumentParser(description="Rainbow Prediction ML System")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Train command
    train_parser = subparsers.add_parser('train', help='Train a new model')
    train_parser.add_argument('--days', type=int, default=30, help='Number of days of training data')
    train_parser.add_argument('--test-size', type=float, default=0.2, help='Test set size (0.0-1.0)')
    train_parser.add_argument('--shiojiri-only', action='store_true', help='Train only on Shiojiri area data')
    train_parser.add_argument('--save', action='store_true', help='Save trained model')
    train_parser.add_argument('--output', type=str, help='Output path for saved model')
    train_parser.add_argument('--show-features', action='store_true', help='Show feature importance')
    
    # API command
    api_parser = subparsers.add_parser('api', help='Run prediction API server')
    api_parser.add_argument('--host', type=str, default='0.0.0.0', help='API host')
    api_parser.add_argument('--port', type=int, default=5000, help='API port')
    api_parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    # Predict command
    predict_parser = subparsers.add_parser('predict', help='Make a single prediction')
    predict_parser.add_argument('--temperature', type=float, required=True, help='Temperature (°C)')
    predict_parser.add_argument('--humidity', type=float, required=True, help='Humidity (%)')
    predict_parser.add_argument('--pressure', type=float, required=True, help='Pressure (hPa)')
    predict_parser.add_argument('--wind-speed', type=float, help='Wind speed (m/s)')
    predict_parser.add_argument('--precipitation', type=float, help='Precipitation (mm)')
    predict_parser.add_argument('--cloud-cover', type=float, help='Cloud cover (%)')
    predict_parser.add_argument('--visibility', type=float, help='Visibility (km)')
    predict_parser.add_argument('--uv-index', type=float, help='UV index')
    predict_parser.add_argument('--latitude', type=float, help='Latitude')
    predict_parser.add_argument('--longitude', type=float, help='Longitude')
    
    # Data command
    data_parser = subparsers.add_parser('data', help='Show data summary')
    data_parser.add_argument('--days', type=int, default=30, help='Number of days to analyze')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Validate configuration
    try:
        config.validate_config()
    except ValueError as e:
        print(f"Configuration error: {e}")
        print("Please check your environment variables.")
        sys.exit(1)
    
    # Execute command
    if args.command == 'train':
        train_model(args)
    elif args.command == 'api':
        run_prediction_api(args)
    elif args.command == 'predict':
        make_prediction(args)
    elif args.command == 'data':
        show_data_summary(args)

if __name__ == '__main__':
    main()