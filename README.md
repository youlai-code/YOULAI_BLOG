# YOULAI NOTE | 又来的技术笔记

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-43853d.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-000000.svg?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

*"Take Your Heart"* —— 致敬《女神异闻录5 皇家版》(Persona 5 Royal) 风格的个人技术博客系统

🌐 **在线预览**：[https://youlainote.cn/](https://youlainote.cn/)
🌐 **开源地址**：[https://github.com/youlai-code/YOULAI_BLOG](https://github.com/youlai-code/YOULAI_BLOG)

本项目完全开源，欢迎自由使用与魔改。目前系统正处于敏捷迭代期，并非最终形态，部署门槛可能略高。详细的部署指南将在正式版发布时同步奉上，感谢您的关注与耐心！

---
**网站截图**：

![Project Screenshot](assets/image.png)

## 项目简介

**YOULAI NOTE** 是一个极具视觉冲击力的全栈博客系统。它摒弃了传统的极简风，大胆采用了 P5R 的红黑配色与怪盗团美学，旨在为技术写作注入一份热血与个性。

基于 **Node.js + Express** 构建，采用模块化架构设计，轻量高效，专注于内容创作与阅读体验。

## ✨ 核心特色

| 特性 | 说明 |
| :--- | :--- |
|  **P5R 视觉风格** | 深度复刻红黑黄配色、动态遮罩、倾斜UI与独特的字体排印 |
|  **沉浸式写作** | 内置 Markdown 编辑器，支持实时预览、代码高亮与数学公式 |
|  **AI 灵感辅助** | 集成 DeepSeek API，一键生成文章标题、摘要与智能标签 |
|  **全端适配** | 响应式布局，无论在桌面大屏还是移动端都能完美呈现 |
|  **纯粹技术栈** | 原生 JavaScript + CSS3 打造，无繁重框架依赖，极速加载 |
|  **模块化架构** | 清晰的分层设计，易于维护和扩展 |

## 🛠️ 技术栈

### **Frontend**

- **Core**: HTML5, CSS3, Vanilla JavaScript
- **Rendering**: Marked.js (Markdown), Prism.js (Code), MathJax (Math)
- **Design**: Custom P5R Theme System

### **Backend**

- **Runtime**: Node.js
- **Framework**: Express.js
- **Architecture**: Modular Design (Routes / Services / Middlewares / Utils)
- **Storage**: Markdown Files (Flat File CMS)
- **Cloud**: Cloudflare R2 (Image Storage)
- **AI**: DeepSeek API

## 📁 项目结构

```
YOULAI_BLOG/
├── server.js                 # 入口文件
├── backup_service.js         # 备份服务
├── src/
│   └── server/
│       ├── index.js          # 服务器启动
│       ├── app.js            # Express 应用配置
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
│       │   ├── admin.service.js
│       │   ├── r2.service.js
│       │   └── ai.service.js
│       └── routes/           # 路由层
│           ├── posts.routes.js
│           ├── comments.routes.js
│           ├── columns.routes.js
│           ├── admin.routes.js
│           └── upload.routes.js
├── public/
│   ├── index.html            # 首页
│   ├── admin.html            # 管理后台
│   ├── post.html             # 文章详情页
│   ├── posts/                # Markdown 文章存储
│   ├── css/                  # 样式文件
│   └── js/                   # 前端脚本
└── .env                      # 环境变量配置
```

## ⚙️ 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# 管理员密码 (必填)
ADMIN_PASSWORD=your_secure_password

# DeepSeek AI (可选，用于 AI 辅助生成)
DEEPSEEK_API_KEY=your_deepseek_api_key

# Cloudflare R2 图片存储 (可选)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_DOMAIN=https://img.yourdomain.com

# 站点配置 (可选)
SITE_URL=https://yourdomain.com
BASE_DOMAIN=yourdomain.com
PORT=3000
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
node server.js

# 访问
# 首页: http://localhost:3000
# 后台: http://localhost:3000/admin.html
```

## 📡 API 接口

### 公开接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| GET | `/posts.json` | 获取文章列表 |
| GET | `/sitemap.xml` | 获取站点地图 |
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
| GET | `/api/admin/comments` | 获取待审评论 |
| POST | `/api/admin/comments/moderate` | 审核评论 |
| POST | `/api/upload` | 上传文章 |
| POST | `/api/delete` | 删除文章 |
| POST | `/api/upload-image` | 上传图片到 R2 |
| POST | `/api/ai-generate` | AI 生成元数据 |

---

<div align="center">
  <p>Created with ❤️ by Youlai</p>
  <p>© 2024 YOULAI_BLOG. All Rights Reserved.</p>
</div>
