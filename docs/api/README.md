# API ドキュメント

## 概要
塩尻レインボーシーカーAPI は、虹の目撃情報の管理、ユーザー認証、プッシュ通知、気象データの処理を行うRESTful APIです。

## ベースURL
- **開発環境**: `http://localhost:3000/api`
- **本番環境**: `https://api.shiojiri-rainbow-seeker.com/api`

## 認証
APIは JWT（JSON Web Token）を使用した認証を採用しています。

### 認証が必要なエンドポイント
認証が必要なエンドポイントでは、リクエストヘッダーに以下を含めてください：

```
Authorization: Bearer <JWT_TOKEN>
```

## レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // データ内容
  }
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "message": "エラーメッセージ",
    "details": [] // バリデーションエラー等の詳細
  }
}
```

## エンドポイント一覧

### 認証 (Authentication)
- [POST /auth/register](#post-authregister) - ユーザー登録
- [POST /auth/login](#post-authlogin) - ログイン
- [GET /auth/me](#get-authme) - 現在のユーザー情報取得
- [PUT /auth/me](#put-authme) - ユーザー情報更新
- [POST /auth/forgot-password](#post-authforgot-password) - パスワードリセット要求
- [POST /auth/reset-password](#post-authreset-password) - パスワードリセット

### 虹目撃情報 (Rainbow Sightings)
- [GET /rainbow](#get-rainbow) - 虹目撃情報一覧取得
- [POST /rainbow](#post-rainbow) - 虹目撃情報投稿
- [GET /rainbow/:id](#get-rainbowid) - 特定の虹目撃情報取得
- [PUT /rainbow/:id](#put-rainbowid) - 虹目撃情報更新
- [DELETE /rainbow/:id](#delete-rainbowid) - 虹目撃情報削除
- [GET /rainbow/nearby/:lat/:lon](#get-rainbownearbylatlnon) - 近隣の虹目撃情報取得

### 気象データ (Weather)
- [GET /weather/current](#get-weathercurrent) - 現在の気象データ取得
- [GET /weather/radar](#get-weatherradar) - 雨雲レーダーデータ取得
- [GET /weather/history/:date](#get-weatherhistorydate) - 過去の気象データ取得
- [GET /weather/prediction](#get-weatherprediction) - 虹出現予測取得

### 通知 (Notifications)
- [POST /notification/register-token](#post-notificationregister-token) - FCMトークン登録
- [POST /notification/send-rainbow-alert](#post-notificationsend-rainbow-alert) - 虹アラート送信
- [GET /notification/history](#get-notificationhistory) - 通知履歴取得

## 詳細仕様

### POST /auth/register
ユーザー登録を行います。

**リクエスト**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "securePassword123"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login
ユーザーログインを行います。

**リクエスト**
```json
{
  "email": "yamada@example.com",
  "password": "securePassword123"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET /rainbow
虹目撃情報の一覧を取得します。

**クエリパラメータ**
- `page` (optional): ページ番号（デフォルト: 1）
- `limit` (optional): 1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_name": "山田太郎",
      "latitude": 36.1127,
      "longitude": 137.9545,
      "description": "美しい虹が見えました！",
      "image_url": "https://example.com/rainbow1.jpg",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### POST /rainbow
虹目撃情報を投稿します。（認証必須）

**リクエスト (multipart/form-data)**
```
latitude: 36.1127
longitude: 137.9545
description: 美しい虹が見えました！
image: [画像ファイル]
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "latitude": 36.1127,
    "longitude": 137.9545,
    "description": "美しい虹が見えました！",
    "image_url": "https://example.com/rainbow1.jpg",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### GET /rainbow/nearby/:lat/:lon
指定した座標周辺の虹目撃情報を取得します。

**パスパラメータ**
- `lat`: 緯度
- `lon`: 経度

**クエリパラメータ**
- `radius` (optional): 検索半径（km、デフォルト: 10）

**レスポンス**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_name": "山田太郎",
      "latitude": 36.1127,
      "longitude": 137.9545,
      "description": "美しい虹が見えました！",
      "image_url": "https://example.com/rainbow1.jpg",
      "timestamp": "2024-01-15T14:30:00Z",
      "distance": 2.5
    }
  ]
}
```

### GET /weather/current
現在の気象データを取得します。

**レスポンス**
```json
{
  "success": true,
  "data": {
    "temperature": 22.5,
    "humidity": 65,
    "pressure": 1013.25,
    "wind_speed": 3.2,
    "wind_direction": 180,
    "cloud_cover": 40,
    "visibility": 10.0,
    "weather_condition": "partly cloudy",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### GET /weather/prediction
虹出現予測を取得します。

**レスポンス**
```json
{
  "success": true,
  "data": {
    "probability": 75,
    "conditions": {
      "temperature": 22.5,
      "humidity": 65,
      "pressure": 1013.25,
      "wind_speed": 3.2,
      "cloud_cover": 40
    },
    "recommendation": "High chance of rainbow! Keep your camera ready.",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### POST /notification/register-token
FCMトークンを登録します。（認証必須）

**リクエスト**
```json
{
  "token": "firebase-messaging-token-here"
}
```

**レスポンス**
```json
{
  "success": true,
  "message": "FCM token registered successfully"
}
```

## エラーコード

| HTTPステータス | エラーコード | 説明 |
|---------------|-------------|------|
| 400 | Bad Request | リクエストの形式が不正 |
| 401 | Unauthorized | 認証が必要またはトークンが無効 |
| 403 | Forbidden | アクセス権限がない |
| 404 | Not Found | リソースが見つからない |
| 422 | Unprocessable Entity | バリデーションエラー |
| 429 | Too Many Requests | レート制限に達している |
| 500 | Internal Server Error | サーバー内部エラー |

## レート制限
- 一般的なエンドポイント: 100リクエスト/15分
- 認証エンドポイント: 5リクエスト/分
- ファイルアップロード: 10リクエスト/分

## ファイルアップロード制限
- 最大ファイルサイズ: 5MB
- 対応形式: JPEG, PNG, GIF
- 1回のリクエストで1ファイルまで

## 開発者向け情報
- API仕様書の最新版: [OpenAPI仕様書](./openapi.yaml)
- テスト用データ: [テストデータ](./test-data.md)
- 変更履歴: [CHANGELOG](./CHANGELOG.md)