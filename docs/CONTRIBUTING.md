# 貢献ガイド

## 概要
塩尻レインボーシーカープロジェクトへの貢献を歓迎します。このガイドでは、プロジェクトに貢献する方法について説明します。

## 貢献の方法

### 1. バグ報告
バグを発見した場合は、以下の情報を含めてIssueを作成してください：

- **バグの概要**: 簡潔で明確なタイトル
- **環境情報**: OS、ブラウザ、アプリバージョン
- **再現手順**: バグを再現するための詳細な手順
- **期待する動作**: 正常な場合の動作
- **実際の動作**: 実際に発生した動作
- **スクリーンショット**: 可能な場合

### 2. 機能要求
新機能の提案は以下の形式でIssueを作成してください：

- **機能の概要**: 提案する機能の説明
- **動機**: なぜこの機能が必要か
- **実装案**: 可能な実装方法
- **代替案**: 他の解決方法

### 3. コード貢献
コードの貢献は以下の手順で行ってください：

1. **フォーク**: リポジトリをフォーク
2. **ブランチ作成**: 機能ブランチを作成
3. **開発**: コードを実装
4. **テスト**: テストを実行・追加
5. **プルリクエスト**: PRを作成

## 開発環境のセットアップ

### 前提条件
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Docker (推奨)

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/YukiKudo03/shiojiri-rainbow-seeker.git
   cd shiojiri-rainbow-seeker
   ```

2. **依存関係のインストール**
   ```bash
   # 一括インストール
   npm run install-all
   
   # 個別インストール
   npm run backend:install
   npm run frontend:install
   npm run mobile:install
   npm run ml:install
   ```

3. **環境変数の設定**
   ```bash
   # バックエンド
   cp backend/.env.example backend/.env
   
   # フロントエンド
   cp frontend/.env.example frontend/.env
   
   # モバイル
   cp mobile/.env.example mobile/.env
   
   # 機械学習
   cp ml-system/.env.example ml-system/.env
   ```

4. **データベースのセットアップ**
   ```bash
   # PostgreSQL起動
   docker-compose up -d postgres
   
   # スキーマ作成
   psql -U postgres -d shiojiri_rainbow -f backend/src/config/schema.sql
   ```

5. **開発サーバーの起動**
   ```bash
   # 全体起動
   npm run dev
   
   # 個別起動
   npm run backend:dev
   npm run frontend:dev
   npm run mobile:start
   ```

## コーディング規約

### JavaScript/TypeScript

#### コードスタイル
- **インデント**: 2スペース
- **クォート**: シングルクォート
- **セミコロン**: 必須
- **命名**: camelCase

#### ESLint設定
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@react-native-community',
  ],
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': 'error',
    'no-console': 'warn',
  },
};
```

#### コード例
```javascript
// Good
const getUserData = async (userId) => {
  try {
    const response = await ApiService.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
};

// Bad
const getUserData = async (userId) => {
    try {
        const response = await ApiService.get("/users/" + userId)
        return response.data
    } catch (error) {
        console.error("Failed to fetch user data:", error)
        throw error
    }
}
```

### Python

#### コードスタイル
- **インデント**: 4スペース
- **命名**: snake_case
- **インポート**: 標準ライブラリ、サードパーティ、ローカルの順
- **最大行長**: 88文字

#### black設定
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py39']
include = '\.pyi?$'
```

#### コード例
```python
# Good
def predict_rainbow_probability(weather_data: Dict[str, Any]) -> float:
    """虹出現確率を予測する"""
    try:
        features = prepare_features(weather_data)
        probability = model.predict_proba(features)[0][1]
        return float(probability)
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return 0.0

# Bad
def predict_rainbow_probability(weather_data):
    try:
        features = prepare_features(weather_data)
        probability = model.predict_proba(features)[0][1]
        return float(probability)
    except Exception as e:
        logger.error("Prediction error: " + str(e))
        return 0.0
```

## コミット規約

### コミットメッセージ形式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ
- **feat**: 新機能
- **fix**: バグ修正
- **docs**: ドキュメント
- **style**: スタイル変更
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: その他

### 例
```bash
# 機能追加
git commit -m "feat(mobile): add rainbow prediction display"

# バグ修正
git commit -m "fix(backend): resolve database connection issue"

