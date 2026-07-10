# SLink

SLink 是一个基于 Cloudflare Pages、Pages Functions 和 Workers KV 的短链接与 Markdown 便签服务。

生产地址：<https://slink.canghai.org>

## 功能

- 创建随机或自定义短链接
- 创建 Markdown 便签
- 提供便签预览页和原始 `.md` 地址
- 支持 GitHub Flavored Markdown
- 支持代码块复制和基础语法高亮
- 响应式页面

## 架构

静态页面由 Cloudflare Pages 托管，接口和动态路由由 Pages Functions 处理，数据存储在 Workers KV。

```text
Browser
  ├── POST /shorten       创建短链接
  ├── POST /note          创建便签
  ├── GET  /{slug}        短链跳转或便签预览
  └── GET  /{slug}.md     获取原始 Markdown

Pages Functions
  └── Workers KV
```

便签预览页不嵌入正文。浏览器打开 `/{slug}` 后，再请求 `/{slug}.md` 并在前端完成 Markdown 渲染。

## 数据模型

短链接：

```text
key:   url:{slug}
value: https://example.com/path
```

便签：

```text
key:   note:{slug}
value: 原始 Markdown
```

便签标题和创建时间存放在同一个 KV 键的 metadata 中：

```json
{
  "title": "部署记录",
  "createdAt": "2026-07-11T08:00:00.000Z"
}
```

## 目录

```text
.
├── assets/
│   ├── css/                页面样式
│   └── js/                 浏览器端代码
├── functions/
│   ├── _lib/               服务端公共模块
│   ├── [slug].js           动态路由
│   ├── note.js             便签接口
│   └── shorten.js          短链接口
├── index.html
└── wrangler.toml
```

## API

### 创建短链接

```http
POST /shorten
Content-Type: application/json
```

```json
{
  "url": "https://example.com/docs",
  "customSlug": "docs"
}
```

`customSlug` 可省略，只允许字母、数字、下划线和连字符。

```json
{
  "success": true,
  "slug": "docs",
  "originalUrl": "https://example.com/docs",
  "createdAt": "2026-07-11T08:00:00.000Z",
  "shortUrl": "https://slink.canghai.org/docs"
}
```

### 创建便签

```http
POST /note
Content-Type: application/json
```

```json
{
  "title": "部署记录",
  "content": "# 标题\n\nMarkdown 正文"
}
```

标题最多 160 个字符，正文最多 500,000 个字符。

```json
{
  "success": true,
  "slug": "a1b2",
  "title": "部署记录",
  "createdAt": "2026-07-11T08:00:00.000Z",
  "noteUrl": "https://slink.canghai.org/a1b2",
  "markdownUrl": "https://slink.canghai.org/a1b2.md"
}
```

### 错误格式

```json
{
  "error": "错误说明"
}
```

## 本地开发

需要 Node.js 22 或更高版本。

```bash
npx --yes wrangler@4.110.0 pages dev . --kv SLINK_KV
```

本地 KV 与生产数据隔离。

## 部署

项目通过 GitHub 连接 Cloudflare Pages 自动部署。

部署前需要创建 Workers KV namespace，并确保绑定名称为 `SLINK_KV`。当前 `wrangler.toml` 使用 KV namespace ID 管理绑定：

```toml
name = "slink"
compatibility_date = "2024-01-01"
pages_build_output_dir = "."

[[kv_namespaces]]
binding = "SLINK_KV"
id = "<KV_NAMESPACE_ID>"
```

推送到生产分支后，Cloudflare Pages 会读取该配置并完成部署。

## Markdown 渲染

预览页使用以下固定版本依赖：

- `marked@17.0.1`
- `DOMPurify@3.3.1`
- `lxgw-wenkai-screen-web@1.522.0`

Markdown 经过 DOMPurify 处理后写入页面。正文使用 LXGW WenKai Screen，代码使用 LXGW WenKai Mono Screen。

## 数据兼容性

当前版本只支持上述单键数据格式，不兼容旧版 JSON 或双键便签数据。
