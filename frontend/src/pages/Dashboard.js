import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import RainbowChart from '../components/RainbowChart';
import RecentRainbows from '../components/RecentRainbows';

const Dashboard = () => {
  const { data: rainbowStats, isLoading: statsLoading } = useQuery(
    'rainbowStats',
    () => apiService.getRainbowStats({ days: 30 }),
    { refetchInterval: 300000 } // 5分ごとに更新
  );

  const { data: userStats, isLoading: userStatsLoading } = useQuery(
    'userStats',
    () => apiService.getUserStats({ days: 30 }),
    { refetchInterval: 300000 }
  );

  const { data: recentRainbows, isLoading: rainbowsLoading } = useQuery(
    'recentRainbows',
    () => apiService.getRainbows({ limit: 10 }),
    { refetchInterval: 60000 } // 1分ごとに更新
  );

  const { data: prediction } = useQuery(
    'rainbowPrediction',
    () => apiService.getRainbowPrediction(36.0687, 137.9646),
    { refetchInterval: 300000 }
  );

  if (statsLoading || userStatsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <div className="text-sm text-gray-500">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="今日の虹投稿"
          value={rainbowStats?.data?.today || 0}
          change={rainbowStats?.data?.todayChange || 0}
          icon="🌈"
        />
        <StatsCard
          title="総投稿数"
          value={rainbowStats?.data?.total || 0}
          change={rainbowStats?.data?.totalChange || 0}
          icon="📊"
        />
        <StatsCard
          title="アクティブユーザー"
          value={userStats?.data?.active || 0}
          change={userStats?.data?.activeChange || 0}
          icon="👥"
        />
        <StatsCard
          title="虹出現確率"
          value={`${Math.round((prediction?.data?.probability || 0) * 100)}%`}
          change={prediction?.data?.change || 0}
          icon="🔮"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">虹投稿数の推移</h2>
          <RainbowChart data={rainbowStats?.data?.chartData} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">最近の虹投稿</h2>
          <RecentRainbows 
            rainbows={recentRainbows?.data || []} 
            loading={rainbowsLoading}
          />
        </div>
      </div>

      {/* Weather and Prediction Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">塩尻市の天気と虹予測</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-2">☀️</div>
            <div className="text-sm text-gray-600">現在の天気</div>
            <div className="font-semibold">晴れ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🌡️</div>
            <div className="text-sm text-gray-600">気温</div>
            <div className="font-semibold">22°C</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">💧</div>
            <div className="text-sm text-gray-600">湿度</div>
            <div className="font-semibold">65%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;