# API 仕様書

## 概要
塩尻レインボーシーカープロジェクトのREST API仕様です。

## ベースURL
```
開発環境: http://localhost:3000/api
本番環境: https://api.shiojiri-rainbow-seeker.com/api
```

## 認証
JWTトークンベースの認証を使用します。

### ヘッダー
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## エンドポイント

### 認証 (Authentication)

#### POST /auth/login
ユーザーログイン

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "role": "user"
  }
}
```

#### POST /auth/register
新規ユーザー登録

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "user",
  "location": {
    "latitude": 36.1134,
    "longitude": 137.9569
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user"
  }
}
```

#### POST /auth/logout
ログアウト

**レスポンス:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 虹目撃情報 (Sightings)

#### GET /sightings
虹目撃情報一覧取得

**クエリパラメータ:**
- `page` (optional): ページ番号 (default: 1)
- `limit` (optional): 1ページあたりの件数 (default: 10)
- `location` (optional): 位置情報でフィルタ
- `date_from` (optional): 日付範囲開始
- `date_to` (optional): 日付範囲終了

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "location": {
        "latitude": 36.1134,
        "longitude": 137.9569
      },
      "image_url": "https://example.com/image.jpg",
      "description": "美しい虹を見ました",
      "weather_conditions": {
        "temperature": 25.5,
        "humidity": 70,
        "wind_speed": 5.2
      },
      "verified": true,
      "created_at": "2023-07-15T10:30:00Z",
      "user": {
        "username": "user",
        "id": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### POST /sightings
虹目撃情報投稿

**リクエスト:**
```json
{
  "location": {
    "latitude": 36.1134,
    "longitude": 137.9569
  },
  "image_url": "https://example.com/image.jpg",
  "description": "美しい虹を見ました",
  "weather_conditions": {
    "temperature": 25.5,
    "humidity": 70,
    "wind_speed": 5.2
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Sighting created successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    },
    "image_url": "https://example.com/image.jpg",
    "description": "美しい虹を見ました",
    "verified": false,
    "created_at": "2023-07-15T10:30:00Z"
  }
}
```

#### GET /sightings/:id
特定の虹目撃情報取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    },
    "image_url": "https://example.com/image.jpg",
    "description": "美しい虹を見ました",
    "weather_conditions": {
      "temperature": 25.5,
      "humidity": 70,
      "wind_speed": 5.2
    },
    "verified": true,
    "created_at": "2023-07-15T10:30:00Z",
    "user": {
      "username": "user",
      "id": 1
    }
  }
}
```

### 虹予測 (Predictions)

#### GET /predictions
虹出現予測取得

**クエリパラメータ:**
- `location` (optional): 位置情報
- `hours` (optional): 予測時間範囲 (default: 24)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    },
    "predictions": [
      {
        "datetime": "2023-07-15T15:00:00Z",
        "probability": 0.75,
        "confidence": 0.85,
        "weather_conditions": {
          "temperature": 26.0,
          "humidity": 75,
          "wind_speed": 4.8,
          "precipitation": 0.2
        }
      }
    ],
    "model_version": "v1.2.0",
    "generated_at": "2023-07-15T12:00:00Z"
  }
}
```

#### POST /predictions/request
虹予測リクエスト

**リクエスト:**
```json
{
  "location": {
    "latitude": 36.1134,
    "longitude": 137.9569
  },
  "hours": 48
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Prediction request submitted",
  "request_id": "pred_123456789"
}
```

### 気象データ (Weather)

#### GET /weather
現在の気象データ取得

**クエリパラメータ:**
- `location` (required): 位置情報

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    },
    "current": {
      "temperature": 25.5,
      "humidity": 70,
      "wind_speed": 5.2,
      "wind_direction": 180,
      "pressure": 1013.25,
      "precipitation": 0.0,
      "cloud_cover": 0.3
    },
    "last_updated": "2023-07-15T12:00:00Z"
  }
}
```

#### GET /weather/history
過去の気象データ取得

**クエリパラメータ:**
- `location` (required): 位置情報
- `date_from` (required): 開始日時
- `date_to` (required): 終了日時

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "datetime": "2023-07-15T12:00:00Z",
      "temperature": 25.5,
      "humidity": 70,
      "wind_speed": 5.2,
      "precipitation": 0.0
    }
  ]
}
```

### 分析データ (Analytics)

#### GET /analytics/overview
分析データ概要取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "total_sightings": 1250,
    "verified_sightings": 980,
    "total_users": 456,
    "active_users": 234,
    "accuracy_rate": 0.87,
    "last_updated": "2023-07-15T12:00:00Z"
  }
}
```

#### GET /analytics/trends
トレンド分析データ取得

**クエリパラメータ:**
- `period` (optional): 期間 (day, week, month, year)
- `date_from` (optional): 開始日時
- `date_to` (optional): 終了日時

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "sightings_by_day": [
      {
        "date": "2023-07-15",
        "count": 15
      }
    ],
    "prediction_accuracy": [
      {
        "date": "2023-07-15",
        "accuracy": 0.85
      }
    ],
    "user_activity": [
      {
        "date": "2023-07-15",
        "active_users": 45
      }
    ]
  }
}
```

### ユーザー管理 (Users)

#### GET /users/profile
ユーザープロフィール取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    },
    "notification_settings": {
      "push_enabled": true,
      "email_enabled": false
    },
    "created_at": "2023-07-01T10:00:00Z"
  }
}
```

#### PUT /users/profile
ユーザープロフィール更新

**リクエスト:**
```json
{
  "username": "newuser",
  "location": {
    "latitude": 36.1134,
    "longitude": 137.9569
  },
  "notification_settings": {
    "push_enabled": true,
    "email_enabled": false
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "username": "newuser",
    "location": {
      "latitude": 36.1134,
      "longitude": 137.9569
    }
  }
}
```

### 通知 (Notifications)

#### POST /notifications/send
プッシュ通知送信

**リクエスト:**
```json
{
  "title": "虹が出現しました！",
  "message": "塩尻市大門近辺で虹が確認されました",
  "location": {
    "latitude": 36.1134,
    "longitude": 137.9569
  },
  "radius": 5000
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "sent_to": 145
}
```

#### GET /notifications
通知履歴取得

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "虹が出現しました！",
      "message": "塩尻市大門近辺で虹が確認されました",
      "sent_at": "2023-07-15T10:30:00Z",
      "read": false
    }
  ]
}
```

## エラーレスポンス

### 400 Bad Request
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## レート制限
- 一般ユーザー: 100 requests/hour
- 認証ユーザー: 1000 requests/hour
- 管理者: 10000 requests/hour

## セキュリティ
- HTTPS必須
- JWT トークン有効期限: 24時間
- パスワード要件: 最低8文字、英数字混合
- API アクセスログ記録

## バージョニング
APIバージョンはURLパスに含めます。
```
/api/v1/sightings
/api/v2/sightings
```

現在のバージョン: v1