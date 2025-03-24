from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jmcomic
import asyncio
from typing import Dict, List
import os
from datetime import datetime

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存储下载任务状态
download_tasks: Dict[str, dict] = {}


class DownloadRequest(BaseModel):
  albumId: str


@app.post("/api/download")
async def start_download(request: DownloadRequest):
  album_id = request.albumId

  if album_id in download_tasks:
    return {"message": "该任务已在下载队列中"}

  # 创建下载任务
  task_id = f"{album_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
  download_tasks[task_id] = {
      "album_id": album_id,
      "status": "pending",
      "start_time": datetime.now().isoformat(),
      "progress": 0
  }

  # 异步启动下载任务
  asyncio.create_task(download_album(album_id, task_id))

  return {"message": "下载任务已提交", "task_id": task_id}


@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
  if task_id not in download_tasks:
    raise HTTPException(status_code=404, detail="任务不存在")
  return download_tasks[task_id]


@app.get("/api/tasks")
async def list_tasks():
  return list(download_tasks.values())


async def download_album(album_id: str, task_id: str):
  try:
    # 更新任务状态
    download_tasks[task_id]["status"] = "downloading"

    # 创建下载选项
    option = jmcomic.JmOption.default()

    # 开始下载
    album, downloader = jmcomic.download_album(album_id, option)

    # 更新任务状态
    download_tasks[task_id].update(
        {
            "status": "completed",
            "end_time": datetime.now().isoformat(),
            "album_info":
                {
                    "id": album.id,
                    "name": album.name,
                    "author": album.author,
                    "page_count": album.page_count
                }
        }
    )

  except Exception as e:
    # 更新任务状态为失败
    download_tasks[task_id].update(
        {
            "status": "failed",
            "error": str(e),
            "end_time": datetime.now().isoformat()
        }
    )


if __name__ == "__main__":
  import uvicorn
  uvicorn.run(app, host="0.0.0.0", port=8000)
