# Paper AI Reader

一个本地优先的轻量论文阅读器，第一阶段聚焦三件事：

- 文献管理：导入 PDF、维护元数据、标签和集合。
- PDF 阅读：基于 PDF.js 的阅读工作台，支持后续标注能力。
- AI 精读：预留 PyMuPDF 解析、分块、向量索引、RAG 和本地/兼容 OpenAI API 模型调用。

## 技术栈

- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS + shadcn/ui 风格组件
- Backend: Python FastAPI
- Database: SQLite + SQLModel
- PDF: PDF.js + PyMuPDF
- AI: Chroma / 本地向量索引 + Ollama / OpenAI-compatible API
- Desktop later: Tauri

## 目录

```text
frontend/   React Web 应用
backend/    FastAPI API 服务
data/       本地数据库、PDF、缩略图、缓存和向量索引
docs/       产品、数据库和 API 设计草稿
```

## 后端启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

服务默认运行在 `http://127.0.0.1:8000`，健康检查为 `GET /health`。
`DATABASE_URL` 留空时会自动使用项目根目录下的 `data/app.db`。

AI 向量检索依赖可在实现 RAG 时再安装：

```bash
pip install -r requirements-ai.txt
```

## 前端启动

本机需要先安装 Node.js。

```bash
cd frontend
npm install
npm run dev
```

Vite 默认运行在 `http://localhost:5173`，并通过 `vite.config.ts` 将 `/api` 代理到后端。

## Docker Compose

```bash
docker compose up
```

这会启动前端和后端开发服务，并挂载当前项目目录。
