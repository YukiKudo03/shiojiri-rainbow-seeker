import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../services/apiService';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Analytics = () => {
  const [period, setPeriod] = useState(30);

  const { data: analytics, isLoading } = useQuery(
    ['analytics', period],
    () => apiService.getAnalytics({ days: period }),
    { refetchInterval: 300000 }
  );

  const { data: rainbowStatsData } = useQuery(
    ['rainbowStats', period],
    () => apiService.getRainbowStats({ days: period }),
    { refetchInterval: 300000 }
  );

  const { data: userStatsData } = useQuery(
    ['userStats', period],
    () => apiService.getUserStats({ days: period }),
    { refetchInterval: 300000 }
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const timelineData = {
    labels: analytics?.data?.timeline?.map(item => 
      new Date(item.date).toLocaleDateString('ja-JP')
    ) || [],
    datasets: [
      {
        label: '虹投稿数',
        data: analytics?.data?.timeline?.map(item => item.rainbows) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: '新規ユーザー',
        data: analytics?.data?.timeline?.map(item => item.new_users) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const hourlyData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: '時間別投稿数',
        data: analytics?.data?.hourly_distribution || Array(24).fill(0),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const weatherData = {
    labels: ['晴れ', '曇り', '雨', '雷雨', 'その他'],
    datasets: [
      {
        data: analytics?.data?.weather_distribution || [0, 0, 0, 0, 0],
        backgroundColor: [
          '#FEF3C7',
          '#D1D5DB',
          '#DBEAFE',
          '#FEE2E2',
          '#F3E8FF',
        ],
        borderColor: [
          '#F59E0B',
          '#6B7280',
          '#3B82F6',
          '#EF4444',
          '#8B5CF6',
        ],
        borderWidth: 2,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">分析</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>過去7日</option>
          <option value={30}>過去30日</option>
          <option value={90}>過去90日</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">総投稿数</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {analytics?.data?.total_rainbows || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">総ユーザー数</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {analytics?.data?.total_users || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">平均投稿数/日</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(analytics?.data?.avg_rainbows_per_day || 0).toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">アクティブユーザー</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {analytics?.data?.active_users || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">投稿数とユーザー数の推移</h2>
          <div className="h-64">
            <Line data={timelineData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">時間別投稿分布</h2>
          <div className="h-64">
            <Bar data={hourlyData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">天気別投稿分布</h2>
          <div className="h-64">
            <Doughnut data={weatherData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">投稿頻度の高い場所</h2>
          <div className="space-y-3">
            {analytics?.data?.top_locations?.map((location, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {location.address || '住所不明'}
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {location.count}件
                </span>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;