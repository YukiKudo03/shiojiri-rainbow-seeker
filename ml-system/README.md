# 塩尻レインボーシーカー ML システム

機械学習を使用して虹の出現を予測するシステムです。

## 概要

このMLシステムは、気象データを基に虹の出現確率を予測します。複数の機械学習アルゴリズム（Random Forest、XGBoost、LightGBM）を使用し、最適なモデルを自動選択します。

## 機能

- **データ処理**: 気象データと虹目撃データの収集・前処理
- **特徴量エンジニアリング**: 時間的特徴、気象相互作用特徴の生成
- **モデル訓練**: 複数アルゴリズムの比較・最適化
- **リアルタイム予測**: REST API による虹出現確率の予測
- **予測キャッシュ**: Redisを使用した高速レスポンス
- **モニタリング**: 詳細なログ・性能監視

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env` ファイルを作成し、以下の設定を行います：

```env
# データベース設定
DATABASE_URL=postgresql://user:password@localhost:5432/shiojiri_rainbow

# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 気象API設定
WEATHER_API_KEY=your_openweather_api_key

# モデル設定
MODEL_PATH=models/rainbow_model.pkl
PREDICTION_THRESHOLD=0.5

# ログ設定
LOG_LEVEL=INFO
LOG_FILE=logs/ml_system.log
```

### 3. データベースの準備

バックエンドの `config/schema.sql` を使用してデータベースを作成します。

### 4. Redisの起動

```bash
# Docker使用の場合
docker run -d -p 6379:6379 redis:alpine

# または直接インストール
redis-server
```

## 使用方法

### コマンドライン使用

#### モデルの訓練

```bash
# 基本的な訓練（過去30日のデータ）
python app.py train --save

# 塩尻エリアのデータのみで訓練
python app.py train --shiojiri-only --days 60 --save

# 特徴量重要度を表示
python app.py train --show-features
```

#### 予測の実行

```bash
# 単一予測
python app.py predict \
    --temperature 22.5 \
    --humidity 75.0 \
    --pressure 1013.2 \
    --wind-speed 3.5 \
    --precipitation 1.2 \
    --cloud-cover 60

# 位置指定予測
python app.py predict \
    --temperature 20.0 \
    --humidity 80.0 \
    --pressure 1010.0 \
    --latitude 36.0687 \
    --longitude 137.9646
```

#### API サーバーの起動

```bash
# 本番モード
python app.py api --host 0.0.0.0 --port 5000

# デバッグモード
python app.py api --debug
```

#### データサマリーの確認

```bash
# 過去30日のデータサマリー
python app.py data

# 過去7日のデータサマリー
python app.py data --days 7
```

### API使用

#### 基本的な予測

```bash
curl -X POST http://localhost:5000/predict \
    -H "Content-Type: application/json" \
    -d '{
        "weather_data": {
            "temperature": 22.5,
            "humidity": 75.0,
            "pressure": 1013.2,
            "wind_speed": 3.5,
            "precipitation": 1.2,
            "cloud_cover": 60
        },
        "location": {
            "latitude": 36.0687,
            "longitude": 137.9646
        }
    }'
```

## アーキテクチャ

### ディレクトリ構成

```
ml-system/
├── app.py                      # メインアプリケーション
├── requirements.txt            # 依存関係
├── src/
│   ├── data_processing/        # データ処理
│   │   ├── __init__.py
│   │   └── data_loader.py
│   ├── model_training/         # モデル訓練
│   │   ├── __init__.py
│   │   ├── feature_engineering.py
│   │   └── trainer.py
│   ├── prediction/             # 予測サービス
│   │   ├── __init__.py
│   │   ├── predictor.py
│   │   └── api.py
│   └── utils/                  # ユーティリティ
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       └── logger.py
├── models/                     # 保存されたモデル
├── logs/                       # ログファイル
├── data/                       # データファイル
├── notebooks/                  # Jupyter ノートブック
└── tests/                      # テストファイル
```

## 性能

### モデル精度
- 精度 (Accuracy): 目標 > 0.85
- 適合率 (Precision): 目標 > 0.80
- 再現率 (Recall): 目標 > 0.75
- F1スコア: 目標 > 0.75

### API性能
- 単一予測: < 100ms
- バッチ予測: < 10ms/予測
- キャッシュヒット率: > 80%

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。