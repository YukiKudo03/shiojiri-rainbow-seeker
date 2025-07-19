# 🛠️ 塩尻レインボーシーカー開発ガイド

[![Development Status](https://img.shields.io/badge/Development-Active-brightgreen.svg)](docs/DEVELOPMENT.md)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.9.0-blue)](https://python.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20.10-blue)](https://docker.com/)

## 📋 概要
塩尻レインボーシーカープロジェクトの**エンタープライズグレード開発環境**構築・運用ガイドです。本格的なプロダクション品質の開発を支援します。

## ⚡ クイックスタート

### 🐳 Docker環境（推奨）
```bash
# 1. リポジトリクローン
git clone https://github.com/YukiKudo03/shiojiri-rainbow-seeker.git
cd shiojiri-rainbow-seeker

# 2. 環境変数設定
cp .env.example .env

# 3. 開発環境起動（ワンコマンド）
docker-compose -f docker-compose.dev.yml up -d

# 4. データベース初期化
npm run db:migrate && npm run db:seed

# 🎉 開発サーバー起動完了！
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001  
# ML API: http://localhost:5000
# Grafana: http://localhost:3002
# pgAdmin: http://localhost:5050
```

## 🛠️ 必要なソフトウェア

### 📦 基本要件
| ソフトウェア | バージョン | 必須 | 説明 |
|------------|----------|------|------|
| **Node.js** | 18.x+ | ✅ | JavaScript ランタイム |
| **npm** | 9.x+ | ✅ | パッケージマネージャー |
| **Python** | 3.9+ | ✅ | ML システム用 |
| **PostgreSQL** | 15.x+ | ✅ | メインデータベース（PostGIS拡張） |
| **Redis** | 7.x+ | ✅ | キャッシュ・セッション管理 |
| **Git** | 2.x+ | ✅ | バージョン管理 |

### 🔧 開発ツール
| ツール | バージョン | 用途 | 設定 |
|--------|----------|------|------|
| **Docker** | 20.10+ | コンテナ化 | [設定ガイド](#docker-setup) |
| **Docker Compose** | 2.0+ | 複数サービス管理 | 開発用設定済み |
| **Visual Studio Code** | 最新 | 推奨IDE | [拡張機能](#vscode-setup) |
| **Postman** | 最新 | API テスト | [Collection](#api-testing) |
| **pgAdmin** | 4.x+ | DB管理GUI | ポート5050 |
| **Grafana** | 9.x+ | 監視ダッシュボード | ポート3002 |

### 📱 モバイル開発（オプション）
| ツール | 説明 |
|--------|------|
| **Android Studio** | Android開発・エミュレーター |
| **Xcode** | iOS開発・シミュレーター（macOS） |
| **Expo CLI** | React Native開発支援 |

## 🚀 環境構築

### 1️⃣ リポジトリクローン
```bash
# 📥 リポジトリクローン
git clone https://github.com/YukiKudo03/shiojiri-rainbow-seeker.git
cd shiojiri-rainbow-seeker

# 🌿 開発ブランチ作成
git checkout -b feature/your-feature-name

# 📊 プロジェクト構造確認
tree -L 2 -I 'node_modules|.git'
```

**期待されるプロジェクト構造:**
```
shiojiri-rainbow-seeker/
├── 📂 backend/          # Node.js API サーバー
├── 📂 frontend/         # React Web 管理画面
├── 📂 mobile/           # React Native アプリ
├── 📂 ml-system/        # Python ML システム
├── 📂 terraform/        # インフラ定義（IaC）
├── 📂 kubernetes/       # K8s デプロイメント
├── 📂 monitoring/       # Prometheus/Grafana
├── 📂 scripts/          # 運用スクリプト
├── 📂 docs/             # ドキュメント
├── 🐳 docker-compose.yml     # 本番環境
├── 🐳 docker-compose.dev.yml # 開発環境
└── 📋 package.json      # ルートパッケージ管理
```

### 2️⃣ 環境変数設定
```bash
# 🔧 メイン環境変数ファイル作成
cp .env.example .env

# 📝 各サービス固有の環境変数設定
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env  
cp mobile/.env.example mobile/.env
cp ml-system/.env.example ml-system/.env

# ✏️ 環境変数編集（重要な設定項目）
nano .env
```

**🔑 重要な環境変数設定項目:**
```bash
# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shiojiri_rainbow_dev
DB_USER=shiojiri_user
DB_PASSWORD=secure_password

# Redis設定
REDIS_URL=redis://localhost:6379

# JWT認証
JWT_SECRET=your-super-secure-jwt-secret-256-bit
JWT_EXPIRES_IN=24h

# 外部API設定
WEATHER_API_KEY=your-weather-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# ML システム設定
ML_MODEL_PATH=./models/rainbow_predictor.pkl
ML_API_URL=http://localhost:5000

# 開発環境設定
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. 依存関係インストール

#### Option A: 一括インストール
```bash
npm run install-all
```

#### Option B: 個別インストール
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Mobile
cd ../mobile
npm install

# ML System
cd ../ml-system
pip install -r requirements.txt
```

### 4. データベース設定

#### PostgreSQL設定
```bash
# PostgreSQL起動
sudo systemctl start postgresql

# データベース作成
createdb shiojiri_rainbow_dev

# ユーザー作成
psql -c "CREATE USER shiojiri_user WITH PASSWORD 'password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE shiojiri_rainbow_dev TO shiojiri_user;"
```

#### Redis設定
```bash
# Redis起動
sudo systemctl start redis

# Redis接続確認
redis-cli ping
```

### 5. Docker環境（推奨）
```bash
# 開発環境用Docker Compose起動
docker-compose -f docker-compose.dev.yml up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

## 開発サーバー起動

### 1. データベースマイグレーション
```bash
# Backend directory
cd backend

# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed
```

### 2. 各サービス起動

#### 一括起動
```bash
# ルートディレクトリから
npm run dev
```

#### 個別起動
```bash
# Backend (Port: 3000)
cd backend
npm run dev

# Frontend (Port: 3001)
cd frontend
npm start

# Mobile (Port: 8081)
cd mobile
npm start

# ML System (Port: 5000)
cd ml-system
python app.py
```

## 開発ワークフロー

### 1. Git フロー
```bash
# 最新コードを取得
git pull origin main

# 新しいブランチ作成
git checkout -b feature/new-feature

# 変更をコミット
git add .
git commit -m "feat: add new feature"

# リモートにプッシュ
git push origin feature/new-feature

# Pull Request作成
```

### 2. コード品質チェック
```bash
# ESLint実行
npm run lint

# 自動修正
npm run lint:fix

# Prettier実行
npm run format

# 型チェック
npm run type-check
```

### 3. テスト実行
```bash
# 全テスト実行
npm run test

# テストカバレッジ
npm run test:coverage

# 特定のテストファイル実行
npm run test auth.test.js

# ウォッチモード
npm run test:watch
```

## IDE設定

### Visual Studio Code

#### 推奨拡張機能
- ESLint
- Prettier
- TypeScript
- Python
- Docker
- PostgreSQL
- GitLens
- REST Client

#### 設定ファイル (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "python.defaultInterpreterPath": "./ml-system/venv/bin/python"
}
```

#### デバッグ設定 (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend Debug",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/app.js",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Python Debug",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/ml-system/app.py",
      "console": "integratedTerminal"
    }
  ]
}
```

## データベース操作

### 1. マイグレーション
```bash
# 新しいマイグレーション作成
npm run db:migration:create add_new_table

# マイグレーション実行
npm run db:migrate

# マイグレーションロールバック
npm run db:migrate:rollback
```

### 2. シードデータ
```bash
# シードファイル作成
npm run db:seed:create users

# シード実行
npm run db:seed

# 特定のシード実行
npm run db:seed:run --seed=users.js
```

### 3. データベース接続
```bash
# psql接続
psql -h localhost -U shiojiri_user -d shiojiri_rainbow_dev

# pgAdmin使用
# http://localhost:5050
```

## API テスト

### 1. Postman Collection
```bash
# Postman Collection インポート
# docs/postman/shiojiri-rainbow-seeker.postman_collection.json
```

### 2. REST Client (VS Code)
```http
### ユーザー登録
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "username": "testuser"
}

### ログイン
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. APIドキュメント
```bash
# Swagger UI
http://localhost:3000/api/docs

# API仕様書
docs/API.md
```

## フロントエンド開発

### 1. React 開発
```bash
# 新しいコンポーネント作成
cd frontend/src/components
mkdir NewComponent
touch NewComponent/NewComponent.jsx
touch NewComponent/NewComponent.test.jsx
touch NewComponent/index.js
```

### 2. スタイリング
```bash
# TailwindCSS クラス
className="bg-blue-500 text-white p-4 rounded-lg"

# カスタムCSS
import './NewComponent.css'
```

### 3. 状態管理
```javascript
// React Context
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Local State
const [state, setState] = useState(initialState);
```

## モバイル開発

### 1. React Native セットアップ
```bash
# Metro サーバー起動
npx react-native start

# Android エミュレーター起動
npx react-native run-android

# iOS シミュレーター起動 (macOS)
npx react-native run-ios
```

### 2. デバイステスト
```bash
# Expo 使用
cd mobile
expo start

# QR コードスキャンでデバイス接続
```

## 機械学習開発

### 1. Python環境
```bash
# 仮想環境作成
cd ml-system
python -m venv venv

# 仮想環境アクティベート
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 依存関係インストール
pip install -r requirements.txt
```

### 2. Jupyter Notebook
```bash
# Jupyter 起動
jupyter notebook

# ブラウザで開く
# http://localhost:8888
```

### 3. モデル学習
```bash
# 学習データ準備
python scripts/prepare_data.py

# モデル学習
python scripts/train_model.py

# 予測実行
python scripts/predict.py
```

## 監視・ログ

### 1. ログ確認
```bash
# アプリケーションログ
tail -f backend/logs/app.log

# Dockerログ
docker-compose logs -f backend

# システムログ
journalctl -u postgresql
```

### 2. 監視ダッシュボード
```bash
# Grafana (開発環境)
http://localhost:3000
# Username: admin, Password: admin

# Prometheus
http://localhost:9090
```

## トラブルシューティング

### 1. 一般的な問題

#### Node.js バージョン問題
```bash
# Node.js バージョン確認
node --version

# nvm使用
nvm use 18
```

#### ポート衝突
```bash
# ポート使用状況確認
lsof -i :3000

# プロセス終了
kill -9 <PID>
```

#### データベース接続エラー
```bash
# PostgreSQL状態確認
sudo systemctl status postgresql

# 接続テスト
psql -h localhost -U shiojiri_user -d shiojiri_rainbow_dev -c "SELECT 1;"
```

### 2. パフォーマンス問題

#### メモリ使用量確認
```bash
# Node.js メモリ使用量
ps aux | grep node

# システムメモリ
free -h
```

#### データベース最適化
```sql
-- 遅いクエリ確認
SELECT query, total_time, calls 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- インデックス使用状況
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 開発ベストプラクティス

### 1. コーディング規約
- TypeScript 厳密モード使用
- ESLint + Prettier設定準拠
- コンポーネント単位でのテスト記述
- 明確な変数・関数命名

### 2. Git 使用方法
- コミットメッセージ規約準拠
- 小さな単位でのコミット
- Pull Request でのコードレビュー
- Issue とのリンク

### 3. セキュリティ
- 秘密情報の環境変数化
- 入力値のバリデーション
- SQLインジェクション対策
- XSS対策

### 4. パフォーマンス
- 不要な再レンダリング回避
- 大量データの適切な処理
- 画像最適化
- キャッシュ活用

## 参考資料

### 公式ドキュメント
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://docs.docker.com/)

### 内部ドキュメント
- [API仕様書](./API.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [セキュリティガイド](./SECURITY.md)

### コミュニティ
- [GitHub Issues](https://github.com/your-org/shiojiri-rainbow-seeker/issues)
- [Discord](https://discord.gg/shiojiri-rainbow-seeker)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/shiojiri-rainbow-seeker)

## 連絡先
- 開発チーム: dev@shiojiri-rainbow-seeker.com
- テクニカルサポート: support@shiojiri-rainbow-seeker.com