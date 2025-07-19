# 🌈 Shiojiri Rainbow Seeker API 仕様書

[![API Version](https://img.shields.io/badge/API-v1.0.0-blue.svg)](docs/API.md)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-green.svg)](docs/openapi.yaml)

## 📋 概要
塩尻レインボーシーカープロジェクトのRESTful API仕様書です。エンタープライズグレードのセキュリティ、パフォーマンス、可用性を提供します。

## 🌐 ベースURL

| 環境 | URL | 説明 |
|------|-----|------|
| **開発環境** | `http://localhost:3001/api` | ローカル開発用 |
| **ステージング** | `https://staging-api.shiojiri-rainbow-seeker.com/api` | テスト環境 |
| **本番環境** | `https://api.shiojiri-rainbow-seeker.com/api` | プロダクション環境 |

## 🔐 認証・認可

### JWT認証
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### API キー認証（管理者用）
```http
X-API-Key: <API_KEY>
Content-Type: application/json
```

### OAuth 2.0（外部連携用）
```http
Authorization: Bearer <OAUTH_TOKEN>
Content-Type: application/json
```

### セキュリティ仕様
- **トークン有効期限**: 24時間
- **リフレッシュトークン**: 30日間
- **暗号化**: AES-256
- **ハッシュ**: bcrypt (12rounds)
- **CORS**: オリジン制限あり

## エンドポイント

---

## 📚 API エンドポイント

### 🔐 認証・ユーザー管理

#### `POST /auth/register` 
新規ユーザー登録

**リクエスト:**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "SecurePass123!",
  "location": {
    "latitude": 36.2048,
    "longitude": 138.2529
  },
  "notification_preferences": {
    "push": true,
    "email": false,
    "radius": 5000
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com",
      "role": "user",
      "verified": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "rt_abc123...",
    "expires_in": 86400
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `POST /auth/login`
ユーザーログイン

**リクエスト:**
```json
{
  "email": "yamada@example.com",
  "password": "SecurePass123!"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com",
      "role": "user",
      "last_login": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "rt_abc123...",
    "expires_in": 86400
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `POST /auth/refresh`
トークンリフレッシュ

**リクエスト:**
```json
{
  "refresh_token": "rt_abc123..."
}
```

#### `GET /auth/me`
ユーザープロフィール取得

**認証:** 必須

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "user",
    "verified": true,
    "location": {
      "latitude": 36.2048,
      "longitude": 138.2529
    },
    "notification_preferences": {
      "push": true,
      "email": false,
      "radius": 5000
    },
    "stats": {
      "rainbow_sightings": 15,
      "total_contributions": 42,
      "member_since": "2024-01-15T10:30:00Z"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2025-07-20T10:30:00Z"
  },
  "timestamp": "2025-07-20T10:30:00Z"
}
```

#### `PUT /auth/me`
ユーザープロフィール更新

**認証:** 必須

**リクエスト:**
```json
{
  "name": "山田次郎",
  "location": {
    "latitude": 36.2048,
    "longitude": 138.2529
  },
  "notification_preferences": {
    "push": true,
    "email": true,
    "radius": 10000
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田次郎",
    "email": "yamada@example.com",
    "role": "user",
    "verified": true,
    "location": {
      "latitude": 36.2048,
      "longitude": 138.2529
    },
    "notification_preferences": {
      "push": true,
      "email": false,
      "radius": 5000
    },
    "statistics": {
      "total_sightings": 15,
      "verified_sightings": 12,
      "accuracy_rate": 0.87
    },
    "created_at": "2024-01-01T10:00:00Z",
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

#### `PUT /auth/me`
ユーザープロフィール更新

**認証:** 必須

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

---

### 🌈 虹目撃情報管理

#### `GET /rainbow`
虹目撃情報一覧取得

**クエリパラメータ:**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|---|------|------------|------|
| `page` | integer | ❌ | 1 | ページ番号 |
| `limit` | integer | ❌ | 10 | 1ページあたりの件数 (最大100) |
| `lat` | float | ❌ | - | 緯度（位置フィルタ用） |
| `lng` | float | ❌ | - | 経度（位置フィルタ用） |
| `radius` | integer | ❌ | 5000 | 検索半径（メートル） |
| `intensity_min` | integer | ❌ | 1 | 最小強度 (1-10) |
| `intensity_max` | integer | ❌ | 10 | 最大強度 (1-10) |
| `date_from` | string | ❌ | - | 開始日時 (ISO8601) |
| `date_to` | string | ❌ | - | 終了日時 (ISO8601) |
| `verified` | boolean | ❌ | - | 検証済みのみ |
| `sort` | string | ❌ | `created_at_desc` | ソート順 |

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