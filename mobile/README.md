# 塩尻レインボーシーカー モバイルアプリ

## 概要
React Nativeで開発されたクロスプラットフォーム（iOS/Android）対応のモバイルアプリです。虹の目撃情報を投稿し、近隣の虹情報を受信できます。

## 機能

### 🌈 主要機能
- **虹の撮影・投稿**: カメラで虹を撮影し、位置情報と共に投稿
- **近隣虹情報**: 現在地周辺の虹目撃情報をマップで表示
- **リアルタイム通知**: 近くで虹が目撃されたときのプッシュ通知
- **虹出現予測**: 機械学習による虹出現確率の表示
- **投稿履歴**: 自分の投稿履歴の確認・管理

### 📱 画面構成
- **スプラッシュ画面**: アプリ起動時の読み込み画面
- **認証画面**: ログイン・ユーザー登録
- **ホーム画面**: 最新の虹情報と天気予報
- **カメラ画面**: 虹の撮影・投稿
- **マップ画面**: 周辺の虹情報をマップ表示
- **プロフィール画面**: ユーザー情報と設定
- **通知画面**: 通知履歴の確認

## 技術スタック

### フレームワーク・ライブラリ
- **React Native**: 0.72.6
- **React Navigation**: 6.x (画面遷移)
- **React Native Maps**: 地図表示
- **React Native Camera**: カメラ機能
- **Firebase SDK**: プッシュ通知
- **AsyncStorage**: ローカルデータ保存
- **Axios**: HTTP通信

### 主要依存関係
```json
{
  "react": "18.2.0",
  "react-native": "0.72.6",
  "@react-navigation/native": "^6.1.7",
  "@react-navigation/stack": "^6.3.17",
  "@react-navigation/bottom-tabs": "^6.5.8",
  "react-native-maps": "^1.7.1",
  "react-native-image-picker": "^5.6.0",
  "@react-native-firebase/app": "^18.3.0",
  "@react-native-firebase/messaging": "^18.3.0",
  "react-native-geolocation-service": "^5.3.1",
  "axios": "^1.5.0"
}
```

## セットアップ

### 前提条件
- Node.js 18+
- React Native CLI
- Android Studio (Android開発)
- Xcode (iOS開発)

### インストール手順

1. **依存関係のインストール**
   ```bash
   cd mobile
   npm install
   ```

2. **iOS設定**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Android設定**
   Android Studioで`android/`フォルダを開き、必要な設定を行う

4. **環境変数設定**
   ```bash
   # .env ファイルを作成
   API_BASE_URL=http://localhost:3000/api
   FIREBASE_PROJECT_ID=your-project-id
   ```

### 実行方法

#### 開発環境での実行
```bash
# Metro bundlerの起動
npm start

# Android実行
npm run android

# iOS実行
npm run ios
```

#### ビルド
```bash
# Android APKビルド
npm run build:android

# iOS buildビルド
npm run build:ios
```

## プロジェクト構造

```
mobile/
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   ├── screens/            # 画面コンポーネント
│   │   ├── SplashScreen.js
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── HomeScreen.js
│   │   ├── CameraScreen.js
│   │   ├── MapScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── NotificationScreen.js
│   │   └── RainbowDetailScreen.js
│   ├── services/           # API・外部サービス
│   │   ├── ApiService.js
│   │   ├── AuthService.js
│   │   ├── LocationService.js
│   │   └── NotificationService.js
│   ├── context/            # React Context
│   │   ├── AuthContext.js
│   │   └── LocationContext.js
│   ├── utils/              # ユーティリティ関数
│   └── assets/             # 画像・静的ファイル
├── android/                # Android固有設定
├── ios/                    # iOS固有設定
├── App.js                  # アプリケーションエントリーポイント
└── package.json
```

## 主要コンポーネント解説

### App.js
```javascript
// アプリケーションのメインエントリーポイント
// ナビゲーション、認証状態管理、初期化処理を行う
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from './src/context/AuthContext';
import { LocationContext } from './src/context/LocationContext';
```

### AuthContext
```javascript
// 認証状態の管理
// ログイン・ログアウト・ユーザー情報の管理
export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
});
```

### ApiService
```javascript
// API通信の統一管理
// 認証トークンの自動付与、エラーハンドリング
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }
}
```

### LocationService
```javascript
// 位置情報の管理
// GPS取得、権限管理、位置情報の監視
export class LocationService {
  static async getCurrentLocation() {
    const hasPermission = await this.requestLocationPermission();
    // 位置情報取得処理
  }
}
```

## 画面仕様

### ホーム画面 (HomeScreen)
```javascript
// 機能:
// - 最新の虹目撃情報表示
// - 現在の天気情報表示
// - 虹出現予測表示
// - 各機能への案内

const HomeScreen = ({ navigation }) => {
  const [rainbows, setRainbows] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  
  // データ取得・表示ロジック
};
```

