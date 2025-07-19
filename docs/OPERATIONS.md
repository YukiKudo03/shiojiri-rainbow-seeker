# 運用・監視ガイド

## 概要
塩尻レインボーシーカープロジェクトの運用・監視手順書です。

## 監視体制

### 1. 監視レベル
- **L1**: 基本的なシステム監視（自動化）
- **L2**: アプリケーション監視（半自動）
- **L3**: 詳細分析・対応（手動）

### 2. 監視範囲
- システムリソース（CPU、メモリ、ディスク）
- アプリケーション性能（レスポンス時間、エラー率）
- ビジネスメトリクス（虹目撃数、予測精度）
- セキュリティイベント

## 監視ツール

### 1. Prometheus + Grafana

#### 起動・確認
```bash
# Prometheus状態確認
kubectl get pods -n shiojiri-rainbow-seeker | grep prometheus

# Grafana ダッシュボード アクセス
kubectl port-forward service/grafana 3000:3000 -n shiojiri-rainbow-seeker
# http://localhost:3000 (admin/admin)

# Prometheus UI アクセス
kubectl port-forward service/prometheus 9090:9090 -n shiojiri-rainbow-seeker
# http://localhost:9090
```

#### メトリクス確認
```bash
# システムメトリクス
curl http://localhost:9090/api/v1/query?query=up

# アプリケーションメトリクス
curl http://localhost:9090/api/v1/query?query=http_requests_total
```

### 2. アラート設定

#### AlertManager設定
```yaml
# alerting_rules.yml
groups:
  - name: system
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          
      - alert: HighMemoryUsage
        expr: memory_usage > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
```

#### Slack通知設定
```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: 'Shiojiri Rainbow Seeker Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### 3. ログ監視

#### ログ収集設定
```bash
# Fluentd設定確認
kubectl get daemonset fluentd -n shiojiri-rainbow-seeker

# ログ確認
kubectl logs -f deployment/backend -n shiojiri-rainbow-seeker
kubectl logs -f deployment/frontend -n shiojiri-rainbow-seeker
kubectl logs -f deployment/ml-system -n shiojiri-rainbow-seeker
```

#### ログ分析
```bash
# エラーログ抽出
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | grep ERROR

# アクセスログ分析
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | grep "POST /api/sightings" | tail -100
```

## 運用手順

### 1. 日次チェック

#### システム状態確認
```bash
#!/bin/bash
# daily_check.sh

echo "=== Daily System Check ==="
echo "Date: $(date)"
echo ""

# Pod状態確認
echo "Pod Status:"
kubectl get pods -n shiojiri-rainbow-seeker

# Service状態確認
echo "Service Status:"
kubectl get services -n shiojiri-rainbow-seeker

# リソース使用量確認
echo "Resource Usage:"
kubectl top pods -n shiojiri-rainbow-seeker

# ディスク使用量確認
echo "Disk Usage:"
df -h

# データベース接続確認
echo "Database Connection:"
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "SELECT 1;"
```

#### ビジネスメトリクス確認
```bash
# 虹目撃数（日次）
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT COUNT(*) as daily_sightings 
FROM sightings 
WHERE DATE(created_at) = CURRENT_DATE;
"

# 予測精度（週次）
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT AVG(accuracy) as weekly_accuracy
FROM predictions 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
"
```

### 2. 週次メンテナンス

#### データベース最適化
```bash
#!/bin/bash
# weekly_maintenance.sh

echo "=== Weekly Maintenance ==="

# データベース統計更新
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "ANALYZE;"

# 不要なログクリーンアップ
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
DELETE FROM access_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
"

# バックアップ確認
./scripts/backup.sh --verify

# ML モデル再学習
kubectl create job --from=cronjob/ml-model-retrain manual-retrain -n shiojiri-rainbow-seeker
```

#### セキュリティチェック
```bash
# 脆弱性スキャン
kubectl exec -it backend-pod -n shiojiri-rainbow-seeker -- npm audit

# 不正アクセス確認
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | grep "401\|403" | tail -50
```

### 3. 月次レビュー

#### パフォーマンス分析
```bash
# 月次レポート生成
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as sightings,
    AVG(response_time) as avg_response_time
