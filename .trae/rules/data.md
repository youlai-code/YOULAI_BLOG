# 数据说明

本项目采用**SQLite数据库为主、文件系统为辅**的混合数据存储方案，核心配置数据统一存储在数据库中：

| 编号 | 数据类型 | 存储位置 | 说明 |
| :--- | :--- | :--- | :--- |
| 01 | 站点配置 | SQLite - `config`表 (`site_config`键) | 包含站长信息、社交链接、页脚信息、功能开关、SEO配置等 |
| 02 | 专栏数据 | SQLite - `config`表 (`columns`键) | 存储博客专栏的分类信息，包括专栏ID、名称、描述、封面图等 |
| 03 | 作品集数据 | SQLite - `config`表 (`portfolio`键) | 存储个人项目作品信息，包括项目名称、描述、链接、标签、状态等 |
| 04 | 访问统计 | SQLite - `visits`表 | 存储网站总访问量计数 |
| 05 | 评论数据 | SQLite - `comments`表 | 存储网站留言和文章评论，支持回复功能 |
| 06 | 文章数据 | Markdown文件 (`public/posts/*.md`) | 所有博客文章以Markdown格式存储，文件名格式为`post_YYYYMMDDHHMMSS.md` |

**数据库位置**: `data/database.sqlite`

**技术栈**: better-sqlite3

### 数据库表结构

```sql
-- 访问统计表
CREATE TABLE visits (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    count INTEGER DEFAULT 0
);

-- 配置表
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 评论表
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('site', 'post')),
    postId TEXT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    contact TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    parentId TEXT,
    FOREIGN KEY (parentId) REFERENCES comments(id)
);

-- 评论表索引
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(type);
CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
```

### 数据流说明

**文章发布流程**:
1. 在`editor.html`界面编写Markdown文章
2. 文章保存到`public/posts/`目录下的`.md`文件
3. 服务器自动更新文章索引

**评论提交流程**:
1. 访客在`message-board.html`或文章详情页提交留言
2. 数据通过API保存到SQLite数据库的`comments`表
3. 管理员在`admin.html`审核评论，修改`status`字段

**配置更新流程**:
1. 管理员在`admin.html`修改配置
2. 配置数据通过API保存到SQLite数据库的`config`表
3. 前端界面通过API接口获取最新配置（实时从数据库读取）

### 数据备份

- **数据库备份**（重要）:
  - 定期备份 `data/database.sqlite` 文件
  - 建议设置自动备份策略（每日/每周）
- **文章数据**（Markdown文件）可通过Git版本控制
