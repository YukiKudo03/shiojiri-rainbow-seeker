# 塩尻レインボーシーカープロジェクト

<div align="center">
  <img src="assets/images/ShiojiriRainbowSeekerTop.jpg" alt="塩尻レインボーシーカー" width="100%" max-width="800px">
</div>

## 概要
塩尻市大門近辺で虹を見かけたらアプリから撮影してシステムに投稿し、近隣ユーザーに虹の出現をプッシュ通知するシステムです。気象データを蓄積し、機械学習により虹の出現を予測します。

## プロジェクト構成
```
shiojiri-rainbow-seeker/
├── backend/          # Node.js/Express API サーバー
├── frontend/         # React Web管理画面
├── mobile/           # React Native モバイルアプリ
├── ml-system/        # Python機械学習システム
├── terraform/        # インフラ定義（IaC）
├── kubernetes/       # K8s デプロイメント設定
├── monitoring/       # Prometheus/Grafana監視
├── scripts/          # 運用スクリプト
└── docs/             # プロジェクトドキュメント
```

## 機能
- 📸 虹の目撃情報撮影・投稿
- 📱 近隣ユーザーへのプッシュ通知
- 🌦️ 気象データ（雨雲レーダー）の記録
- 🤖 機械学習による虹出現予測
- 📊 時系列データ分析・可視化
- 🔐 ユーザー認証・権限管理
- 📈 管理者ダッシュボード
- 📋 レポート機能

## 技術スタック
- **Backend**: Node.js, Express.js, PostgreSQL, Redis
- **Frontend**: React, TypeScript, TailwindCSS, Chart.js
- **Mobile**: React Native, Expo
- **ML**: Python, scikit-learn, TensorFlow, pandas
- **Infrastructure**: Docker, Kubernetes, Terraform
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Cloud**: AWS/GCP対応
- **CI/CD**: GitHub Actions

## 環境設定

### 必要なソフトウェア
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 6+

### クイックスタート（Docker）
```bash
# 環境変数設定
cp .env.example .env

# Docker環境起動
docker-compose up -d

# データベース初期化
npm run db:migrate
npm run db:seed
```

### 開発環境セットアップ
```bash
# 依存関係インストール
npm run install-all

# 開発サーバー起動
npm run dev

# テスト実行
npm run test

# ビルド
npm run build
```

## デプロイメント

### 本番環境デプロイ
```bash
# Kubernetes デプロイ
kubectl apply -f kubernetes/

# Terraform インフラ構築
cd terraform
terraform init
terraform plan
terraform apply
```

### 監視・運用
```bash
# バックアップ作成
./scripts/backup.sh

# ログ監視
./scripts/monitor.sh

# パフォーマンステスト
npm run test:performance
```

## API エンドポイント
```
POST /api/auth/login         # ログイン
POST /api/auth/register      # ユーザー登録
GET  /api/sightings         # 目撃情報一覧
POST /api/sightings         # 目撃情報投稿
GET  /api/predictions       # 虹予測取得
GET  /api/weather           # 気象データ取得
GET  /api/analytics         # 分析データ取得
```

## 開発ガイド

### 開発フロー
1. Issue作成・割り当て
2. Feature ブランチ作成
3. 開発・テスト
4. Pull Request作成
5. Code Review
6. マージ・デプロイ

### コーディング規約
- ESLint + Prettier設定準拠
- TypeScript厳密型チェック
- 単体テスト記述必須
- セキュリティチェック実施

## 貢献方法
1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ライセンス
MIT License