# YOULAI NOTE | 又来的技术笔记

<div align="center">

## **Welcome to the Metaverse of Code!**

一个致敬《女神异闻录5 皇家版》(Persona 5 Royal) 风格的个人技术博客系统
</div>

![P5R Style](https://img.shields.io/badge/Style-Persona%205%20Royal-D20505?style=for-the-badge)![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)![License](https://img.shields.io/badge/License-Personal-fce100?style=for-the-badge)



---

## 📖 项目简介

这是一个基于 **Node.js + Express** 的全栈博客系统，采用《女神异闻录5》的视觉风格设计。

**核心特色：**
- 🎨 **P5R 视觉风格** - 红黑黄配色、倾斜元素、棱角分明的设计
- ✍️ **Markdown 编辑器** - 支持 Markdown 写作、代码高亮、数学公式
- 🖼️ **图片管理** - 拖拽上传、自动清理未使用图片
- 🎯 **响应式设计** - 桌面端和移动端完美适配
- 🤖 **AI 辅助** - DeepSeek API 智能生成标题、摘要和标签

---

## 🛠️ 技术栈

### 前端
- **HTML5 / CSS3** - 模块化样式设计
- **Vanilla JavaScript** - 无框架依赖
- **Marked.js** - Markdown 渲染
- **Prism.js** - 代码语法高亮
- **MathJax** - 数学公式渲染

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **Multer** - 文件上传处理
- **DeepSeek API** - AI 辅助写作
- **dotenv** - 环境变量管理

### 数据存储
 - **Markdown + YAML Frontmatter** - `public/posts/*.md`（标题、日期、标签、摘要、封面均写在头部）
 - **API 列表接口** - 动态生成 `GET /posts.json`，后端读取 Frontmatter 汇总文章索引
 - **图片存储** - 使用 Cloudflare R2 云存储，返回可公开访问的 URL

---

## 📁 项目结构

```
YOULAI_BLOG/
├── public/                # 公共资源目录
│   ├── index.html         # 博客主页
│   ├── editor.html        # 文章编辑器页面
│   ├── post.html          # 文章详情页
│   ├── css/               # 样式文件
│   │   ├── base.css       # 基础变量和字体
│   │   ├── layout.css     # 布局和导航
│   │   ├── components.css # 组件样式
│   │   ├── posts.css      # 文章卡片样式
│   │   ├── background.css # 背景动画效果
│   │   └── editor.css     # 编辑器样式
│   ├── js/                # 前端脚本
│   │   ├── index.js       # 主页逻辑
│   │   ├── editor.js      # 编辑器逻辑
│   │   ├── cleanup.js     # 资源清理脚本
│   │   └── model.js       # 弹窗组件
│   ├── posts/             # 文章存储
│   │   └── *.md           # Markdown 文件（含 Frontmatter）
│   ├── uploads/           # 上传的图片
│   │   └── images/        # 图片文件
│   └── config.json        # 网站配置(社交链接等)
├── server.js              # Node.js 后端服务
├── cleanup.bat            # 批处理清理脚本
└── package.json           # 项目依赖
```

---

## 🚀 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/youlai-code/YOULAI_BLOG.git
cd YOULAI_BLOG
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_api_key_here

# Cloudflare R2（图片云存储）
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_DOMAIN=https://img.example.com
```

### 4. 启动服务器

```bash
node server.js
```

服务器将在 **http://localhost:3000** 启动

### 5. 访问页面

- **📝 博客主页**: http://localhost:3000/
- **⚙️ 管理后台**: http://localhost:3000/index.html
- **✍️ 文章编辑器**: http://localhost:3000/editor.html
- **📚 文章列表 API**: http://localhost:3000/posts.json
- **📄 文章内容**: http://localhost:3000/posts/<id>.md

---

## 📝 使用指南

### 创建新文章

1. 访问 http://localhost:3000/editor.html
2. 使用 Markdown 编写内容
3. 点击 **AI GENERATE** 自动生成标题、摘要和标签
4. 上传封面图片（可选）
5. 点击 **SAVE** 保存文章

### 编辑文章

1. 在管理后台点击文章卡片的 **EDIT** 按钮
2. 修改内容后点击 **SAVE**

### 删除文章

1. 在管理后台点击文章卡片的 **DELETE** 按钮
2. 确认删除

---

## 🔌 后端 API

- `GET /posts.json`：返回文章列表（由 `public/posts/*.md` 的 Frontmatter 动态生成）
- `GET /posts/:id.md`：返回指定文章的 Markdown 原文
- `POST /api/upload`：保存文章（后端写入 Frontmatter 到 `.md` 文件）
- `POST /api/delete`：删除文章（删除 `.md` 文件）
- `POST /api/ai-generate`：调用 DeepSeek 生成文章标题/摘要/标签

---

## 🎨 P5R 风格设计元素

- **配色方案**:
  - 主色: `#D20505` (P5红)
  - 辅色: `#FCE100` (P5黄)
  - 背景: `#151515` (深黑)
  - 文字: `#F0F0F0` (白色)

- **字体**:
  - 标题: **Bangers** (Google Fonts)
  - 正文: **Noto Sans SC** (中文优化)

- **视觉效果**:
  - 倾斜变换 (`transform: skewX()`)
  - 不规则裁剪 (`clip-path`)
  - 背景星星和几何动画
  - 文字滚动条(Take Your Heart!)

---

## 🔧 配置文件与数据分离

### `config.json`

位于 `public/config.json`，用于配置网站信息：

```json
{
  "owner": {
    "name": "又来",
    "title": "全栈开发者"
  },
  "social": {
    "github": { "url": "https://github.com/...", "icon": "fab fa-github" },
    "bilibili": { "url": "https://space.bilibili.com/...", "icon": "fab fa-bilibili" }
  },
  "footer": {
    "marquee": "Welcome to the Metaverse of Code! +++ ..."
  }
}
```

---

## 🚚 部署与数据分离

### Git 数据分离（防丢失、防冲突）
- `.gitignore` 忽略：`public/posts/`、`public/uploads/`、`public/config.json`
- 使用软连接在服务器上将数据目录挂载到项目内：
  ```bash
  ln -sfn /var/www/blog_data/posts ./public/posts
  ln -sfn /var/www/blog_data/uploads ./public/uploads
  ln -sf /var/www/blog_data/config.json ./public/config.json
  ```

### GitHub Actions（自动部署到 VPS）
- 在 `.github/workflows/deploy.yml` 中使用 `appleboy/ssh-action` 执行部署脚本
- 仓库 Secrets 需要配置：`HOST`、`USERNAME`、`KEY`、`PORT`

---


## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

仅供个人学习和使用，禁止商业用途。

---

## 👤 作者

- **又来** (Youlai)
- 📧 Email: tenb68@126.com
- 🔗 GitHub: [@inkmark556](https://github.com/inkmark556)
- 🎮 Bilibili: [65726055](https://space.bilibili.com/65726055)

---

