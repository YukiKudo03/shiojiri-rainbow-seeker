# 🌈 塩尻レインボーシーカープロジェクト

[![CI/CD](https://github.com/YukiKudo03/shiojiri-rainbow-seeker/actions/workflows/ci.yml/badge.svg)](https://github.com/YukiKudo03/shiojiri-rainbow-seeker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.9.0-blue)](https://python.org/)

<div align="center">
  <img src="assets/images/ShiojiriRainbowSeekerTop.jpg" alt="塩尻レインボーシーカー" width="100%" max-width="800px">
</div>

## 🎯 概要
塩尻市大門近辺で虹を見かけたらアプリから撮影してシステムに投稿し、近隣ユーザーに虹の出現をプッシュ通知するシステムです。気象データを蓄積し、機械学習により虹の出現を予測します。

**エンタープライズグレードの本格的なプロダクションシステム**として設計され、高可用性、スケーラビリティ、セキュリティを重視した実装となっています。

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

## ✨ 主要機能

### 🌈 コア機能
- 📸 **虹の目撃情報撮影・投稿** - 高品質画像処理・最適化
- 📱 **リアルタイムプッシュ通知** - 近隣ユーザーへの即座な通知
- 🌦️ **気象データ統合** - 複数ソースからのリアルタイム気象情報
- 🤖 **AI虹予測システム** - 機械学習による高精度予測
- 📊 **高度なデータ分析** - 時系列分析・統計可視化
- 📍 **位置情報サービス** - 精密な地理的検索・フィルタリング

### 🛡️ エンタープライズ機能
- 🔐 **多層セキュリティ** - JWT認証・RBAC・入力検証
- ⚡ **パフォーマンス最適化** - Redis キャッシング・画像最適化
- 📈 **包括的監視** - Prometheus メトリクス・アラート
- 🔄 **高可用性設計** - ロードバランシング・自動復旧
- 📊 **管理者ダッシュボード** - リアルタイム統計・システム管理
- 🧪 **包括的テスト** - 単体・統合・E2E・パフォーマンステスト

## 🛠️ 技術スタック

### バックエンド
- **API**: Node.js 18+, Express.js, TypeScript
- **データベース**: PostgreSQL 15+ (PostGIS), Redis 7+
- **認証**: JWT, bcrypt, 多要素認証対応
- **ファイル処理**: Sharp (画像最適化), Multer
- **ログ**: Winston (構造化ログ)

### フロントエンド
- **Web**: React 18+, TypeScript, TailwindCSS
- **Mobile**: React Native, Expo SDK
- **状態管理**: React Query, Context API
- **UI/UX**: Chart.js, React Leaflet, React Hot Toast
- **テスト**: Jest, React Testing Library

### 機械学習・AI
- **ML Framework**: Python 3.9+, scikit-learn, pandas
- **データ処理**: NumPy, SciPy, Matplotlib
- **API**: Flask, RESTful設計
- **モデル管理**: Joblib, バージョン管理対応

### インフラ・DevOps
- **コンテナ**: Docker, Docker Compose
- **オーケストレーション**: Kubernetes, Helm
- **IaC**: Terraform (AWS/GCP対応)
- **CI/CD**: GitHub Actions, 自動テスト・デプロイ
- **監視**: Prometheus, Grafana, AlertManager
- **セキュリティ**: Trivy,依存関係監査

## 🚀 クイックスタート

### 📋 必要なソフトウェア
- **Node.js** 18+ (LTS推奨)
- **Python** 3.9+ 
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (PostGIS拡張)
- **Redis** 7+
- **Git** 最新版

### ⚡ Docker環境（推奨）
```bash
# リポジトリクローン
git clone https://github.com/YukiKudo03/shiojiri-rainbow-seeker.git
cd shiojiri-rainbow-seeker

# 環境変数設定
cp .env.example .env
# .env ファイルを編集（データベース接続情報等）

# プロダクション環境起動
docker-compose -f docker-compose.prod.yml up -d

# データベース初期化
npm run db:migrate
npm run db:seed

# 🎉 アプリケーション起動完了！
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# ML API: http://localhost:5000
# Grafana: http://localhost:3002
```

### 🛠️ 開発環境セットアップ
```bash
# 全依存関係インストール
npm run install-all

# 開発用データベース起動
docker-compose up -d postgres redis

# 環境変数設定
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ml-system/.env.example ml-system/.env

# データベースマイグレーション
cd backend && npm run db:migrate && npm run db:seed

# 開発サーバー起動（並列）
npm run dev

# または個別起動
npm run dev:backend    # Backend: :3001
npm run dev:frontend   # Frontend: :3000
npm run dev:ml         # ML API: :5000
npm run dev:mobile     # Mobile: Expo Dev Tools
```

### 🧪 テスト実行
```bash
# 全テスト実行
npm run test

# カバレッジ付きテスト
npm run test:coverage

# 個別テスト
npm run test:backend
npm run test:frontend
npm run test:ml
npm run test:e2e

# パフォーマンステスト
npm run test:performance
```

### 📦 プロダクションビルド
```bash
# 全コンポーネントビルド
npm run build

# Docker イメージビルド
npm run docker:build

# Kubernetes デプロイ
npm run k8s:deploy
```

## 🌐 デプロイメント

### 🚀 本番環境デプロイ

#### Kubernetes (推奨)
```bash
# Namespace 作成
kubectl create namespace shiojiri-rainbow-seeker

# シークレット設定
kubectl apply -f kubernetes/secrets.yaml

# 全サービスデプロイ
kubectl apply -f kubernetes/

# デプロイ状況確認
kubectl get pods -n shiojiri-rainbow-seeker
kubectl get services -n shiojiri-rainbow-seeker

# ロードバランサーIP確認
kubectl get service frontend-service -n shiojiri-rainbow-seeker
```

#### Terraform インフラ構築
```bash
cd terraform

# AWS環境
terraform workspace select aws-prod
terraform init
terraform plan -var-file="aws.tfvars"
terraform apply -var-file="aws.tfvars"

# GCP環境  
terraform workspace select gcp-prod
terraform init
terraform plan -var-file="gcp.tfvars"
terraform apply -var-file="gcp.tfvars"
```

#### Docker Compose（小規模環境）
```bash
# プロダクション構成で起動
docker-compose -f docker-compose.prod.yml up -d

# SSL証明書設定（Let's Encrypt）
./scripts/setup-ssl.sh your-domain.com

# バックアップ設定
./scripts/setup-backup.sh
```

### 📊 監視・運用

#### システム監視
```bash
# ヘルスチェック
curl -f http://localhost:3001/health
curl -f http://localhost:5000/health

# メトリクス確認
curl http://localhost:3001/metrics
curl http://localhost:5000/metrics?format=prometheus

# ログ監視
docker-compose logs -f backend
kubectl logs -f deployment/backend -n shiojiri-rainbow-seeker
```

#### バックアップ・復旧
```bash
# データベースバックアップ
./scripts/backup.sh

# 自動バックアップ設定（cron）
./scripts/setup-cron-backup.sh

# 復旧操作
./scripts/restore.sh backup-20240101.sql

# ディザスタリカバリ
./scripts/disaster-recovery.sh
```

#### パフォーマンス監視
```bash
# 負荷テスト
npm run test:load

# パフォーマンス監視
./scripts/performance-monitor.sh

# アラート設定確認
curl http://localhost:9093/api/v1/alerts
```

## 📚 API リファレンス

### 🔐 認証エンドポイント
```http
POST /api/auth/register      # ユーザー登録
POST /api/auth/login         # ログイン  
GET  /api/auth/me           # プロフィール取得
PUT  /api/auth/me           # プロフィール更新
POST /api/auth/logout       # ログアウト
POST /api/auth/refresh      # トークンリフレッシュ
```

### 🌈 虹情報エンドポイント
```http
GET    /api/rainbow                          # 虹一覧取得
POST   /api/rainbow                          # 虹投稿
GET    /api/rainbow/:id                      # 虹詳細取得
PUT    /api/rainbow/:id                      # 虹情報更新
DELETE /api/rainbow/:id                      # 虹削除
GET    /api/rainbow/nearby/:lat/:lng         # 周辺虹検索
GET    /api/rainbow/stats                    # 統計情報
```

### 🌦️ 気象・予測エンドポイント
```http
GET  /api/weather/current                    # 現在の気象データ
GET  /api/weather/forecast                   # 気象予報
POST /api/prediction                         # 虹予測リクエスト
GET  /api/prediction/current                 # 現在の予測
GET  /api/prediction/forecast                # 予測履歴
```

### 📱 通知エンドポイント
```http
POST /api/notification/subscribe             # 通知購読
POST /api/notification/send                  # 通知送信
GET  /api/notification/history               # 通知履歴
PUT  /api/notification/settings              # 通知設定更新
```

### 📊 管理・分析エンドポイント
```http
GET  /api/analytics/dashboard                # ダッシュボードデータ
GET  /api/analytics/trends                   # トレンド分析
GET  /api/analytics/reports                  # レポート生成
GET  /api/admin/users                        # ユーザー管理
GET  /api/admin/system                       # システム情報
```

### 🔧 システムエンドポイント
```http
GET  /health                                 # ヘルスチェック
GET  /metrics                               # Prometheusメトリクス
GET  /api-docs                              # API ドキュメント（Swagger）
```

## 👥 開発ガイド

### 🔄 開発フロー
1. **📋 Issue作成** - 機能要求・バグ報告をGitHub Issueで管理
2. **🌿 Feature ブランチ作成** - `feature/`, `bugfix/`, `hotfix/` プレフィックス使用
3. **⚡ 開発・テスト** - TDD（テスト駆動開発）推奨
4. **📝 Pull Request作成** - テンプレートに従って詳細記述
5. **👀 Code Review** - 最低2名のレビュー必須
6. **🚀 マージ・デプロイ** - CI/CDパイプラインによる自動デプロイ

### 📏 コーディング規約

#### 共通ルール
- **Linting**: ESLint + Prettier設定準拠
- **型安全性**: TypeScript厳密型チェック有効
- **テスト**: 単体テスト記述必須（カバレッジ80%以上）
- **セキュリティ**: 依存関係監査・脆弱性チェック実施
- **ドキュメント**: JSDoc/Docstring記述必須

#### Git規約
```bash
# コミットメッセージ形式
feat: ユーザー認証機能を追加
fix: 虹予測APIのバグを修正
docs: README.mdを更新
test: 統合テストを追加
refactor: キャッシュロジックをリファクタリング

# ブランチ命名規則
feature/user-authentication
bugfix/prediction-api-error
hotfix/security-vulnerability
```

### 🧪 テスト戦略

#### テストピラミッド
```
        /\
       /  \
      / E2E \ ← 少数（重要フロー）
     /______\
    /        \
   / 統合テスト  \ ← 中程度（API・DB）
  /__________\
 /            \
/ 単体テスト      \ ← 多数（ロジック）
/______________\
```

#### テストコマンド
```bash
# 開発時テスト
npm run test:watch

# CI/CD用テスト
npm run test:ci

# カバレッジレポート
npm run test:coverage

# パフォーマンステスト
npm run test:performance
```

### 🔒 セキュリティガイドライン

#### 必須チェック項目
- [ ] 入力検証・サニタイゼーション
- [ ] SQLインジェクション対策
- [ ] XSS・CSRF対策  
- [ ] 認証・認可実装
- [ ] 機密情報のハードコード禁止
- [ ] HTTPS通信の強制
- [ ] 依存関係の脆弱性チェック

### 📊 パフォーマンス要件

#### 目標値
- **API応答時間**: < 200ms (95th percentile)
- **ページ読み込み**: < 3秒 (First Contentful Paint)
- **同時接続**: 1,000+ concurrent users
- **可用性**: 99.9% uptime
- **データベース**: < 100ms query time

## 🤝 貢献方法

### 💡 コントリビューション手順
1. **🍴 Fork** このリポジトリ
2. **🌿 ブランチ作成** (`git checkout -b feature/amazing-feature`)
3. **✨ 変更実装** (テスト含む)
4. **✅ テスト実行** (`npm run test`)
5. **📝 コミット** (`git commit -m 'feat: Add amazing feature'`)
6. **📤 プッシュ** (`git push origin feature/amazing-feature`)
7. **🔃 Pull Request作成**

### 🏷️ 課題ラベル
- `good first issue` - 初心者向け
- `help wanted` - コントリビューター募集
- `bug` - バグ修正
- `enhancement` - 機能追加
- `documentation` - ドキュメント改善
- `performance` - パフォーマンス最適化

### 📞 サポート・質問
- **GitHub Issues**: バグ報告・機能要求
- **GitHub Discussions**: 質問・議論
- **Wiki**: 詳細ドキュメント
- **Email**: [プロジェクトメール]

## 📋 プロジェクト情報

### 📈 開発状況
- **バージョン**: v1.0.0 (Production Ready)
- **開発状況**: アクティブ開発中
- **テストカバレッジ**: 85%+
- **パフォーマンス**: 本番環境最適化済み
- **セキュリティ**: エンタープライズレベル

### 🏆 主要実績
- ✅ フルスタック実装完了
- ✅ エンタープライズグレード機能実装
- ✅ 包括的テストスイート構築
- ✅ CI/CDパイプライン実装
- ✅ プロダクション環境対応

### 📜 ライセンス
**MIT License** - 詳細は [LICENSE](LICENSE) ファイルをご確認ください。

### 🙏 謝辞
このプロジェクトは以下の素晴らしいオープンソースプロジェクトを活用しています：
- React, Node.js, PostgreSQL, Redis
- Docker, Kubernetes, Terraform
- Prometheus, Grafana
- そして多くのコントリビューターの皆様

---

<div align="center">
  <p><strong>🌈 美しい虹を、みんなで共有しよう</strong></p>
  <p>Made with ❤️ for Shiojiri City</p>
</div>