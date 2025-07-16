# データベース設計ドキュメント

## 概要
塩尻レインボーシーカーシステムでは、PostgreSQLを使用してデータを管理します。このドキュメントでは、データベースの設計、テーブル構造、リレーションシップについて説明します。

## データベース構成

### 基本情報
- **DBMS**: PostgreSQL 14+
- **文字エンコーディング**: UTF-8
- **タイムゾーン**: UTC
- **接続情報**: 環境変数で管理

## テーブル構造

### 1. users テーブル
ユーザー情報を管理します。

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ユーザーID |
| name | VARCHAR(255) | NOT NULL | ユーザー名 |
| email | VARCHAR(255) | UNIQUE NOT NULL | メールアドレス |
| password | VARCHAR(255) | NOT NULL | パスワード（ハッシュ化） |
| fcm_token | VARCHAR(255) | NULL | Firebase Cloud Messagingトークン |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

### 2. rainbow_sightings テーブル
虹の目撃情報を管理します。

```sql
CREATE TABLE rainbow_sightings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    image_url VARCHAR(255),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 目撃情報ID |
| user_id | INTEGER | FOREIGN KEY | 投稿者のユーザーID |
| latitude | DECIMAL(10, 8) | NOT NULL | 緯度 |
| longitude | DECIMAL(11, 8) | NOT NULL | 経度 |
| image_url | VARCHAR(255) | NULL | 画像URL |
| description | TEXT | NULL | 説明文 |
| timestamp | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 目撃日時 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

### 3. weather_data テーブル
気象データを管理します。

```sql
CREATE TABLE weather_data (
    id SERIAL PRIMARY KEY,
    rainbow_sighting_id INTEGER REFERENCES rainbow_sightings(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    temperature DECIMAL(5, 2),
    humidity INTEGER,
    pressure DECIMAL(7, 2),
    wind_speed DECIMAL(5, 2),
    wind_direction INTEGER,
    precipitation DECIMAL(5, 2),
    cloud_cover INTEGER,
    visibility DECIMAL(5, 2),
    uv_index INTEGER,
    weather_condition VARCHAR(100),
    radar_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 気象データID |
| rainbow_sighting_id | INTEGER | FOREIGN KEY | 関連する虹目撃情報ID |
| timestamp | TIMESTAMP | NOT NULL | 気象データの日時 |
| temperature | DECIMAL(5, 2) | NULL | 気温（°C） |
| humidity | INTEGER | NULL | 湿度（%） |
| pressure | DECIMAL(7, 2) | NULL | 気圧（hPa） |
| wind_speed | DECIMAL(5, 2) | NULL | 風速（m/s） |
| wind_direction | INTEGER | NULL | 風向（度） |
| precipitation | DECIMAL(5, 2) | NULL | 降水量（mm） |
| cloud_cover | INTEGER | NULL | 雲量（%） |
| visibility | DECIMAL(5, 2) | NULL | 視程（km） |
| uv_index | INTEGER | NULL | UV指数 |
| weather_condition | VARCHAR(100) | NULL | 天気概況 |
| radar_data | JSONB | NULL | 雨雲レーダーデータ |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

### 4. notifications テーブル
通知履歴を管理します。

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rainbow_sighting_id INTEGER REFERENCES rainbow_sightings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    type VARCHAR(50) DEFAULT 'rainbow_alert'
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 通知ID |
| user_id | INTEGER | FOREIGN KEY | 通知先ユーザーID |
| rainbow_sighting_id | INTEGER | FOREIGN KEY | 関連する虹目撃情報ID |
| title | VARCHAR(255) | NOT NULL | 通知タイトル |
| message | TEXT | NOT NULL | 通知メッセージ |
| sent_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 送信日時 |
| read_at | TIMESTAMP | NULL | 既読日時 |
| type | VARCHAR(50) | DEFAULT 'rainbow_alert' | 通知タイプ |

### 5. ml_predictions テーブル
機械学習による予測結果を管理します。

```sql
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    prediction_probability DECIMAL(5, 4),
    weather_conditions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 予測ID |
| timestamp | TIMESTAMP | NOT NULL | 予測対象日時 |
| latitude | DECIMAL(10, 8) | NOT NULL | 緯度 |
| longitude | DECIMAL(11, 8) | NOT NULL | 経度 |
| prediction_probability | DECIMAL(5, 4) | NULL | 予測確率（0-1） |
| weather_conditions | JSONB | NULL | 予測時の気象条件 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

### 6. user_locations テーブル
ユーザーの位置情報を管理します。

```sql
CREATE TABLE user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 位置情報ID |
| user_id | INTEGER | FOREIGN KEY, UNIQUE | ユーザーID |
| latitude | DECIMAL(10, 8) | NOT NULL | 緯度 |
| longitude | DECIMAL(11, 8) | NOT NULL | 経度 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

## インデックス

### パフォーマンス向上のためのインデックス
```sql
-- 虹目撃情報の位置検索用
CREATE INDEX idx_rainbow_sightings_location ON rainbow_sightings(latitude, longitude);

-- 虹目撃情報の時系列検索用
CREATE INDEX idx_rainbow_sightings_timestamp ON rainbow_sightings(timestamp);

-- 気象データの時系列検索用
CREATE INDEX idx_weather_data_timestamp ON weather_data(timestamp);

-- 通知のユーザー検索用
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ユーザー位置情報の位置検索用
CREATE INDEX idx_user_locations_location ON user_locations(latitude, longitude);
```

## 関数とトリガー

### 距離計算関数
```sql
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in km
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    a := SIN(dLat/2) * SIN(dLat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;
```

### 更新日時自動更新トリガー
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rainbow_sightings_updated_at BEFORE UPDATE ON rainbow_sightings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## データ関係図

```
users (1) ─────────── (N) rainbow_sightings
  │                         │
  │                         │
  │                         │
  └─── (1) user_locations   └─── (1) weather_data
  │                         │
  │                         │
  └─── (N) notifications ───┘
```

## セキュリティ設定

### ユーザー権限
```sql
-- アプリケーション用ユーザー
CREATE USER app_user WITH PASSWORD 'secure_password';

-- 必要最小限の権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 行レベルセキュリティ (RLS)
```sql
-- ユーザーは自分の情報のみアクセス可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_policy ON users
    USING (id = current_setting('app.current_user_id')::INTEGER);
```

## バックアップ・復元

### 定期バックアップ
```bash
# データベース全体のバックアップ
pg_dump -h localhost -U postgres shiojiri_rainbow > backup_$(date +%Y%m%d).sql

# 圧縮バックアップ
pg_dump -h localhost -U postgres -Fc shiojiri_rainbow > backup_$(date +%Y%m%d).dump
```

### 復元
```bash
# SQLファイルから復元
psql -h localhost -U postgres -d shiojiri_rainbow < backup_20240115.sql

# dumpファイルから復元
pg_restore -h localhost -U postgres -d shiojiri_rainbow backup_20240115.dump
```

## 監視とメンテナンス

### パフォーマンス監視
```sql
-- 遅いクエリの確認
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- テーブルサイズの確認
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 定期メンテナンス
```sql
-- 統計情報の更新
ANALYZE;

-- 不要な領域の回収
VACUUM;

-- インデックスの再構築
REINDEX DATABASE shiojiri_rainbow;
```

## 移行・アップグレード

### マイグレーション管理
- スキーマ変更は必ずマイグレーションスクリプトで管理
- 本番環境への適用前に開発環境で十分テスト
- ロールバック手順を必ず準備

### バージョン管理
```sql
-- スキーマバージョン管理テーブル
CREATE TABLE schema_versions (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
```