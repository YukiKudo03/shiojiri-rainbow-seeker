import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const RecentRainbows = ({ rainbows, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rainbows || rainbows.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        最近の虹投稿がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rainbows.map((rainbow) => (
        <div key={rainbow.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {rainbow.image_url ? (
              <img
                src={rainbow.image_url}
                alt="虹"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🌈</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {rainbow.user_name || '匿名ユーザー'}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(rainbow.created_at), { 
                  addSuffix: true, 
                  locale: ja 
                })}
              </p>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {rainbow.description || '説明なし'}
            </p>
            <div className="flex items-center mt-1 text-xs text-gray-500">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {rainbow.latitude?.toFixed(4)}, {rainbow.longitude?.toFixed(4)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentRainbows;