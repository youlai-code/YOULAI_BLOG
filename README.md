# YOULAI NOTE | 又来的技术笔记

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-43853d.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-000000.svg?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

*"Take Your Heart"* —— 致敬《女神异闻录5 皇家版》(Persona 5 Royal) 风格的个人技术博客系统

🌐 **在线预览**：[https://youlainote.cn/](https://youlainote.cn/)
🌐 **开源地址**：[https://github.com/youlai-code/YOULAI_BLOG](https://github.com/youlai-code/YOULAI_BLOG)

---

## 项目简介

**YOULAI NOTE** 是一个极具视觉冲击力的全栈博客系统。它摒弃了传统的极简风，大胆采用了 P5R 的红黑配色与怪盗团美学，旨在为技术写作注入一份热血与个性。

基于 **Node.js + Express** 构建，采用模块化架构设计，轻量高效，专注于内容创作与阅读体验。

## ✨ 核心特色

| 特性 | 说明 |
| :--- | :--- |
| **P5R 视觉风格** | 深度复刻红黑黄配色、动态遮罩、倾斜UI与独特的字体排印 |
| **沉浸式写作** | 内置 Markdown 编辑器，支持实时预览、代码高亮与数学公式 |
| **AI 灵感辅助** | 集成 DeepSeek API，一键生成文章标题、摘要与智能标签 |
| **全端适配** | 响应式布局，无论在桌面大屏还是移动端都能完美呈现 |
| **纯粹技术栈** | 原生 JavaScript + CSS3 打造，无繁重框架依赖，极速加载 |
| **模块化架构** | 清晰的分层设计，易于维护和扩展 |

## 🛠️ 技术栈

### Frontend

- **Core**: HTML5, CSS3, Vanilla JavaScript
- **Rendering**: Marked.js (Markdown), Prism.js (Code), MathJax (Math)
- **Design**: Custom P5R Theme System

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Architecture**: Modular Design (Routes / Services / Middlewares / Utils)
- **Database**: SQLite (better-sqlite3)
- **Storage**: Markdown Files (Flat File CMS)
- **Cloud**: Cloudflare R2 (Image Storage)
- **AI**: DeepSeek API

## 📁 项目结构

```
YOULAI_BLOG/
├── server.js                 # 入口文件
├── src/
│   └── server/
│       ├── index.js          # 服务器启动
│       ├── app.js            # Express 应用配置
│       ├── db/              # 数据库初始化
│       ├── utils/            # 工具函数
│       │   ├── jsonFile.js   # JSON 文件读写
│       │   ├── text.js       # 文本处理
│       │   ├── paths.js      # 路径常量
│       │   └── ids.js        # ID 生成器
│       ├── middlewares/      # 中间件
│       │   ├── auth.js       # 认证中间件
│       │   └── errorHandler.js # 错误处理
│       ├── services/         # 业务逻辑层
│       │   ├── posts.service.js
│       │   ├── comments.service.js
│       │   ├── columns.service.js
│       │   ├── portfolio.service.js
│       │   ├── config.service.js
│       │   ├── admin.service.js
│       │   ├── r2.service.js
│       │   └── ai.service.js
│       ├── routes/           # 路由层
│       │   ├── posts.routes.js
│       │   ├── comments.routes.js
│       │   ├── columns.routes.js
│       │   ├── portfolio.routes.js
│       │   ├── config.routes.js
│       │   ├── admin.routes.js
│       │   └── upload.routes.js
│       └── scripts/          # 脚本工具
│           └── migrate-comments.js
├── public/
│   ├── index.html            # 首页
│   ├── admin.html            # 管理后台
│   ├── post.html             # 文章详情页
│   ├── columns.html          # 专栏列表
│   ├── discovery.html        # 发现页面
│   ├── portfolio.html        # 作品集页面
│   ├── about.html           # 关于页面
│   ├── message-board.html    # 留言板
│   ├── editor.html          # 文章编辑器
│   ├── login.html           # 管理员登录
│   ├── posts/               # Markdown 文章存储
│   ├── css/                 # 样式文件
│   └── js/                  # 前端脚本
├── data/
│   ├── database.sqlite       # SQLite 数据库
│   └── comments.json.backup.* # 评论数据备份
├── pages.md                 # 界面说明
├── data.md                  # 数据说明
└── package.json
```

## 📡 数据存储

本项目采用**SQLite数据库为主、文件系统为辅**的混合数据存储方案：

| 数据类型 | 存储位置 | 说明 |
| :--- | :--- | :--- |
| 站点配置 | SQLite - `config`表 | 站长信息、社交链接、页脚、SEO配置等 |
| 专栏数据 | SQLite - `config`表 | 专栏分类信息 |
| 作品集数据 | SQLite - `config`表 | 项目作品信息 |
| 访问统计 | SQLite - `visits`表 | 网站访问量计数 |
| 评论数据 | SQLite - `comments`表 | 网站留言和文章评论 |
| 文章数据 | Markdown文件 | 博客文章内容 |

详见 [data.md](data.md) 和 [pages.md](pages.md)

## 📡 API 接口

### 公开接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| GET | `/posts.json` | 获取文章列表 |
| GET | `/sitemap.xml` | 获取站点地图 |
| GET | `/config.json` | 获取站点配置 |
| GET | `/portfolio.json` | 获取作品集 |
| GET | `/api/columns` | 获取专栏列表 |
| GET | `/api/comments/site` | 获取站点留言 |
| POST | `/api/comments/site` | 提交站点留言 |
| GET | `/api/comments/post/:id` | 获取文章评论 |
| POST | `/api/comments/post/:id` | 提交文章评论 |

### 管理接口 (需认证)

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/me` | 验证登录状态 |
| GET | `/api/admin/settings` | 获取管理设置 |
| POST | `/api/admin/settings` | 保存管理设置 |
| GET | `/api/admin/comments` | 获取待审评论 |
| POST | `/api/admin/comments/moderate` | 审核评论 |
| POST | `/api/upload` | 上传文章 |
| POST | `/api/delete` | 删除文章 |
| POST | `/api/upload-image` | 上传图片到 R2 |
| POST | `/api/ai-generate` | AI 生成元数据 |
| POST | `/api/columns` | 保存专栏数据 |
| POST | `/api/portfolio` | 保存作品集数据 |

## 📄 界面列表

| 编号 | 文件路径 | 界面名称 |
| :--- | :--- | :--- |
| 01 | `public/index.html` | 首页 |
| 02 | `public/admin.html` | 管理后台 |
| 03 | `public/columns.html` | 专栏列表 |
| 04 | `public/editor.html` | 文章编辑器 |
| 05 | `public/login.html` | 管理员登录 |
| 06 | `public/message-board.html` | 留言板 |
| 07 | `public/post.html` | 文章详情页 |
| 08 | `public/discovery.html` | 发现页面 |
| 09 | `public/portfolio.html` | 作品集页面 |
| 10 | `public/about.html` | 关于页面 |

---

<div align="center">
  <p>Created with ❤️ by Youlai</p>
  <p>© 2024-2026 YOULAI_BLOG. All Rights Reserved.</p>
</div>
