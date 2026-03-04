# P5R 风格配色约束

## 概述
本文档定义了 YOULAI_BLOG 项目的配色约束，灵感来源于 Persona 5 Royal (P5R) 视觉风格。该配色方案旨在保持整个应用程序的视觉一致性，同时捕捉 P5R 的独特美学。

## 核心颜色变量

### 主要配色
| 变量名称 | 十六进制值 | 颜色 | 描述 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| `--p5-red` | `#D20505` | ![#D20505](https://via.placeholder.com/20/D20505/000000?text=+) | 主要强调色 | 导航边框、高亮、活动状态 |
| `--p5-black` | `#151515` | ![#151515](https://via.placeholder.com/20/151515/ffffff?text=+) | 主背景色 | 页面背景、主要容器 |
| `--p5-grey` | `#222222` | ![#222222](https://via.placeholder.com/20/222222/ffffff?text=+) | 次要背景色 | 次要容器、悬停状态 |
| `--p5-white` | `#FAFAFA` | ![#FAFAFA](https://via.placeholder.com/20/FAFAFA/000000?text=+) | 主要文本色 | 主要文本、按钮背景 |
| `--p5-yellow` | `#FCE100` | ![#FCE100](https://via.placeholder.com/20/FCE100/000000?text=+) | 次要强调色 | 品牌元素、特殊高亮 |

### 扩展配色（编辑器界面）
| 变量名称 | 十六进制值 | 颜色 | 描述 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-primary` | `#0D0D0D` | ![#0D0D0D](https://via.placeholder.com/20/0D0D0D/ffffff?text=+) | 编辑器主背景 | 编辑器主背景 |
| `--bg-secondary` | `#141414` | ![#141414](https://via.placeholder.com/20/141414/ffffff?text=+) | 编辑器次背景 | 工具栏、面板 |
| `--bg-tertiary` | `#1A1A1A` | ![#1A1A1A](https://via.placeholder.com/20/1A1A1A/ffffff?text=+) | 编辑器第三背景 | 卡片、模态框 |
| `--border-color` | `#2A2A2A` | ![#2A2A2A](https://via.placeholder.com/20/2A2A2A/ffffff?text=+) | 编辑器边框色 | 边框、分隔线 |
| `--text-primary` | `#E8E8E8` | ![#E8E8E8](https://via.placeholder.com/20/E8E8E8/000000?text=+) | 编辑器主要文本 | 编辑器主文本 |
| `--text-secondary` | `#888888` | ![#888888](https://via.placeholder.com/20/888888/000000?text=+) | 编辑器次要文本 | 标签、提示 |
| `--text-muted` | `#555555` | ![#555555](https://via.placeholder.com/20/555555/000000?text=+) | 编辑器静音文本 | 禁用状态、占位符 |
| `--accent-red` | `#FF2A2A` | ![#FF2A2A](https://via.placeholder.com/20/FF2A2A/000000?text=+) | 编辑器红色强调 | 错误状态、破坏性操作 |
| `--accent-yellow` | `#FFD700` | ![#FFD700](https://via.placeholder.com/20/FFD700/000000?text=+) | 编辑器黄色强调 | 警告、高亮 |
| `--accent-blue` | `#4A9EFF` | ![#4A9EFF](https://via.placeholder.com/20/4A9EFF/000000?text=+) | 编辑器蓝色强调 | 信息状态、链接 |

## 颜色使用指南

### 主网站
1. **背景**
   - 使用 `--p5-black` 作为主体背景
   - 使用 `--p5-grey` 作为次要背景和悬停状态
   - 除非特定 UI 元素需要，否则避免使用白色背景

2. **文本**
   - 使用 `--p5-white` 作为主要文本
   - 必要时使用较浅的色调作为次要文本
   - 确保文本与背景有足够的对比度

3. **强调色**
   - 使用 `--p5-red` 作为主要强调色、边框和活动状态
   - 使用 `--p5-yellow` 作为品牌元素、特殊高亮和重要指示器
   - 限制强调色的使用，仅用于战略元素以保持视觉冲击力

4. **导航**
   - 导航栏：`--p5-black` 背景，底部带有 `--p5-red` 边框
   - 品牌标志：`--p5-yellow` 文本，带有 `--p5-red` 文本阴影
   - 菜单按钮：`--p5-white` 背景，`--p5-black` 文本
   - 活动菜单：`--p5-yellow` 背景，`--p5-black` 文本
   - 悬停状态：`--p5-red` 背景，`--p5-white` 文本

5. **按钮**
   - 主要按钮：`--p5-red` 背景，`--p5-white` 文本
   - 次要按钮：`--p5-white` 背景，`--p5-black` 文本
   - 特殊按钮：`--p5-yellow` 背景，`--p5-black` 文本

6. **UI 元素**
   - 搜索输入：透明背景，`--p5-white` 边框
   - 聚焦状态：`--p5-white` 背景，`--p5-black` 文本，`--p5-yellow` 边框
   - 标签：`--p5-yellow` 背景，`--p5-black` 文本
   - 状态指示器：`--p5-red` 表示活动/在线，`#666` 表示非活动

### 编辑器界面
1. **背景**
   - 使用 `--bg-primary` 作为编辑器主背景
   - 使用 `--bg-secondary` 作为工具栏和面板
   - 使用 `--bg-tertiary` 作为卡片和模态框

2. **文本**
   - 使用 `--text-primary` 作为编辑器主要文本
   - 使用 `--text-secondary` 作为标签和提示
   - 使用 `--text-muted` 作为禁用状态和占位符

3. **强调色**
   - 使用 `--accent-red` 作为错误状态和破坏性操作
   - 使用 `--accent-yellow` 作为警告和高亮
   - 使用 `--accent-blue` 作为信息状态和链接

4. **编辑器特定**
   - 品牌标志：`--accent-yellow` 文本，带有 `--accent-red` 文本阴影
   - 边框和分隔线：`--border-color`
   - 代码语法高亮：遵循 P5R 配色方案

## 视觉风格考虑

1. **对比度**
   - 保持文本和背景之间的高对比度
   - 战略性地使用强调色以吸引注意力
   - 确保在所有设备尺寸上的可读性

2. **动画**
   - 为 UI 元素使用微妙的动画
   - 融入 P5R 风格的动态元素（形状、条纹）
   - 保持动画时间和缓动的一致性

3. **排版**
   - 使用 'Bangers' 字体用于品牌元素和标题
   - 使用 'Noto Sans SC' 用于正文和 UI 元素
   - 保持一致的字体大小和间距

4. **布局**
   - 使用基于网格的布局以保持一致性
   - 融入 P5R 风格的几何形状和角度
   - 保持平衡的空白和视觉层次

## 字体使用规则

### 字体选择

#### 主要字体
| 字体名称 | 类型 | 用途 | 特点 |
| :--- | :--- | :--- | :--- |
| Bangers | 英文字体 | 品牌标志、大标题、特殊强调 | 粗体、圆润、有个性，符合 P5R 风格 |
| Noto Sans SC | 中文字体 | 正文、UI 元素、小标题 | 清晰易读，支持完整中文字符集 |

#### 代码字体
| 字体名称 | 类型 | 用途 | 特点 |
| :--- | :--- | :--- | :--- |
| Consolas | 等宽字体 | 代码块、行内代码 | 等宽设计，适合编程 |
| Monaco | 等宽字体 | 代码块、行内代码 | 清晰易读，适合长时间阅读 |
| SF Mono | 等宽字体 | 代码块、行内代码 | 现代感强，视觉效果好 |

### 字体层级

#### 主网站字体层级
| 元素 | 字体 | 大小 | 权重 | 颜色 | 行高 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 品牌标志 | Bangers | 2.5rem | 400 | `--p5-yellow` | 1.2 |
| 页面大标题 | Bangers | 2rem | 400 | `--p5-white` | 1.3 |
| 文章标题 | Noto Sans SC | 1.8rem | 700 | `--p5-white` | 1.4 |
| 小标题 | Noto Sans SC | 1.4rem | 600 | `--p5-white` | 1.4 |
| 正文 | Noto Sans SC | 1rem | 400 | `--p5-white` | 1.6 |
| 次要文本 | Noto Sans SC | 0.9rem | 400 | `#ccc` | 1.5 |
| 小文本 | Noto Sans SC | 0.8rem | 400 | `#999` | 1.4 |

#### 编辑器界面字体层级
| 元素 | 字体 | 大小 | 权重 | 颜色 | 行高 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 品牌标志 | Bangers | 1.8rem | 400 | `--accent-yellow` | 1.2 |
| 工具栏按钮 | Noto Sans SC | 0.85rem | 700 | `--text-primary` | 1.2 |
| 编辑区文本 | Consolas/Monaco | 1.05rem | 400 | `--text-primary` | 1.8 |
| 预览区标题 | Noto Sans SC | 2.5rem | 700 | `#000` | 1.2 |
| 预览区正文 | Noto Sans SC | 1.05rem | 500 | `#000` | 1.8 |
| 侧边栏标签 | Noto Sans SC | 0.8rem | 500 | `--text-secondary` | 1.4 |
| 侧边栏输入 | Noto Sans SC | 0.9rem | 400 | `--text-primary` | 1.4 |

### 中文字体使用规范

1. **字体选择**
   - 优先使用 `Noto Sans SC` 作为主要中文字体
   - 确保字体支持完整的中文字符集，包括生僻字
   - 避免使用默认的系统中文字体，以保持跨平台一致性

2. **字体大小**
   - 中文正文字体大小不小于 1rem (16px)，确保可读性
   - 标题字体大小应根据层级合理设置，避免过大或过小
   - 响应式设计中，确保在移动设备上字体大小不小于 0.875rem (14px)

3. **行高**
   - 中文正文行高建议为 1.6-1.8，确保文字间距适中
   - 标题行高建议为 1.2-1.4，保持紧凑感
   - 代码块行高建议为 1.5，确保代码可读性

4. **字间距**
   - 中文文本一般不需要额外的字间距调整
   - 标题可以适当增加字间距（0.05-0.1em）以增强视觉效果
   - 避免使用过大的字间距，以免影响阅读流畅性

5. **字体权重**
   - 正文字体使用 400-500 权重，确保清晰易读
   - 标题字体使用 600-700 权重，增强视觉层次感
   - 避免使用过细或过粗的字体权重，影响可读性

### 特殊场景字体使用

1. **代码块**
   - 使用等宽字体（Consolas/Monaco/SF Mono）
   - 字体大小建议为 0.9-1rem
   - 行高建议为 1.5
   - 背景使用深色，文本使用浅色，提高对比度

2. **引用块**
   - 使用与正文相同的字体
   - 可以适当调整字体样式（如斜体）以区分正文
   - 保持与正文一致的行高和字间距

3. **按钮文本**
   - 使用 Noto Sans SC 或 Bangers（品牌按钮）
   - 字体大小根据按钮尺寸合理设置
   - 字体权重建议为 600-700，增强可点击感
   - 文本大写，增加视觉冲击力

4. **导航菜单**
   - 使用 Noto Sans SC
   - 字体大小建议为 0.9-1rem
   - 字体权重建议为 500-600
   - 活动状态可以使用 `--p5-yellow` 高亮

### 字体加载策略

1. **字体引入**
   - 使用 Google Fonts 或其他 CDN 加载字体
   - 确保字体文件格式完整（woff2、woff 等）
   - 实现字体预加载，提高页面加载速度

2. **回退字体**
   - 为每个字体设置合理的回退字体
   - 英文：`'Bangers', cursive`
   - 中文：`'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif`
   - 代码：`'Consolas', 'Monaco', 'SF Mono', monospace`

3. **性能优化**
   - 只加载必要的字重和字符集
   - 考虑使用字体子集，减少字体文件大小
   - 实现字体加载的异步处理，避免阻塞页面渲染

### 实现示例

```css
/* 品牌标志 */
.brand-logo {
    font-family: 'Bangers', cursive;
    font-size: 2.5rem;
    font-weight: 400;
    color: var(--p5-yellow);
    text-shadow: 2px 2px 0 var(--p5-red);
}

/* 正文字体 */
body {
    font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--p5-white);
}

/* 代码字体 */
code, pre {
    font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
}

/* 按钮文本 */
.btn {
    font-family: 'Noto Sans SC', 'Bangers', cursive;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
}
```

## 实现说明

1. **CSS 变量**
   - 在 `base.css` 中将所有颜色定义为 CSS 变量
   - 在整个代码库中一致地使用这些变量
   - 避免硬编码颜色值

2. **响应式设计**
   - 确保配色方案在所有设备尺寸上都有效
   - 为移动设备调整对比度和间距
   - 在不同视口中保持视觉一致性

3. **可访问性**
   - 确保文本有足够的对比度（WCAG AA 标准）
   - 必要时提供替代配色方案
   - 使用屏幕阅读器和辅助技术进行测试

4. **维护**
   - 在本文档中记录任何颜色更改
   - 定期审查颜色使用以确保一致性
   - 添加新颜色或修改现有颜色时更新本文档

## 使用示例

```css
/* 示例：导航栏 */
.top-nav {
    background: var(--p5-black);
    border-bottom: 5px solid var(--p5-red);
}

/* 示例：品牌标志 */
.brand-logo {
    color: var(--p5-yellow);
    text-shadow: 2px 2px 0 var(--p5-red);
}

/* 示例：活动菜单按钮 */
.menu-btn.active {
    background: var(--p5-yellow);
    color: var(--p5-black);
}

/* 示例：悬停状态 */
.menu-btn:hover {
    background: var(--p5-red);
    color: var(--p5-white);
}
```

## 结论

本配色约束文档为 YOULAI_BLOG 项目提供了一份全面的指南，用于维护 P5R 风格的视觉一致性。通过遵循这些指南，开发人员可以确保视觉一致性，同时捕捉 Persona 5 Royal 的独特美学。