### カメラ画面 (CameraScreen)
```javascript
// 機能:
// - 虹の撮影・画像選択
// - 位置情報取得
// - 説明文入力
// - 投稿処理

const CameraScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [description, setDescription] = useState('');
  const { location } = useLocation();
  
  // 撮影・投稿ロジック
};
```

### マップ画面 (MapScreen)
```javascript
// 機能:
// - 周辺の虹情報をマップ表示
// - 現在地表示
// - 虹マーカーのタップで詳細表示

const MapScreen = ({ navigation }) => {
  const [rainbows, setRainbows] = useState([]);
  const [mapRegion, setMapRegion] = useState(defaultRegion);
  
  // マップ表示・操作ロジック
};
```

## API連携

### 認証フロー
```javascript
// ログイン
const login = async (email, password) => {
  const response = await ApiService.post('/auth/login', {
    email,
    password
  });
  
  // トークン保存
  await Keychain.setInternetCredentials(TOKEN_KEY, 'token', token);
};
```

### 虹投稿フロー
```javascript
// 虹目撃情報の投稿
const createRainbow = async (rainbowData, imageUri) => {
  const formData = new FormData();
  formData.append('latitude', rainbowData.latitude);
  formData.append('longitude', rainbowData.longitude);
  formData.append('description', rainbowData.description);
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'rainbow.jpg',
  });
  
  return ApiService.uploadFile('/rainbow', formData);
};
```

## プッシュ通知

### Firebase設定
```javascript
// 通知の初期化
const initializeNotifications = async () => {
  await messaging().requestPermission();
  const token = await messaging().getToken();
  
  // FCMトークンをバックエンドに送信
  await ApiService.registerFcmToken(token);
};
```

### 通知処理
```javascript
// フォアグラウンド通知
messaging().onMessage(async (remoteMessage) => {
  // ローカル通知を表示
  showLocalNotification(
    remoteMessage.notification.title,
    remoteMessage.notification.body
  );
});

// バックグラウンド通知
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
});
```

## 状態管理

### Context API使用例
```javascript
// 認証状態の提供
const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  const login = async (email, password) => {
    const result = await AuthService.login(email, password);
    if (result.success) {
      setIsAuthenticated(true);
      setUser(result.user);
    }
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## パフォーマンス最適化

### 画像最適化
```javascript
// 画像の圧縮・リサイズ
const optimizeImage = async (imageUri) => {
  const compressedImage = await ImageResizer.createResizedImage(
    imageUri,
    800,
    600,
    'JPEG',
    80
  );
  return compressedImage.uri;
};
```

### メモリ管理
```javascript
// 不要な画像の解放
useEffect(() => {
  return () => {
    if (imageUri) {
      // 画像リソースの解放
      Image.getSize(imageUri, () => {}, () => {});
    }
  };
}, [imageUri]);
```

## テスト

### テスト環境設定
```bash
# テストの実行
npm test

# テストカバレッジ
npm run test:coverage
```

### テスト例
```javascript
// LoginScreen.test.js
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../src/screens/LoginScreen';

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });
});
```

## デバッグ

### 開発ツール
```bash
# Flipper使用
npx react-native doctor

# ログ確認
npx react-native log-android
npx react-native log-ios
```

### エラーハンドリング
```javascript
// グローバルエラーハンドラー
const errorHandler = (error, isFatal) => {
  if (isFatal) {
    console.error('Fatal error:', error);
  } else {
    console.warn('Non-fatal error:', error);
  }
};

ErrorUtils.setGlobalHandler(errorHandler);
```

## ビルド・リリース

### Android APK生成
```bash
cd android
./gradlew assembleRelease
```

### iOS Archive生成
```bash
cd ios
xcodebuild -workspace RainbowSeeker.xcworkspace \
  -scheme RainbowSeeker \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath RainbowSeeker.xcarchive archive
```

## トラブルシューティング

### よくある問題

1. **Metro bundlerエラー**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Android ビルドエラー**
   ```bash
   cd android
   ./gradlew clean
   ```

3. **iOS Podエラー**
   ```bash
   cd ios
   pod deintegrate
   pod install
   ```

## 今後の改善計画

### 機能追加
- [ ] オフライン機能
- [ ] 虹の品質評価
- [ ] ソーシャル機能
- [ ] 多言語対応

### 技術的改善
- [ ] TypeScript導入
- [ ] 状態管理ライブラリ導入
- [ ] E2Eテスト追加
- [ ] パフォーマンス監視

このモバイルアプリにより、ユーザーは簡単に虹の目撃情報を共有し、コミュニティで虹の出現を楽しむことができます。