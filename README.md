# 智慧农业 - 基于YOLO的植物病害检测系统

这是一个完整的端到端系统，包含基于FastAPI的Python后端和基于原生HTML/CSS/JS（TailwindCSS）的现代化前端。该系统允许用户上传图片，通过YOLO模型进行病害实时检测，并在前端显示带边框的图片和识别出的病害类别。系统还支持历史检测记录管理和数据库存储功能。

## 项目结构
- `backend/`：包含FastAPI服务器和模型加载逻辑。
  - `model/`：请将你训练好的YOLO模型（`best.pt`）放在此目录下。
  - `uploads/`：存储上传的原始图片。
  - `results/`：存储检测结果图片。
  - `main.py`：后端服务入口，包含API endpoints。
  - `requirements.txt`：Python依赖文件。
  - `database.py`：数据库配置文件。
  - `models.py`：数据库模型定义。
  - `local_history.db`：SQLite数据库文件。
- `frontend/`：包含前端用户界面。
  - `index.html`：主页面，包含上传和历史记录标签页。
  - `app.js`：前端交互逻辑，处理上传、调用接口及展示。
  - `history.js`：历史记录页面逻辑。

## 核心功能
1. **图片上传与预览**：支持拖拽或点击上传植物叶片图片，实时预览上传的图片。
2. **病害检测**：使用YOLO模型对上传的图片进行实时推理，检测植物病害。
3. **结果展示**：在前端显示带边界框的结果图片，并列出检测到的所有病害类型、坐标及置信度。
4. **历史记录**：保存检测历史到数据库，支持查看历史检测记录。
5. **数据库存储**：使用SQLite数据库存储检测记录，包括原始图片路径、结果图片路径、检测结果等信息。

## 如何运行

### 1. 配置后端
首先，确保您安装了Python（推荐Python 3.8及以上版本）。

1. 进入后端目录：
   ```bash
   cd backend
   ```
2. （可选但推荐）创建并激活虚拟环境：
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```
3. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
4. 放置模型文件：
   请将您训练好的YOLO模型文件（`best.pt`）复制到 `backend/model/` 目录下。如果不放置，系统默认会下载一个基础的 `yolov8n.pt` 以作演示。
5. 启动FastAPI服务：
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *服务启动后，后端将在 `http://127.0.0.1:8000` 监听请求。*

### 2. 配置前端
前端是一个纯静态页面，无需复杂的编译步骤。

1. 进入前端目录：
   ```bash
   cd ../frontend
   ```
2. 运行一个简单的HTTP服务器来提供前端页面：
   ```bash
   python -m http.server 8080
   ```
   *或者您也可以直接双击浏览器打开 `index.html` 文件（由于使用了CORS，直接打开通常也是支持的，但建议通过本地服务器打开）。*

### 3. 使用系统
1. 在浏览器中打开：`http://localhost:8080`（或双击打开 `index.html`）。
2. **检测上传**标签页：
   - 在左侧面板中点击上传或拖拽植物叶片图片。
   - 点击 **开始检测** 按钮。
   - 右侧预览区将展示经YOLO模型推理后画好边界框的结果图片，左侧面板下方会列出检测到的所有病害类型、坐标及置信度。
3. **历史记录**标签页：
   - 查看过去的检测记录。
   - 点击 **刷新记录** 按钮更新历史记录列表。
   - 每条记录显示检测时间、主要病害、置信度以及结果图片。

## 技术栈
- **后端:** FastAPI, YOLOv8 (Ultralytics), OpenCV, PIL, Uvicorn, SQLAlchemy, SQLite
- **前端:** HTML5, JavaScript (Vanilla), Tailwind CSS (CDN)

## API 接口

### 1. POST /detect
- **功能**：上传图片并进行病害检测
- **参数**：
  - `file`：图片文件（必填）
  - `user_id`：用户ID（可选，默认为"anonymous"）
- **响应**：
  ```json
  {
    "success": true,
    "record_id": 1,
    "primary_disease": "Tomato Leaf Mold",
    "detections": [
      {
        "box": [100.0, 100.0, 200.0, 200.0],
        "class_id": 0,
        "class_name": "Tomato Leaf Mold",
        "confidence": 0.95
      }
    ],
    "image_base64": "base64编码的结果图片",
    "original_url": "/static/uploads/20260410_154403_49043fd6_original.jpg",
    "result_url": "/static/results/20260410_154403_49043fd6_result.jpg"
  }
  ```

### 2. GET /history
- **功能**：获取检测历史记录
- **参数**：
  - `user_id`：用户ID（可选，默认为"anonymous"）
  - `limit`：返回记录数量限制（可选，默认为20）
- **响应**：
  ```json
  {
    "success": true,
    "history": [
      {
        "id": 1,
        "date": "2026-04-10 15:44:03",
        "primary_disease": "Tomato Leaf Mold",
        "confidence": "0.95",
        "original_url": "/static/uploads/20260410_154403_49043fd6_original.jpg",
        "result_url": "/static/results/20260410_154403_49043fd6_result.jpg",
        "detections": [
          {
            "box": [100.0, 100.0, 200.0, 200.0],
            "class_id": 0,
            "class_name": "Tomato Leaf Mold",
            "confidence": 0.95
          }
        ]
      }
    ]
  }
  ```

## 注意事项
1. 系统默认使用SQLite数据库，无需额外配置。
2. 上传的图片和检测结果会保存在 `backend/uploads/` 和 `backend/results/` 目录中。
3. 如果未提供自定义模型，系统会自动下载 `yolov8n.pt` 作为默认模型，用于演示目的。
4. 对于生产环境，建议使用训练好的专用植物病害检测模型以获得更准确的结果。
