import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      rainbowAlerts: true,
      systemAlerts: false,
    },
    api: {
      weatherApiKey: '',
      mlApiUrl: 'http://localhost:5000',
      predictionThreshold: 0.5,
    },
    system: {
      autoModeration: true,
      imageValidation: true,
      locationValidation: true,
      maxFileSize: 5, // MB
    },
  });

  const handleNotificationChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handleApiChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      api: {
        ...prev.api,
        [key]: value,
      },
    }));
  };

  const handleSystemChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    // TODO: API call to save settings
    toast.success('設定を保存しました');
  };

  const handleReset = () => {
    // TODO: Reset to default values
    toast.success('設定をリセットしました');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            リセット
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">通知設定</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                メール通知
              </label>
              <p className="text-sm text-gray-500">
                重要な更新をメールで受信
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => handleNotificationChange('email', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                プッシュ通知
              </label>
              <p className="text-sm text-gray-500">
                新しい虹投稿のプッシュ通知
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => handleNotificationChange('push', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                虹アラート
              </label>
              <p className="text-sm text-gray-500">
                虹出現予測のアラート
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.rainbowAlerts}
              onChange={(e) => handleNotificationChange('rainbowAlerts', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                システムアラート
              </label>
              <p className="text-sm text-gray-500">
                システムの異常やメンテナンス通知
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.systemAlerts}
              onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API設定</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weather API Key
            </label>
            <input
              type="password"
              value={settings.api.weatherApiKey}
              onChange={(e) => handleApiChange('weatherApiKey', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="OpenWeatherMap API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ML API URL
            </label>
            <input
              type="url"
              value={settings.api.mlApiUrl}
              onChange={(e) => handleApiChange('mlApiUrl', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              予測閾値
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={settings.api.predictionThreshold}
              onChange={(e) => handleApiChange('predictionThreshold', parseFloat(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              虹出現予測の閾値（0.0 - 1.0）
            </p>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">システム設定</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                自動モデレーション
              </label>
              <p className="text-sm text-gray-500">
                不適切な投稿の自動削除
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.system.autoModeration}
              onChange={(e) => handleSystemChange('autoModeration', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                画像検証
              </label>
              <p className="text-sm text-gray-500">
                アップロードされた画像の検証
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.system.imageValidation}
              onChange={(e) => handleSystemChange('imageValidation', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                位置情報検証
              </label>
              <p className="text-sm text-gray-500">
                投稿位置の妥当性チェック
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.system.locationValidation}
              onChange={(e) => handleSystemChange('locationValidation', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              最大ファイルサイズ (MB)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.system.maxFileSize}
              onChange={(e) => handleSystemChange('maxFileSize', parseInt(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;