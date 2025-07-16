# 機械学習システム

## 概要
塩尻レインボーシーカーの機械学習システムは、過去の虹目撃情報と気象データを学習して、虹の出現確率を予測するシステムです。

## 目標
- **予測精度**: 70%以上のF1スコア
- **レスポンス時間**: 1秒以下
- **更新頻度**: 1時間ごとの予測更新

## システム構成

```
Weather Data → Data Processing → Feature Engineering → Model Training
     ↓                ↓               ↓                    ↓
Rainbow Data → Data Cleaning → Model Selection → Model Evaluation
     ↓                ↓               ↓                    ↓
External API → Preprocessing → Prediction API → Result Storage
```

## プロジェクト構造

```
ml-system/
├── src/
│   ├── data_processing/     # データ前処理
│   │   ├── __init__.py
│   │   ├── data_loader.py
│   │   ├── data_cleaner.py
│   │   └── feature_engineer.py
│   ├── model_training/      # モデル訓練
│   │   ├── __init__.py
│   │   ├── trainer.py
│   │   ├── evaluator.py
│   │   └── model_selector.py
│   ├── prediction/          # 予測実行
│   │   ├── __init__.py
│   │   ├── predictor.py
│   │   └── api_server.py
│   └── utils/               # ユーティリティ
│       ├── __init__.py
│       ├── database.py
│       ├── logger.py
│       └── config.py
├── models/                  # 保存されたモデル
├── data/                    # データセット
├── notebooks/               # Jupyter Notebook
├── tests/                   # テストファイル
├── requirements.txt         # Python依存関係
└── README.md
```

## 技術スタック

### 機械学習・データサイエンス
```python
# requirements.txt
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
tensorflow==2.13.0
xgboost==1.7.6
lightgbm==4.0.0
matplotlib==3.7.2
seaborn==0.12.2
plotly==5.15.0
```

### WebAPI・データベース
```python
# API・データベース関連
flask==2.3.2
flask-cors==4.0.0
psycopg2-binary==2.9.7
sqlalchemy==2.0.19
redis==4.6.0
celery==5.3.1
```

### 開発・テスト
```python
# 開発・テスト関連
pytest==7.4.0
pytest-cov==4.1.0
black==23.7.0
flake8==6.0.0
mypy==1.5.1
```

## データ仕様

### 入力データ

#### 気象データ
```python
weather_features = {
    'temperature': float,      # 気温 (°C)
    'humidity': int,           # 湿度 (%)
    'pressure': float,         # 気圧 (hPa)
    'wind_speed': float,       # 風速 (m/s)
    'wind_direction': int,     # 風向 (度)
    'precipitation': float,    # 降水量 (mm)
    'cloud_cover': int,        # 雲量 (%)
    'visibility': float,       # 視程 (km)
    'uv_index': int,           # UV指数
    'weather_condition': str,  # 天気概況
    'hour': int,               # 時間 (0-23)
    'month': int,              # 月 (1-12)
    'season': str,             # 季節
}
```

#### 虹目撃データ
```python
rainbow_features = {
    'latitude': float,         # 緯度
    'longitude': float,        # 経度
    'timestamp': datetime,     # 目撃日時
    'has_rainbow': bool,       # 虹の有無 (ターゲット変数)
}
```

### 特徴量エンジニアリング

#### 時系列特徴量
```python
def create_time_features(df):
    """時間関連の特徴量を作成"""
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['month'] = df['timestamp'].dt.month
    df['season'] = df['month'].map({
        12: 'winter', 1: 'winter', 2: 'winter',
        3: 'spring', 4: 'spring', 5: 'spring',
        6: 'summer', 7: 'summer', 8: 'summer',
        9: 'autumn', 10: 'autumn', 11: 'autumn'
    })
    return df
```

