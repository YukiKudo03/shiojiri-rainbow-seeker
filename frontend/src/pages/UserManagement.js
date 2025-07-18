import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/apiService';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const UserManagement = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery(
    'users',
    () => apiService.getUsers({ limit: 100 }),
    { refetchInterval: 300000 }
  );

  const deleteUserMutation = useMutation(
    (id) => apiService.deleteUser(id),
    {
      onSuccess: () => {
        toast.success('ユーザーを削除しました');
        queryClient.invalidateQueries('users');
        setShowModal(false);
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || '削除に失敗しました');
      },
    }
  );

  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
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
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <div className="text-sm text-gray-500">
          総ユーザー数: {users?.data?.length || 0}
        </div>
      </div>

      {/* User List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users?.data?.map((user) => (
            <li key={user.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-medium">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || '名前なし'}
                      </p>
                      <p className="text-sm text-gray-500">
                        登録: {formatDistanceToNow(new Date(user.created_at), { 
                          addSuffix: true, 
                          locale: ja 
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {user.email}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <span className="mr-4">ID: {user.id}</span>
                      <span className="mr-4">投稿数: {user.rainbow_count || 0}</span>
                      <span>
                        最終ログイン: {
                          user.last_login 
                            ? formatDistanceToNow(new Date(user.last_login), { 
                                addSuffix: true, 
                                locale: ja 
                              })
                            : '未ログイン'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(user)}
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
              <h3 className="text-lg font-medium text-gray-900">ユーザーの削除</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  ユーザー「{selectedUser?.name}」を削除してもよろしいですか？
                  このユーザーの投稿も全て削除されます。この操作は取り消せません。
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
                  disabled={deleteUserMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleteUserMutation.isLoading ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;