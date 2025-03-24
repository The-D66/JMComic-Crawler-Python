import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [albumId, setAlbumId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);

  // 轮询任务状态
  useEffect(() => {
    let interval;
    if (currentTask) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/status/${currentTask.task_id}`);
          const task = response.data;

          // 更新下载历史
          setDownloadHistory(prev => prev.map(item =>
            item.id === task.album_id ? {
              ...item,
              status: task.status,
              album_info: task.album_info,
              error: task.error
            } : item
          ));

          // 如果任务完成或失败，停止轮询
          if (task.status === 'completed' || task.status === 'failed') {
            setCurrentTask(null);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('获取任务状态失败:', err);
        }
      }, 5000); // 每5秒轮询一次
    }
    return () => clearInterval(interval);
  }, [currentTask]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('开始下载...');
    setError('');

    try {
      const response = await axios.post('/api/download', { albumId });
      setStatus('下载任务已提交');
      setCurrentTask(response.data);

      setDownloadHistory(prev => [...prev, {
        id: albumId,
        timestamp: new Date().toLocaleString(),
        status: '已提交',
        task_id: response.data.task_id
      }]);
    } catch (err) {
      setError(err.response?.data?.message || '下载失败');
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">JMComic 下载器</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      本子 ID
                    </label>
                    <input
                      type="text"
                      value={albumId}
                      onChange={(e) => setAlbumId(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="输入本子 ID"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    开始下载
                  </button>
                </form>

                {status && (
                  <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
                    {status}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                  </div>
                )}

                {downloadHistory.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">下载历史</h2>
                    <div className="space-y-2">
                      {downloadHistory.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-md">
                          <div className="flex justify-between">
                            <span>ID: {item.id}</span>
                            <span>{item.timestamp}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            状态: {item.status}
                          </div>
                          {item.album_info && (
                            <div className="text-sm text-gray-600 mt-2">
                              <div>标题: {item.album_info.name}</div>
                              <div>作者: {item.album_info.author}</div>
                              <div>页数: {item.album_info.page_count}</div>
                            </div>
                          )}
                          {item.error && (
                            <div className="text-sm text-red-600 mt-2">
                              错误: {item.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 