# Paper AI Reader

Paper AI Reader 是一个本地自用的轻量论文阅读器。第一阶段目标是完成 monorepo 初始化，并跑通基础前端页面、FastAPI 服务、SQLite 本地数据库目录和后续 PDF/AI 功能的项目骨架。

暂时不做登录系统。

## 技术栈

- Frontend: React + TypeScript + Vite
- Backend: Python FastAPI
- Database: SQLite + SQLModel
- PDF parsing: PyMuPDF
- Vector index: Chroma
- HTTP client: httpx

## 目录结构

```text
paper-ai-reader/
├─ frontend/          React + TypeScript + Vite
├─ backend/           FastAPI backend
├─ data/
│  ├─ papers/         PDF 文件
│  ├─ thumbnails/     缩略图
│  ├─ cache/          缓存
│  └─ vector_index/   向量索引
├─ docs/              设计文档
└─ README.md
```

## 后端启动

后端默认运行在 `http://localhost:8000`。

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

启动后打开：

- API 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`

`DATABASE_URL` 留空时会自动使用项目根目录下的 `data/app.db`。

## 前端启动

前端默认运行在 `http://localhost:5173`。

```bash
cd frontend
npm install
npm run dev
```

Vite 已配置 `/api` 代理到 `http://127.0.0.1:8000`。

## Docker Compose

```bash
docker compose up
```

这会启动前端和后端开发服务。
