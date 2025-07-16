# 塩尻レインボーシーカープロジェクト

## 概要
塩尻市大門近辺で虹を見かけたらアプリから撮影してシステムに投稿し、近隣ユーザーに虹の出現をプッシュ通知するシステムです。気象データを蓄積し、機械学習により虹の出現を予測します。

## プロジェクト構成
```
shiojiri-rainbow-seeker/
├── backend/          # Node.js/Express API サーバー
├── frontend/         # React Web管理画面
├── mobile/           # React Native モバイルアプリ
├── ml-system/        # Python機械学習システム
└── docs/             # プロジェクトドキュメント
```

## 機能
- 📸 虹の目撃情報撮影・投稿
- 📱 近隣ユーザーへのプッシュ通知
- 🌦️ 気象データ（雨雲レーダー）の記録
- 🤖 機械学習による虹出現予測
- 📊 時系列データ分析

## セットアップ

### 一括インストール
```bash
npm run install-all
```

### 開発環境起動
```bash
npm run dev
```

## 開発手順
1. バックエンドAPI開発 (`backend/`)
2. データベース設計・構築
3. モバイルアプリ開発 (`mobile/`)
4. 機械学習システム開発 (`ml-system/`)
5. 管理画面開発 (`frontend/`)

## 技術スタック
- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, TypeScript
- **Mobile**: React Native
- **ML**: Python, scikit-learn, TensorFlow
- **Infrastructure**: Docker, AWS/GCP

## ライセンス
MIT License