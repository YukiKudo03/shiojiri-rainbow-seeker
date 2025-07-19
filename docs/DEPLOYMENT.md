# 🚀 塩尻レインボーシーカー デプロイメントガイド

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](../.github/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Container-Docker-blue.svg)](https://docker.com/)
[![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes-blue.svg)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-purple.svg)](https://terraform.io/)

## 📋 概要
塩尻レインボーシーカープロジェクトの**エンタープライズグレード本番デプロイメント**手順書です。スケーラブルで高可用性を実現する複数の展開方式をサポートします。

## 🎯 サポートデプロイメント方式

| 方式 | 環境 | 複雑さ | スケール | HA | 推奨用途 |
|------|------|--------|----------|----|-----------| 
| 🐳 **Docker Compose** | 開発・小規模 | ⭐ | 低 | ❌ | ローカル開発・テスト |
| ☸️ **Kubernetes** | 本番・大規模 | ⭐⭐⭐ | 高 | ✅ | プロダクション推奨 |
| 🏗️ **Terraform** | インフラ管理 | ⭐⭐ | 高 | ✅ | インフラ自動化 |
| ⚡ **Serverless** | マネージド | ⭐⭐ | 自動 | ✅ | コスト最適化 |

## ⚡ クイックデプロイ

### 🐳 Docker Compose（最速セットアップ）
```bash
# 1. リポジトリクローン
git clone https://github.com/YukiKudo03/shiojiri-rainbow-seeker.git
cd shiojiri-rainbow-seeker

# 2. 環境変数設定
cp .env.example .env

# 3. プロダクション環境起動（ワンコマンド）
docker-compose -f docker-compose.prod.yml up -d

# 4. データベース初期化
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# 🎉 本番環境起動完了！
# Frontend: https://your-domain.com
# Backend API: https://api.your-domain.com
# Admin Panel: https://admin.your-domain.com
# Monitoring: https://monitoring.your-domain.com
```

## 📋 前提条件・システム要件

### 🛠️ 必須ソフトウェア
| ソフトウェア | バージョン | 用途 | インストール |
|------------|----------|------|-------------|
| **Docker** | 20.10+ | コンテナ実行 | [Install Docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | 2.0+ | 複数サービス管理 | [Install Compose](https://docs.docker.com/compose/install/) |
| **Kubernetes** | 1.24+ | 本番オーケストレーション | [Install kubectl](https://kubernetes.io/docs/tasks/tools/) |
| **Terraform** | 1.5+ | インフラ自動化 | [Install Terraform](https://developer.hashicorp.com/terraform/downloads) |
| **Helm** | 3.x+ | Kubernetesパッケージ管理 | [Install Helm](https://helm.sh/docs/intro/install/) |

### ☁️ クラウドプロバイダー対応
| プロバイダー | サービス | 要件 |
|------------|---------|------|
| **AWS** | EKS, ECR, RDS, ElastiCache | AWS CLI v2+ |
| **Google Cloud** | GKE, GCR, Cloud SQL, Memorystore | gcloud CLI |
| **Azure** | AKS, ACR, Azure Database | Azure CLI |
| **オンプレミス** | K8s, Harbor, PostgreSQL | kubectl + Helm |

### 🔐 必要な権限・アクセス
- ✅ **Container Registry** プッシュ・プル権限
- ✅ **Kubernetes クラスター** 管理者権限
- ✅ **Cloud リソース** 作成・管理権限
- ✅ **DNS** レコード管理権限（独自ドメイン使用時）
- ✅ **SSL証明書** 発行・管理権限

### 🖥️ システム要件

#### 🐳 Docker Compose環境
| コンポーネント | 最小要件 | 推奨要件 |
|--------------|---------|----------|
| **CPU** | 2 cores | 4+ cores |
| **メモリ** | 4GB | 8GB+ |
| **ディスク** | 20GB | 50GB+ |
| **ネットワーク** | 1Mbps | 10Mbps+ |

#### ☸️ Kubernetes環境
| コンポーネント | 最小要件 | 推奨要件 |
|--------------|---------|----------|
| **ノード数** | 3 | 5+ |
| **CPU/ノード** | 2 cores | 4+ cores |
| **メモリ/ノード** | 4GB | 8GB+ |
| **ディスク/ノード** | 50GB | 100GB+ |

## 環境変数設定

### 基本設定
```bash
# 環境変数ファイルをコピー
cp .env.example .env

# 必要な設定を編集
nano .env
```

### 必須環境変数
```bash
# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/shiojiri_rainbow
DATABASE_PASSWORD=your_secure_password

# Redis設定
REDIS_URL=redis://localhost:6379

# JWT設定
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 気象API設定
OPENWEATHER_API_KEY=your_openweather_api_key

# Firebase設定
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# S3設定（オプション）
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-1
S3_BUCKET=your_s3_bucket_name

# 通知設定
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Docker Compose デプロイメント

### 1. 開発環境
```bash
# 開発環境用Docker Composeファイル使用
docker-compose -f docker-compose.dev.yml up -d

# ログ確認
docker-compose logs -f

# データベースマイグレーション
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### 2. 本番環境
```bash
# 本番環境用設定
docker-compose -f docker-compose.prod.yml up -d

# ヘルスチェック
docker-compose ps
```

### 3. 環境クリーンアップ
```bash
# コンテナ停止・削除
docker-compose down -v

# イメージクリーンアップ
docker system prune -f
```

## Kubernetes デプロイメント

### 1. 事前準備

#### Namespace作成
```bash
kubectl create namespace shiojiri-rainbow-seeker
```

#### Secret作成
```bash
# データベース認証情報
kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD=your_secure_password \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=OPENWEATHER_API_KEY=your_api_key \
  --namespace=shiojiri-rainbow-seeker

# Firebase認証情報
kubectl create secret generic firebase-secrets \
  --from-file=firebase-key.json \
  --namespace=shiojiri-rainbow-seeker
```

#### ConfigMap作成
```bash
kubectl create configmap app-config \
  --from-literal=NODE_ENV=production \
  --from-literal=DB_HOST=postgres-service \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_NAME=shiojiri_rainbow \
  --from-literal=REDIS_URL=redis://redis-service:6379 \
  --namespace=shiojiri-rainbow-seeker
```

### 2. イメージビルド・プッシュ

#### Container Registry設定
```bash
# Docker Hub
docker login

# AWS ECR
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# Google Container Registry
gcloud auth configure-docker
```

#### イメージビルド
```bash
# Backend
docker build -t your-registry/shiojiri-rainbow-seeker-backend:latest ./backend
docker push your-registry/shiojiri-rainbow-seeker-backend:latest

# Frontend
docker build -t your-registry/shiojiri-rainbow-seeker-frontend:latest ./frontend
docker push your-registry/shiojiri-rainbow-seeker-frontend:latest

# ML System
docker build -t your-registry/shiojiri-rainbow-seeker-ml-system:latest ./ml-system
docker push your-registry/shiojiri-rainbow-seeker-ml-system:latest
```

### 3. デプロイメント実行

#### 全体デプロイ
```bash
# 設定ファイルの確認
kubectl apply --dry-run=client -f kubernetes/

# 実際のデプロイ
kubectl apply -f kubernetes/
```

#### 個別デプロイ
```bash
# データベース
kubectl apply -f kubernetes/postgres-deployment.yaml

# Redis
kubectl apply -f kubernetes/redis-deployment.yaml

# Backend
kubectl apply -f kubernetes/backend-deployment.yaml

# Frontend
kubectl apply -f kubernetes/frontend-deployment.yaml

# ML System
kubectl apply -f kubernetes/ml-system-deployment.yaml

# 監視システム
kubectl apply -f kubernetes/monitoring/
```

### 4. デプロイメント確認
```bash
# Pod状態確認
kubectl get pods -n shiojiri-rainbow-seeker

# Service確認
kubectl get services -n shiojiri-rainbow-seeker

# Ingress確認
kubectl get ingress -n shiojiri-rainbow-seeker

# ログ確認
kubectl logs -f deployment/backend -n shiojiri-rainbow-seeker
```

## Terraform インフラストラクチャ

### 1. 初期設定

#### AWS環境
```bash
cd terraform/aws

# 認証情報設定
aws configure

# Terraform初期化
terraform init

# 設定確認
terraform plan

# インフラ作成
terraform apply
```

#### GCP環境
```bash
cd terraform/gcp

# 認証情報設定
gcloud auth application-default login

# Terraform初期化
terraform init

# 設定確認
terraform plan

# インフラ作成
terraform apply
```

### 2. 環境別設定

#### 開発環境
```bash
terraform workspace new development
terraform workspace select development
terraform apply -var-file="environments/dev.tfvars"
```

#### 本番環境
```bash
terraform workspace new production
terraform workspace select production
terraform apply -var-file="environments/prod.tfvars"
```

### 3. インフラ更新
```bash
# 変更計画確認
terraform plan

# 変更適用
terraform apply

# 特定リソースのみ更新
terraform apply -target=aws_instance.backend
```

### 4. インフラ削除
```bash
# 確認
terraform plan -destroy

# 削除実行
terraform destroy
```

## 監視システム

### 1. Prometheus + Grafana

#### デプロイ
```bash
# 監視システムデプロイ
kubectl apply -f kubernetes/monitoring/

# Grafana ダッシュボードアクセス
kubectl port-forward service/grafana 3000:3000 -n shiojiri-rainbow-seeker
```

#### 設定確認
```bash
# Prometheus ターゲット確認
kubectl port-forward service/prometheus 9090:9090 -n shiojiri-rainbow-seeker

# AlertManager 確認
kubectl port-forward service/alertmanager 9093:9093 -n shiojiri-rainbow-seeker
```

### 2. ログ監視

#### Fluentd デプロイ
```bash
kubectl apply -f kubernetes/monitoring/fluentd/
```

#### ログ確認
```bash
# アプリケーションログ
kubectl logs -f deployment/backend -n shiojiri-rainbow-seeker

# システムログ
kubectl logs -f daemonset/fluentd -n shiojiri-rainbow-seeker
```

## バックアップ・リストア

### 1. 自動バックアップ設定

#### CronJob有効化
```bash
# バックアップCronJob確認
kubectl get cronjobs -n shiojiri-rainbow-seeker

# バックアップ実行
kubectl create job --from=cronjob/database-backup manual-backup -n shiojiri-rainbow-seeker
```

### 2. 手動バックアップ
```bash
# データベースバックアップ
./scripts/backup.sh

# S3アップロード
./scripts/backup.sh --upload-s3

# GCSアップロード
./scripts/backup.sh --upload-gcs
```

### 3. リストア
```bash
# バックアップ一覧表示
./scripts/restore.sh --list

# 対話的リストア
./scripts/restore.sh --interactive

# 特定ファイルからリストア
./scripts/restore.sh backup_20230715_120000.sql.gz
```

## セキュリティ

### 1. SSL/TLS設定

#### 証明書取得（Let's Encrypt）
```bash
# Cert-Manager インストール
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# ClusterIssuer 設定
kubectl apply -f kubernetes/cert-manager/
```

### 2. ネットワークポリシー
```bash
# ネットワークポリシー適用
kubectl apply -f kubernetes/network-policies/
```

### 3. Pod Security Standards
```bash
# セキュリティポリシー適用
kubectl apply -f kubernetes/security-policies/
```

## トラブルシューティング

### 1. よくある問題

#### Pod起動失敗
```bash
# Pod状態確認
kubectl describe pod <pod-name> -n shiojiri-rainbow-seeker

# ログ確認
kubectl logs <pod-name> -n shiojiri-rainbow-seeker

# イベント確認
kubectl get events -n shiojiri-rainbow-seeker
```

#### 接続エラー
```bash
# Service確認
kubectl get services -n shiojiri-rainbow-seeker

# Endpoint確認
kubectl get endpoints -n shiojiri-rainbow-seeker

# DNS確認
kubectl exec -it <pod-name> -n shiojiri-rainbow-seeker -- nslookup postgres-service
```

### 2. パフォーマンス問題

#### リソース使用量確認
```bash
# CPU/メモリ使用量
kubectl top pods -n shiojiri-rainbow-seeker

# リソース制限確認
kubectl describe pod <pod-name> -n shiojiri-rainbow-seeker
```

#### データベース最適化
```bash
# 接続数確認
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "SELECT count(*) FROM pg_stat_activity;"

# 遅いクエリ確認
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "SELECT query FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## 運用チェックリスト

### デプロイ前
- [ ] 環境変数設定確認
- [ ] データベースマイグレーション
- [ ] テスト実行
- [ ] セキュリティスキャン
- [ ] パフォーマンステスト

### デプロイ後
- [ ] Pod状態確認
- [ ] ヘルスチェック
- [ ] ログ確認
- [ ] 監視アラート設定
- [ ] バックアップ動作確認

### 定期メンテナンス
- [ ] セキュリティパッチ適用
- [ ] 依存関係更新
- [ ] バックアップ検証
- [ ] 監視データ確認
- [ ] リソース使用量レビュー

## 連絡先
- 開発チーム: dev@shiojiri-rainbow-seeker.com
- 運用チーム: ops@shiojiri-rainbow-seeker.com
- 緊急時: emergency@shiojiri-rainbow-seeker.com