# ドキュメント更新
git commit -m "docs(api): update endpoint documentation"
```

## テスト

### テストの種類
1. **単体テスト**: 個別関数・クラスのテスト
2. **統合テスト**: コンポーネント間のテスト
3. **E2Eテスト**: エンドツーエンドのテスト

### テスト実行
```bash
# 全テスト実行
npm test

# 個別テスト実行
npm run backend:test
npm run frontend:test
npm run mobile:test

# テストカバレッジ
npm run test:coverage
```

### テストの書き方

#### JavaScript/React Native
```javascript
// __tests__/ApiService.test.js
import ApiService from '../src/services/ApiService';

describe('ApiService', () => {
  beforeEach(() => {
    // セットアップ
  });

  test('should fetch rainbow data successfully', async () => {
    const mockData = [{ id: 1, description: 'Test rainbow' }];
    const response = await ApiService.getRainbows();
    
    expect(response.data.success).toBe(true);
    expect(response.data.data).toEqual(mockData);
  });

  test('should handle API errors', async () => {
    // エラーテスト
  });
});
```

#### Python
```python
# tests/test_predictor.py
import pytest
from src.prediction.predictor import RainbowPredictor

class TestRainbowPredictor:
    def setup_method(self):
        self.predictor = RainbowPredictor('models/test_model.pkl')
    
    def test_predict_probability(self):
        weather_data = {
            'temperature': 22,
            'humidity': 70,
            'pressure': 1013,
            'wind_speed': 2,
            'cloud_cover': 40
        }
        
        probability = self.predictor.predict_probability(weather_data)
        
        assert 0 <= probability <= 1
        assert isinstance(probability, float)
    
    def test_prepare_features(self):
        # 特徴量準備のテスト
        pass
```

## プルリクエスト

### PRの準備
1. **最新のmainブランチにリベース**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **テストの実行**
   ```bash
   npm test
   ```

3. **リントの実行**
   ```bash
   npm run lint
   ```

### PR作成時の注意点
- **明確なタイトル**: 変更内容を簡潔に説明
- **詳細な説明**: 変更の理由と内容
- **関連Issue**: 関連するIssueへのリンク
- **スクリーンショット**: UI変更の場合

### PRテンプレート
```markdown
## 概要
このPRの目的と変更内容を説明

## 変更内容
- [ ] 機能A の実装
- [ ] バグB の修正
- [ ] テストC の追加

## テスト
- [ ] 単体テスト追加
- [ ] 統合テスト実行
- [ ] 手動テスト実行

## 確認項目
- [ ] コードスタイル確認
- [ ] ドキュメント更新
- [ ] 後方互換性確認

## 関連Issue
Closes #123
```

## レビュープロセス

### レビュー観点
1. **機能性**: 要件を満たしているか
2. **性能**: パフォーマンスに問題はないか
3. **セキュリティ**: セキュリティ上の問題はないか
4. **保守性**: 理解しやすく保守しやすいか
5. **テスト**: 適切なテストが書かれているか

### レビュー手順
1. **コードレビュー**: GitHubでコードを確認
2. **動作確認**: 実際に動作を確認
3. **フィードバック**: 改善点をコメント
4. **承認**: 問題なければApprove

## リリースプロセス

### バージョン管理
セマンティックバージョニングに従います：
- **MAJOR**: 破壊的変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

### リリース手順
1. **RCブランチ作成**: `release/v1.2.0`
2. **最終テスト**: 全テストの実行
3. **ドキュメント更新**: CHANGELOGとバージョン更新
4. **タグ作成**: `v1.2.0`
5. **本番デプロイ**: 自動デプロイ実行

## コミュニティ

### コミュニケーション
- **GitHub Issues**: バグ報告・機能要求
- **GitHub Discussions**: 質問・議論
- **Pull Requests**: コードレビュー

### 行動規範
- **尊重**: 他の貢献者を尊重する
- **建設的**: 建設的なフィードバックを提供
- **協力的**: チームワークを大切にする
- **学習**: 新しいことを学ぶ姿勢を持つ

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。貢献されたコードも同じライセンスが適用されます。

## 質問・サポート
- GitHub Issues: 技術的な質問
- GitHub Discussions: 一般的な議論
- プロジェクトメンテナー: 重要な質問

貢献していただき、ありがとうございます！一緒に素晴らしい虹予測システムを作り上げましょう。