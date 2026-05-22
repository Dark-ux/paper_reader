# Database Design

数据库使用 SQLite，ORM 使用 SQLModel。第一阶段以单机本地数据为主，表结构保持直观，后续再根据同步、多设备或插件能力演进。

## papers

保存 PDF 文件及其基础元数据。

- `id`: 主键
- `title`: 标题
- `authors`: 作者字符串，后续可拆为独立作者表
- `abstract`: 摘要
- `year`: 发表年份
- `doi`: DOI
- `file_name`: 原始文件名
- `file_path`: 本地保存路径
- `file_hash`: SHA-256，用于去重
- `page_count`: 页数
- `status`: 导入和解析状态
- `created_at`, `updated_at`: 时间戳

## annotations

保存 PDF 阅读时产生的标注。

- `paper_id`: 关联论文
- `page_number`: 页码，使用 1-based
- `kind`: `highlight` / `note` / `area`
- `quote`: 被标注文本
- `note`: 用户笔记
- `color`: 标注颜色
- `rects_json`: PDF 坐标区域 JSON

## collections

保存文献集合，支持简单父子层级。

## tags

保存标签名称和颜色。第一阶段可以先不做多对多关联表，等 UI 流程确定后再补。

## chunks

保存 PDF 解析后的文本块。

- `paper_id`: 关联论文
- `chunk_index`: 文本块序号
- `page_start`, `page_end`: 页码范围
- `text`: chunk 文本
- `embedding_id`: 向量索引中的引用 ID
- `metadata_json`: 额外元信息

## ai_summaries

保存 AI 生成内容，避免重复请求模型。

- `paper_id`: 关联论文
- `summary_type`: `paper_summary` / `section_summary` / `qa`
- `model`: 使用的模型名称
- `content`: 生成结果
