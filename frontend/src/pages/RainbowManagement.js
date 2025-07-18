import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/apiService';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const RainbowManagement = () => {
  const [selectedRainbow, setSelectedRainbow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: rainbows, isLoading } = useQuery(
    'rainbows',
    () => apiService.getRainbows({ limit: 100 }),
    { refetchInterval: 60000 }
  );

  const deleteRainbowMutation = useMutation(
    (id) => apiService.deleteRainbow(id),
    {
      onSuccess: () => {
        toast.success('虹投稿を削除しました');
        queryClient.invalidateQueries('rainbows');
        setShowModal(false);
        setSelectedRainbow(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || '削除に失敗しました');
      },
    }
  );

  const handleDelete = (rainbow) => {
    setSelectedRainbow(rainbow);
    setShowModal(true);
  };

  const confirmDelete = () => {
    if (selectedRainbow) {
      deleteRainbowMutation.mutate(selectedRainbow.id);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">虹投稿管理</h1>
        <div className="text-sm text-gray-500">
          総投稿数: {rainbows?.data?.length || 0}
        </div>
      </div>

      {/* Rainbow List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rainbows?.data?.map((rainbow) => (
            <li key={rainbow.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {rainbow.image_url ? (
                      <img
                        src={rainbow.image_url}
                        alt="虹"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 rounded-lg flex items-center justify-center">
                        <span className="text-white text-2xl">🌈</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {rainbow.user_name || '匿名ユーザー'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(rainbow.created_at), { 
                          addSuffix: true, 
                          locale: ja 
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {rainbow.description || '説明なし'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {rainbow.latitude?.toFixed(4)}, {rainbow.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(rainbow)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">投稿の削除</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  この虹投稿を削除してもよろしいですか？この操作は取り消せません。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteRainbowMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleteRainbowMutation.isLoading ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RainbowManagement;