FROM sightings 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;
"
```

#### リソース最適化
```bash
# リソース使用量トレンド
kubectl top pods -n shiojiri-rainbow-seeker --sort-by=memory
kubectl top pods -n shiojiri-rainbow-seeker --sort-by=cpu

# 不要なリソース削除
kubectl delete pod --field-selector=status.phase=Succeeded -n shiojiri-rainbow-seeker
```

## 障害対応

### 1. 障害レベル定義

#### レベル1: 軽微な障害
- 一部機能の動作不良
- 性能劣化
- 復旧時間: 1-2時間

#### レベル2: 重要な障害
- 主要機能の停止
- データ整合性の問題
- 復旧時間: 30分以内

#### レベル3: 致命的な障害
- システム全体の停止
- データ損失の可能性
- 復旧時間: 15分以内

### 2. 障害対応フロー

#### 初動対応
```bash
# 1. 障害状況確認
kubectl get pods -n shiojiri-rainbow-seeker
kubectl get events -n shiojiri-rainbow-seeker --sort-by='.lastTimestamp'

# 2. ログ確認
kubectl logs --tail=100 deployment/backend -n shiojiri-rainbow-seeker

# 3. 緊急通知
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 システム障害が発生しました"}' \
  "${SLACK_WEBHOOK_URL}"
```

#### 復旧手順
```bash
# Pod再起動
kubectl rollout restart deployment/backend -n shiojiri-rainbow-seeker

# 設定リロード
kubectl rollout restart deployment/frontend -n shiojiri-rainbow-seeker

# データベース復旧
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- pg_ctl restart
```

### 3. 具体的な障害対応

#### Pod起動失敗
```bash
# Pod状態確認
kubectl describe pod <pod-name> -n shiojiri-rainbow-seeker

# イベント確認
kubectl get events --field-selector involvedObject.name=<pod-name> -n shiojiri-rainbow-seeker

# リソース不足の場合
kubectl describe nodes
kubectl top nodes
```

#### データベース接続エラー
```bash
# データベース状態確認
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- pg_isready

# 接続数確認
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT count(*) as connections 
FROM pg_stat_activity;
"

# 接続プール設定確認
kubectl exec -it backend-pod -n shiojiri-rainbow-seeker -- cat /app/config/database.js
```

#### 高負荷対応
```bash
# 負荷分散設定確認
kubectl get hpa -n shiojiri-rainbow-seeker

# スケールアウト
kubectl scale deployment backend --replicas=5 -n shiojiri-rainbow-seeker

# 負荷軽減
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"cpu":"500m","memory":"512Mi"}}}]}}}}' -n shiojiri-rainbow-seeker
```

## バックアップ・リストア

### 1. 自動バックアップ

#### バックアップ状態確認
```bash
# CronJob状態確認
kubectl get cronjobs -n shiojiri-rainbow-seeker

# バックアップ履歴確認
kubectl get jobs -n shiojiri-rainbow-seeker | grep backup

# 最新バックアップ確認
ls -la /path/to/backups/ | head -10
```

#### バックアップ検証
```bash
# バックアップファイル整合性確認
./scripts/backup.sh --verify

# リストア テスト
./scripts/restore.sh --test backup_20230715_120000.sql.gz
```

### 2. 緊急リストア

#### 障害時リストア
```bash
# 最新バックアップから復旧
./scripts/restore.sh --latest --force

# 特定時点から復旧
./scripts/restore.sh --datetime "2023-07-15 12:00:00"

# 部分復旧
./scripts/restore.sh --table sightings backup_20230715_120000.sql.gz
```

## セキュリティ監視

### 1. 不正アクセス監視

#### ログ監視
```bash
# 不正ログイン試行
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | grep "401" | grep "/api/auth/login"

# 異常なAPI呼び出し
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | grep "429\|500" | tail -20

# 不審なIP アドレス
kubectl logs deployment/backend -n shiojiri-rainbow-seeker | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

#### セキュリティスキャン
```bash
# 脆弱性スキャン
kubectl exec -it backend-pod -n shiojiri-rainbow-seeker -- npm audit --audit-level moderate

# コンテナスキャン
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/tmp/.cache/ aquasec/trivy image your-registry/shiojiri-rainbow-seeker-backend:latest
```

### 2. 証明書管理

#### SSL証明書確認
```bash
# 証明書有効期限確認
kubectl get certificates -n shiojiri-rainbow-seeker

# 証明書更新
kubectl delete certificate api-tls -n shiojiri-rainbow-seeker
kubectl apply -f kubernetes/cert-manager/certificate.yaml
```

## 性能最適化

### 1. リソース最適化

#### CPU/メモリ最適化
```bash
# リソース使用量分析
kubectl top pods -n shiojiri-rainbow-seeker --sort-by=cpu
kubectl top pods -n shiojiri-rainbow-seeker --sort-by=memory

# リソース制限調整
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"requests":{"cpu":"100m","memory":"256Mi"},"limits":{"cpu":"500m","memory":"512Mi"}}}]}}}}' -n shiojiri-rainbow-seeker
```

#### データベース最適化
```bash
# 遅いクエリ確認
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT query, total_time, calls, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
"

# インデックス最適化
kubectl exec -it postgres-pod -n shiojiri-rainbow-seeker -- psql -c "
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
"
```

### 2. スケーリング

#### 水平スケーリング
```bash
# HPA設定
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10 -n shiojiri-rainbow-seeker

# VPA設定
kubectl apply -f kubernetes/vpa.yaml
```

#### 垂直スケーリング
```bash
# Node リソース拡張
kubectl patch node node-1 -p '{"spec":{"capacity":{"cpu":"4","memory":"8Gi"}}}'
```

## 運用自動化

### 1. 定期タスク

#### Cron設定
```bash
# 日次レポート
0 9 * * * /path/to/daily_report.sh

# 週次メンテナンス
0 2 * * 0 /path/to/weekly_maintenance.sh

# 月次バックアップ検証
0 3 1 * * /path/to/backup_verification.sh
```

#### 自動復旧
```bash
# ヘルスチェック失敗時の自動再起動
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","livenessProbe":{"httpGet":{"path":"/health","port":3000},"initialDelaySeconds":30,"periodSeconds":10},"readinessProbe":{"httpGet":{"path":"/ready","port":3000},"initialDelaySeconds":5,"periodSeconds":5}}]}}}}' -n shiojiri-rainbow-seeker
```

### 2. 監視自動化

#### カスタムメトリクス
```bash
# アプリケーション固有のメトリクス収集
kubectl apply -f kubernetes/monitoring/custom-metrics.yaml

# ビジネスメトリクス アラート
kubectl apply -f kubernetes/monitoring/business-alerts.yaml
```

## 運用チェックリスト

### 日次チェック
- [ ] システム状態確認
- [ ] エラーログ確認
- [ ] リソース使用量確認
- [ ] バックアップ状態確認
- [ ] セキュリティログ確認

### 週次チェック
- [ ] データベース最適化
- [ ] 不要データクリーンアップ
- [ ] セキュリティパッチ適用
- [ ] 性能レポート確認
- [ ] 監視アラート調整

### 月次チェック
- [ ] 包括的な性能分析
- [ ] リソース最適化
- [ ] セキュリティ監査
- [ ] 災害復旧テスト
- [ ] 運用手順見直し

## エスカレーション

### 連絡先
- **L1 運用**: ops-l1@shiojiri-rainbow-seeker.com
- **L2 運用**: ops-l2@shiojiri-rainbow-seeker.com
- **開発チーム**: dev@shiojiri-rainbow-seeker.com
- **緊急時**: emergency@shiojiri-rainbow-seeker.com

### 緊急時対応
- Slack: #emergency-alerts
- 電話: +81-XXX-XXX-XXXX
- オンコール: PagerDuty

## ドキュメント
- [障害対応手順書](./INCIDENT_RESPONSE.md)
- [セキュリティガイド](./SECURITY.md)
- [デプロイメントガイド](./DEPLOYMENT.md)