#### 気象条件特徴量
```python
def create_weather_features(df):
    """気象条件の特徴量を作成"""
    # 虹出現に有利な条件の組み合わせ
    df['optimal_humidity'] = (df['humidity'] >= 60) & (df['humidity'] <= 85)
    df['optimal_temperature'] = (df['temperature'] >= 15) & (df['temperature'] <= 25)
    df['optimal_cloud_cover'] = (df['cloud_cover'] >= 20) & (df['cloud_cover'] <= 60)
    df['light_wind'] = df['wind_speed'] <= 5
    df['good_visibility'] = df['visibility'] >= 10
    
    # 複合指標
    df['rainbow_favorability'] = (
        df['optimal_humidity'].astype(int) +
        df['optimal_temperature'].astype(int) +
        df['optimal_cloud_cover'].astype(int) +
        df['light_wind'].astype(int) +
        df['good_visibility'].astype(int)
    )
    
    return df
```

## データ処理パイプライン

### データローダー
```python
# src/data_processing/data_loader.py
import pandas as pd
from sqlalchemy import create_engine
from utils.config import DATABASE_URL

class DataLoader:
    def __init__(self):
        self.engine = create_engine(DATABASE_URL)
    
    def load_weather_data(self, start_date, end_date):
        """気象データの読み込み"""
        query = """
        SELECT * FROM weather_data
        WHERE timestamp >= %s AND timestamp <= %s
        ORDER BY timestamp
        """
        return pd.read_sql_query(query, self.engine, params=[start_date, end_date])
    
    def load_rainbow_data(self, start_date, end_date):
        """虹目撃データの読み込み"""
        query = """
        SELECT rs.*, wd.* FROM rainbow_sightings rs
        JOIN weather_data wd ON rs.id = wd.rainbow_sighting_id
        WHERE rs.timestamp >= %s AND rs.timestamp <= %s
        ORDER BY rs.timestamp
        """
        return pd.read_sql_query(query, self.engine, params=[start_date, end_date])
```

### データクリーナー
```python
# src/data_processing/data_cleaner.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

class DataCleaner:
    def __init__(self):
        self.scaler = StandardScaler()
    
    def clean_weather_data(self, df):
        """気象データのクリーニング"""
        # 異常値の除去
        df = self.remove_outliers(df)
        
        # 欠損値の補完
        df = self.handle_missing_values(df)
        
        # データ型の変換
        df = self.convert_data_types(df)
        
        return df
    
    def remove_outliers(self, df):
        """異常値の除去"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        return df
    
    def handle_missing_values(self, df):
        """欠損値の補完"""
        # 数値データは中央値で補完
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
        
        # カテゴリデータは最頻値で補完
        categorical_columns = df.select_dtypes(include=['object']).columns
        df[categorical_columns] = df[categorical_columns].fillna(df[categorical_columns].mode().iloc[0])
        
        return df
```

## モデル訓練

### モデル選択
```python
# src/model_training/model_selector.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

class ModelSelector:
    def __init__(self):
        self.models = {
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            ),
            'logistic_regression': LogisticRegression(
                random_state=42,
                max_iter=1000
            ),
            'svm': SVC(
                kernel='rbf',
                probability=True,
                random_state=42
            ),
            'xgboost': XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            ),
            'lightgbm': LGBMClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
        }
    
    def get_model(self, model_name):
        """指定されたモデルを取得"""
        return self.models.get(model_name)
    
    def get_all_models(self):
        """全モデルを取得"""
        return self.models
```

### モデル訓練器
```python
# src/model_training/trainer.py
import pickle
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from utils.logger import get_logger

logger = get_logger(__name__)

class ModelTrainer:
    def __init__(self):
        self.model = None
        self.scaler = None
    
    def train_model(self, X, y, model, test_size=0.2):
        """モデルの訓練"""
        # データ分割
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # モデル訓練
        logger.info(f"Training {model.__class__.__name__}")
        model.fit(X_train, y_train)
        
        # 評価
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        
        logger.info(f"Training Score: {train_score:.4f}")
        logger.info(f"Test Score: {test_score:.4f}")
        
        # 交差検証
        cv_scores = cross_val_score(model, X_train, y_train, cv=5)
        logger.info(f"Cross-validation Score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # 予測と評価
        y_pred = model.predict(X_test)
        logger.info(f"Classification Report:\n{classification_report(y_test, y_pred)}")
        
        self.model = model
        return model, X_test, y_test, y_pred
    
    def save_model(self, model, filepath):
        """モデルの保存"""
        joblib.dump(model, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """モデルの読み込み"""
        model = joblib.load(filepath)
        logger.info(f"Model loaded from {filepath}")
        return model
```

