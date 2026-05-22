# Database Design

数据库使用 SQLite，ORM 使用 SQLModel。当前阶段保持轻量，但字段命名会尽量为后续 PDF 阅读、标注、AI 精读、向量检索和自定义元数据留空间。

## papers

论文主表，保存 PDF 文件信息和基础元数据。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `title` | string | 标题 |
| `authors` | text | 作者，轻量版先用文本存储 |
| `year` | integer | 年份 |
| `journal` | string | 期刊或会议 |
| `doi` | string | DOI |
| `abstract` | text | 摘要 |
| `keywords` | text | 关键词，轻量版先用文本存储 |
| `file_path` | string | 本地 PDF 路径 |
| `file_hash` | string | 文件 SHA-256，用于去重 |
| `file_name` | string | 原始文件名 |
| `file_size` | integer | 文件大小，单位 byte |
| `page_count` | integer | PDF 页数 |
| `reading_status` | string | 阅读状态，例如 `unread`、`reading`、`finished` |
| `rating` | integer | 评分 |
| `custom_fields_json` | text | 自定义扩展字段 JSON |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

`custom_fields_json` 示例：

```json
{
  "architecture": "MZI mesh",
  "device": "MZI",
  "energy_efficiency": "30 fJ/MAC",
  "limitation": "thermal drift, phase error"
}
```

## annotations

PDF 标注表。不要直接修改 PDF 文件，高亮、批注和笔记全部保存在数据库中。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `paper_id` | integer | 关联 `papers.id` |
| `page_number` | integer | PDF 页码，使用 1-based |
| `selected_text` | text | 被选中的文本 |
| `note` | text | 用户笔记 |
| `color` | string | 标注颜色 |
| `position_json` | text | PDF 坐标或区域信息 JSON |
| `annotation_type` | string | `highlight`、`note`、`area` 等 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

## chunks

AI 精读专用文本块表，用于摘要、问答、向量检索和引用定位。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `paper_id` | integer | 关联 `papers.id` |
| `page_number` | integer | chunk 所在页码 |
| `section_title` | string | 章节标题 |
| `chunk_index` | integer | 在论文内的 chunk 顺序 |
| `text` | text | chunk 文本 |
| `token_count` | integer | 估算或实际 token 数 |
| `embedding_id` | string | 向量索引中的 ID |
| `created_at` | datetime | 创建时间 |

## ai_summaries

AI 总结缓存表，避免每次打开论文都重新生成。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `paper_id` | integer | 关联 `papers.id` |
| `summary_type` | string | 总结类型，例如 `paper_summary`、`section_summary` |
| `content` | text | AI 生成内容 |
| `model_name` | string | 使用的模型名称 |
| `prompt_version` | string | prompt 模板版本 |
| `created_at` | datetime | 创建时间 |

## tags

标签表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `name` | string | 标签名 |
| `color` | string | 标签颜色 |

## paper_tags

论文和标签的多对多关联表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `paper_id` | integer | 关联 `papers.id` |
| `tag_id` | integer | 关联 `tags.id` |

## collections

文献集合表，支持简单父子层级。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer primary key | 主键 |
| `name` | string | 集合名称 |
| `description` | text | 集合描述 |
| `parent_id` | integer | 父集合 ID |

## paper_collections

论文和集合的多对多关联表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `paper_id` | integer | 关联 `papers.id` |
| `collection_id` | integer | 关联 `collections.id` |
