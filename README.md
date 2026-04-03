# 智慧农业 - 基于YOLO的植物病害检测系统

这是一个完整的端到端系统，包含基于FastAPI的Python后端和基于原生HTML/CSS/JS（TailwindCSS）的现代化前端。该系统允许用户上传图片，通过YOLO模型进行病害实时检测，并在前端显示带边框的图片和识别出的病害类别。

## 项目结构
- `backend/`: 包含FastAPI服务器和模型加载逻辑。
  - `model/`: 请将你训练好的YOLO模型（`best.pt`）放在此目录下。
  - `main.py`: 后端服务入口。
  - `requirements.txt`: Python依赖文件。
- `frontend/`: 包含前端用户界面。
  - `index.html`: 主页面。
  - `app.js`: 前端交互逻辑，处理上传、调用接口及展示。

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
2. 在左侧面板中点击上传或拖拽植物叶片图片。
3. 点击 **开始检测** 按钮。
4. 右侧预览区将展示经YOLO模型推理后画好边界框的结果图片，左侧面板下方会列出检测到的所有病害类型、坐标及置信度。

## 技术栈
- **后端:** FastAPI, YOLOv8 (Ultralytics), OpenCV, PIL, Uvicorn
- **前端:** HTML5, JavaScript (Vanilla), Tailwind CSS (CDN)