## 予測システム

### 予測器
```python
# src/prediction/predictor.py
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from utils.database import get_db_connection
from utils.logger import get_logger

logger = get_logger(__name__)

class RainbowPredictor:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)
        self.feature_columns = [
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'wind_direction', 'precipitation', 'cloud_cover',
            'visibility', 'uv_index', 'hour', 'month', 'season'
        ]
    
    def predict_probability(self, weather_data):
        """虹出現確率の予測"""
        try:
            # 特徴量の準備
            features = self.prepare_features(weather_data)
            
            # 予測実行
            probability = self.model.predict_proba(features)[0][1]
            
            logger.info(f"Prediction probability: {probability:.4f}")
            return probability
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return 0.0
    
    def prepare_features(self, weather_data):
        """特徴量の準備"""
        # 基本的な気象データ
        features = {
            'temperature': weather_data.get('temperature', 20),
            'humidity': weather_data.get('humidity', 50),
            'pressure': weather_data.get('pressure', 1013),
            'wind_speed': weather_data.get('wind_speed', 2),
            'wind_direction': weather_data.get('wind_direction', 180),
            'precipitation': weather_data.get('precipitation', 0),
            'cloud_cover': weather_data.get('cloud_cover', 30),
            'visibility': weather_data.get('visibility', 10),
            'uv_index': weather_data.get('uv_index', 3),
        }
        
        # 時間特徴量
        now = datetime.now()
        features['hour'] = now.hour
        features['month'] = now.month
        features['season'] = self.get_season(now.month)
        
        # DataFrameに変換
        df = pd.DataFrame([features])
        
        # 特徴量エンジニアリング
        df = self.engineer_features(df)
        
        return df[self.feature_columns]
    
    def engineer_features(self, df):
        """特徴量エンジニアリング"""
        # 虹出現に有利な条件
        df['optimal_humidity'] = (df['humidity'] >= 60) & (df['humidity'] <= 85)
        df['optimal_temperature'] = (df['temperature'] >= 15) & (df['temperature'] <= 25)
        df['optimal_cloud_cover'] = (df['cloud_cover'] >= 20) & (df['cloud_cover'] <= 60)
        df['light_wind'] = df['wind_speed'] <= 5
        df['good_visibility'] = df['visibility'] >= 10
        
        return df
    
    def get_season(self, month):
        """月から季節を取得"""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'autumn'
```

### 予測API
```python
# src/prediction/api_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import RainbowPredictor
from utils.logger import get_logger

app = Flask(__name__)
CORS(app)
logger = get_logger(__name__)

# 予測器の初期化
predictor = RainbowPredictor('models/rainbow_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    """虹出現確率の予測"""
    try:
        weather_data = request.get_json()
        
        # 予測実行
        probability = predictor.predict_probability(weather_data)
        
        # 結果の生成
        result = {
            'probability': float(probability),
            'recommendation': get_recommendation(probability),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_recommendation(probability):
    """確率に基づく推奨メッセージ"""
    if probability >= 0.7:
        return "High chance of rainbow! Keep your camera ready."
    elif probability >= 0.5:
        return "Moderate chance of rainbow. Worth staying alert."
    elif probability >= 0.3:
        return "Low chance of rainbow, but conditions could change."
    else:
        return "Rainbow unlikely under current conditions."

@app.route('/health', methods=['GET'])
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

## 評価・監視

### モデル評価
```python
# src/model_training/evaluator.py
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)

