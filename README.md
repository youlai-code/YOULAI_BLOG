# YOULAI NOTE | 又来的技术笔记

一个致敬《女神异闻录5 皇家版》(Persona 5 Royal) 风格的个人技术博客系统
![alt text](image.png)
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
 - **Markdown + YAML Frontmatter** - 文章数据存储
 - **Cloudflare R2** - 图片云存储
