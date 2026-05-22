# API Design

后端 API 前缀默认为 `/api`。

## Health

- `GET /health`

返回服务状态。

## Papers

- `GET /api/papers`
- `POST /api/papers`
- `GET /api/papers/{paper_id}`
- `PATCH /api/papers/{paper_id}`
- `DELETE /api/papers/{paper_id}`
- `POST /api/papers/upload`

`GET /api/papers` supports `q` for basic search across `title`, `authors`, `journal`, `doi`, and `abstract`.
`POST /api/papers/upload` returns `409 Conflict` when the same PDF hash already exists.

## PDF

- `GET /api/pdf/{paper_id}/file`
- `GET /api/pdf/{paper_id}/text`

## Annotations

- `GET /api/annotations`
- `POST /api/annotations`

## Collections

- `GET /api/collections`
- `POST /api/collections`
- `POST /api/papers/{paper_id}/collections/{collection_id}`
- `DELETE /api/papers/{paper_id}/collections/{collection_id}`

## Tags

- `GET /api/tags`
- `POST /api/tags`
- `POST /api/papers/{paper_id}/tags/{tag_id}`
- `DELETE /api/papers/{paper_id}/tags/{tag_id}`

## AI

- `POST /api/ai/papers/{paper_id}/summary`
- `POST /api/ai/papers/{paper_id}/ask`

第一阶段 AI 接口先保留同步请求形式。等摘要、问答和精读流程稳定后，可以改为任务队列或后台 job。