class ModelEvaluator:
    def __init__(self):
        pass
    
    def evaluate_model(self, model, X_test, y_test):
        """モデルの総合評価"""
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        # 基本的な評価指標
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1_score': f1_score(y_test, y_pred),
            'roc_auc': roc_auc_score(y_test, y_pred_proba)
        }
        
        # 可視化
        self.plot_confusion_matrix(y_test, y_pred)
        self.plot_roc_curve(y_test, y_pred_proba)
        self.plot_feature_importance(model, X_test.columns)
        
        return metrics
    
    def plot_confusion_matrix(self, y_true, y_pred):
        """混同行列の可視化"""
        cm = confusion_matrix(y_true, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title('Confusion Matrix')
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.show()
    
    def plot_roc_curve(self, y_true, y_pred_proba):
        """ROC曲線の可視化"""
        fpr, tpr, _ = roc_curve(y_true, y_pred_proba)
        auc = roc_auc_score(y_true, y_pred_proba)
        
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {auc:.2f})')
        plt.plot([0, 1], [0, 1], 'k--')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve')
        plt.legend(loc="lower right")
        plt.show()
    
    def plot_feature_importance(self, model, feature_names):
        """特徴量重要度の可視化"""
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
            indices = np.argsort(importance)[::-1]
            
            plt.figure(figsize=(10, 6))
            plt.bar(range(len(importance)), importance[indices])
            plt.xticks(range(len(importance)), [feature_names[i] for i in indices], rotation=45)
            plt.title('Feature Importance')
            plt.tight_layout()
            plt.show()
```

## 運用・監視

### バッチ処理
```python
# batch_prediction.py
import schedule
import time
from src.prediction.predictor import RainbowPredictor
from src.utils.database import get_db_connection
from src.utils.logger import get_logger

logger = get_logger(__name__)

def run_batch_prediction():
    """バッチ予測の実行"""
    try:
        logger.info("Starting batch prediction")
        
        # 現在の気象データを取得
        weather_data = get_current_weather()
        
        # 予測実行
        predictor = RainbowPredictor('models/rainbow_model.pkl')
        probability = predictor.predict_probability(weather_data)
        
        # 結果をデータベースに保存
        save_prediction_result(probability, weather_data)
        
        logger.info(f"Batch prediction completed. Probability: {probability:.4f}")
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")

# スケジュール設定
schedule.every().hour.do(run_batch_prediction)

if __name__ == '__main__':
    while True:
        schedule.run_pending()
        time.sleep(60)
```

### 性能監視
```python
# monitoring.py
import psutil
import time
from utils.logger import get_logger

logger = get_logger(__name__)

class PerformanceMonitor:
    def __init__(self):
        self.start_time = time.time()
    
    def monitor_prediction_performance(self, predictor, test_data):
        """予測性能の監視"""
        start_time = time.time()
        
        # CPU・メモリ使用率の記録
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        
        # 予測実行
        result = predictor.predict_probability(test_data)
        
        # 実行時間の計測
        execution_time = time.time() - start_time
        
        # ログ出力
        logger.info(f"Prediction execution time: {execution_time:.3f}s")
        logger.info(f"CPU usage: {cpu_percent}%")
        logger.info(f"Memory usage: {memory_percent}%")
        
        return {
            'execution_time': execution_time,
            'cpu_usage': cpu_percent,
            'memory_usage': memory_percent,
            'result': result
        }
```

## 使用方法

### 開発環境セットアップ
```bash
# 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .envファイルを編集
```

### モデル訓練
```bash
# データの準備
python -m src.data_processing.data_loader

# モデル訓練
python -m src.model_training.trainer

# モデル評価
python -m src.model_training.evaluator
```

### 予測API起動
```bash
# API サーバーの起動
python -m src.prediction.api_server

# 予測テスト
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature": 22, "humidity": 70, "pressure": 1013}'
```

この機械学習システムにより、気象データに基づいた虹の出現予測が可能になります。