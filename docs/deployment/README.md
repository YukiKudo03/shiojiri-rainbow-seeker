# デプロイメント設計書

## 概要
塩尻レインボーシーカーシステムのデプロイメント戦略、インフラ構成、運用手順について説明します。

## インフラ構成

### 本番環境アーキテクチャ
```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    CDN (CloudFront)                     │
│                  Static Assets                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              Load Balancer (ALB)                        │
│                SSL Termination                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   API Server     │  │   API Server     │  │   API Server     │
│  (ECS/Fargate)   │  │  (ECS/Fargate)   │  │  (ECS/Fargate)   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
    │                     │                     │
    └─────────────────────┼─────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Database (RDS PostgreSQL)                  │
│                Multi-AZ Deployment                      │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                Cache (ElastiCache)                      │
│                     Redis                               │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              File Storage (S3)                          │
│                 Images/Assets                           │
└─────────────────────────────────────────────────────────┘
```

## 環境構成

### 開発環境 (Development)
```yaml
Environment: development
Infrastructure:
  - Local Docker Compose
  - PostgreSQL Container
  - Redis Container
  - Local File Storage
  
Purpose:
  - 個人開発・デバッグ
  - 機能開発・テスト
  - API動作確認
```

### ステージング環境 (Staging)
```yaml
Environment: staging
Infrastructure:
  - AWS ECS (Single Instance)
  - RDS PostgreSQL (t3.micro)
  - ElastiCache Redis (t3.micro)
  - S3 Bucket
  
Purpose:
  - 統合テスト
  - 本番環境での動作確認
  - パフォーマンステスト
```

### 本番環境 (Production)
```yaml
Environment: production
Infrastructure:
  - AWS ECS (Multi-AZ, Auto Scaling)
  - RDS PostgreSQL (Multi-AZ, r5.large)
  - ElastiCache Redis (Cluster Mode)
  - S3 Bucket + CloudFront
  
Purpose:
  - 本番サービス提供
  - 高可用性・高性能
  - 監視・運用
```

## Docker設定

### バックエンドAPI Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードのコピー
COPY . .

# セキュリティのためのユーザー作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

### 機械学習システム Dockerfile
```dockerfile
# ml-system/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# セキュリティのためのユーザー作成
RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]
```

### Docker Compose (開発環境)
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  ml-system:
    build: ./ml-system
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=development
      - DB_HOST=postgres
    depends_on:
      - postgres
    volumes:
      - ./ml-system:/app

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=shiojiri_rainbow
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## AWS ECS設定

### ECS Task Definition
```json
{
  "family": "rainbow-seeker-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/rainbow-seeker-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rainbow-seeker-api",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### ECS Service Definition
```json
{
  "serviceName": "rainbow-seeker-api",
  "cluster": "rainbow-seeker-cluster",
  "taskDefinition": "rainbow-seeker-api:1",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": [
        "subnet-12345678",
        "subnet-87654321"
      ],
      "securityGroups": [
        "sg-12345678"
      ],
      "assignPublicIp": "DISABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/rainbow-seeker-api",
      "containerName": "api",
      "containerPort": 3000
    }
  ]
}
```

## Terraform設定

### main.tf
```hcl
provider "aws" {
  region = var.aws_region
}

# VPC設定
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "rainbow-seeker-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["ap-northeast-1a", "ap-northeast-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  
  tags = {
    Environment = var.environment
  }
}

# RDS設定
resource "aws_db_instance" "postgres" {
  identifier = "rainbow-seeker-db"
  
  engine         = "postgres"
  engine_version = "14.6"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type         = "gp2"
  storage_encrypted    = true
  
  db_name  = "shiojiri_rainbow"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "rainbow-seeker-db-final-snapshot"
  
  tags = {
    Name = "rainbow-seeker-db"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rainbow-seeker-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "rainbow-seeker-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = false
}
```

## CI/CD パイプライン

### GitHub Actions設定
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run tests
        run: |
          cd backend
          npm test
      
      - name: Run lint
        run: |
          cd backend
          npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: rainbow-seeker-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: rainbow-seeker-api
          cluster: rainbow-seeker-cluster
          wait-for-service-stability: true
```

## 環境変数管理

### 開発環境 (.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shiojiri_rainbow
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key
WEATHER_API_KEY=your-weather-api-key
FIREBASE_PROJECT_ID=your-project-id
```

### 本番環境 (AWS Systems Manager Parameter Store)
```bash
# パラメータ設定
aws ssm put-parameter \
  --name "/rainbow-seeker/production/db-password" \
  --value "secure-password" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/rainbow-seeker/production/jwt-secret" \
  --value "secure-jwt-secret" \
  --type "SecureString"
```

## 監視・ログ設定

### CloudWatch設定
```yaml
# cloudwatch-config.yml
logs:
  logs_collected:
    files:
      collect_list:
        - file_path: /var/log/app.log
          log_group_name: /aws/ecs/rainbow-seeker-api
          log_stream_name: '{instance_id}'
          timezone: UTC

metrics:
  namespace: RainbowSeeker
  metrics_collected:
    cpu:
      measurement: [cpu_usage_idle, cpu_usage_iowait, cpu_usage_user, cpu_usage_system]
      metrics_collection_interval: 60
    disk:
      measurement: [used_percent]
      metrics_collection_interval: 60
    mem:
      measurement: [mem_used_percent]
      metrics_collection_interval: 60
```

### アラート設定
```hcl
# alerts.tf
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "rainbow-seeker-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "rainbow-seeker-api"
    ClusterName = "rainbow-seeker-cluster"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "rainbow-seeker-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors database connections"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
}
```

## バックアップ・復旧

### データベースバックアップ
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="shiojiri_rainbow"

# データベースバックアップ
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# S3にアップロード
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql s3://rainbow-seeker-backups/database/

# 古いバックアップファイルの削除（7日以上前）
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

### 自動バックアップ設定
```yaml
# backup-cronjob.yml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # 毎日午前2時
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /backup/db_backup_$(date +%Y%m%d_%H%M%S).sql
              aws s3 cp /backup/db_backup_*.sql s3://rainbow-seeker-backups/database/
            env:
            - name: DB_HOST
              value: "postgres-service"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: username
          restartPolicy: OnFailure
```

## セキュリティ設定

### IAM Role Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::rainbow-seeker-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/rainbow-seeker/*"
    }
  ]
}
```

### Security Group設定
```hcl
# security-groups.tf
resource "aws_security_group" "alb" {
  name        = "rainbow-seeker-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name        = "rainbow-seeker-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 運用手順

### デプロイ手順
1. **コードプッシュ**: GitHub mainブランチにプッシュ
2. **CI実行**: テスト・リント・ビルドの自動実行
3. **イメージビルド**: Docker イメージの作成・ECRプッシュ
4. **ECS更新**: 新しいタスク定義でサービス更新
5. **ヘルスチェック**: デプロイ完了の確認

### ロールバック手順
```bash
# 前バージョンにロールバック
aws ecs update-service \
  --cluster rainbow-seeker-cluster \
  --service rainbow-seeker-api \
  --task-definition rainbow-seeker-api:PREVIOUS_VERSION
```

### 緊急時対応
1. **サービス停止**: ECS サービスのタスク数を0に設定
2. **データベース保護**: RDS への書き込み権限を一時的に制限
3. **調査・修正**: 問題の特定と修正版のデプロイ
4. **サービス再開**: 正常なタスク数に戻す

この設計により、安全で効率的なデプロイメントとシステム運用が可能になります。