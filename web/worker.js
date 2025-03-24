// 存储任务状态
let downloadTasks = new Map();

// GitHub Actions 配置
const GITHUB_TOKEN = GITHUB_TOKEN; // 需要在 Cloudflare Workers 中设置
const GITHUB_REPO = 'your-username/JMComic-Crawler-Python'; // 替换为你的仓库名

async function handleRequest(request) {
  const url = new URL(request.url);

  // 处理 CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // 添加 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // 处理不同的路由
  if (url.pathname === '/api/download' && request.method === 'POST') {
    const { albumId } = await request.json();

    if (!albumId) {
      return new Response(JSON.stringify({ error: '缺少本子ID' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 生成任务ID
    const taskId = `${albumId}_${Date.now()}`;

    // 创建任务记录
    downloadTasks.set(taskId, {
      album_id: albumId,
      status: 'pending',
      start_time: new Date().toISOString(),
      progress: 0,
    });

    // 触发 GitHub Actions
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/download.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            album_id: albumId,
            task_id: taskId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('GitHub Actions 触发失败');
      }

      return new Response(JSON.stringify({
        message: '下载任务已提交',
        task_id: taskId,
      }), {
        headers: corsHeaders,
      });
    } catch (error) {
      downloadTasks.delete(taskId);
      return new Response(JSON.stringify({
        error: '任务提交失败',
        details: error.message,
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  // 获取任务状态
  if (url.pathname.startsWith('/api/status/') && request.method === 'GET') {
    const taskId = url.pathname.split('/').pop();
    const task = downloadTasks.get(taskId);

    if (!task) {
      return new Response(JSON.stringify({ error: '任务不存在' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(task), {
      headers: corsHeaders,
    });
  }

  // 获取所有任务
  if (url.pathname === '/api/tasks' && request.method === 'GET') {
    return new Response(JSON.stringify(Array.from(downloadTasks.values())), {
      headers: corsHeaders,
    });
  }

  // 处理 GitHub Actions 回调
  if (url.pathname === '/api/callback' && request.method === 'POST') {
    const result = await request.json();
    const taskId = result.task_id;

    if (downloadTasks.has(taskId)) {
      const task = downloadTasks.get(taskId);
      task.status = result.status;
      task.end_time = new Date().toISOString();

      if (result.status === 'completed') {
        task.album_info = result.album_info;
      } else if (result.status === 'failed') {
        task.error = result.error;
      }
    }

    return new Response(JSON.stringify({ message: '状态更新成功' }), {
      headers: corsHeaders,
    });
  }

  // 处理静态文件请求
  if (url.pathname === '/') {
    return fetch('https://your-pages-project.pages.dev/index.html');
  }

  return new Response(JSON.stringify({ error: '未找到请求的资源' }), {
    status: 404,
    headers: corsHeaders,
  });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 