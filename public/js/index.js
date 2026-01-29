// js/index.js

// 全局变量
let allPostsCache = [];
let currentFilteredPosts = []; // 当前筛选后的所有文章
let currentPage = 1;
const ITEMS_PER_PAGE = 6; // 每页显示几篇文章

// 配置 Marked 全局渲染器 (修复标题 ID 和样式问题)
if (window.marked) {
    marked.use({
        renderer: {
            heading(text, level, raw) {
                // 兼容性处理：如果 text 是对象
                if (typeof text === 'object' && text !== null) {
                    text = text.text || raw || '';
                }
                // 确保 text 是字符串
                if (typeof text !== 'string') {
                    text = String(text || '');
                }
                const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                return `<h${level} id="${id}">${text}</h${level}>`;
            }
        }
    });
}

// 1. 初始化
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    const container = document.getElementById('blog-list-container');

    // 0. 优先加载配置 (确定权限和UI)
    try {
        const cfgRes = await fetch('config.json');
        if (cfgRes.ok) {
            const config = await cfgRes.json();
            // 设置权限
            window.IS_ADMIN = config.features?.enableEditor === true || localStorage.getItem('YOULAI_ADMIN') === 'true';
            // 应用配置到界面
            applySiteConfig(config);
        }
    } catch (e) {
        console.error("Config load failed:", e);
    }

    try {
        const res = await fetch('posts.json');
        if (!res.ok) throw new Error("JSON NOT FOUND");
        allPostsCache = await res.json();

        // 初始状态：显示所有文章
        currentFilteredPosts = allPostsCache;
        renderPage(1);
    } catch (err) {
        container.innerHTML = `
            <div style="background:var(--p5-black); color:white; padding:20px; border:2px solid red; transform:rotate(-2deg);">
                <h2 style="font-family:'Bangers'; color:red;">连接错误</h2>
                <p>无法连接到 Phantom Network (posts.json).</p>
                <p>请确保已运行: node server.js</p>
            </div>
        `;
    }
}

// 加载社交媒体链接和站点配置
function applySiteConfig(config) {
    try {
        // --- 0. 权限控制 UI ---
        const btnAddBlog = document.getElementById('btn-add-blog');
        if (btnAddBlog) {
            btnAddBlog.style.display = window.IS_ADMIN ? 'inline-block' : 'none';
        }

        // --- 1. 加载 Owner 信息 ---
        if (config.owner) {
            const avatarEl = document.getElementById('owner-avatar');
            const nameEl = document.getElementById('owner-name');
            const titleEl = document.getElementById('owner-title');
            const bioEl = document.getElementById('owner-bio');

            if (avatarEl && config.owner.avatar) {
                // 如果不是绝对路径且不以/开头，尝试自动修正（假设在根目录）
                let src = config.owner.avatar;
                if (!src.startsWith('http') && !src.startsWith('/')) {
                    src = '/' + src;
                }
                avatarEl.src = src;
            }
            if (nameEl && config.owner.name) nameEl.innerText = config.owner.name;
            if (titleEl && config.owner.title) titleEl.innerText = config.owner.title;
            if (bioEl && config.owner.bio) bioEl.innerText = config.owner.bio;
        }

        // --- 2. 加载 Footer 信息 ---
        if (config.footer) {
            if (config.footer.marquee) {
                const marqueeContent = document.querySelector('.marquee-content');
                if (marqueeContent) {
                    marqueeContent.innerText = config.footer.marquee;
                }
            }
            if (config.footer.copyright) {
                const copyrightEl = document.getElementById('footer-copyright');
                if (copyrightEl) {
                    copyrightEl.innerText = config.footer.copyright;
                }
            }
        }

        // --- 3. 加载 Social 链接 ---
        const container = document.getElementById('social-links-container');
        if (!container || !config.social) return;

        // 生成社交媒体图标
        container.innerHTML = '';
        const emailBox = document.getElementById('email-display');
        const emailText = document.getElementById('email-text');

        Object.entries(config.social).forEach(([key, social]) => {
            // 特殊处理邮箱：显示为文本
            if (key === 'email') {
                if (emailBox && emailText) {
                    emailBox.style.display = 'block';
                    // 移除 mailto: 前缀显示
                    const displayEmail = social.url.replace('mailto:', '');
                    emailText.innerText = displayEmail;
                }
                return;
            }

            const link = document.createElement('a');
            link.href = social.url;
            link.className = 'social-link';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = social.label;
            link.innerHTML = `<i class="${social.icon}"></i>`;
            container.appendChild(link);
        });

    } catch (err) {
        console.error('Failed to load site config:', err);
    }
}


// 2. 核心：渲染所有文章（已移除分页）
function renderPage(page) {
    const container = document.getElementById('blog-list-container');

    container.innerHTML = '';

    if (currentFilteredPosts.length === 0) {
        container.innerHTML = `<h2 style="color:white; font-family:'Bangers'; margin-top:50px;">未找到数据...</h2>`;
        return;
    }

    // 渲染所有文章
    container.style.opacity = 0;
    currentFilteredPosts.forEach(post => {
        let tagsDisplay = Array.isArray(post.tags) ? post.tags.join(' / ') : post.tags;

        let adminActions = '';
        if (window.IS_ADMIN) {
            adminActions = `
            <div class="card-actions">
                <button class="action-mini-btn btn-edit" 
                    onclick="event.stopPropagation(); location.href='editor.html?id=${post.id}'">
                    EDIT
                </button>
                <button class="action-mini-btn btn-del" 
                    onclick="event.stopPropagation(); deletePost('${post.id}')">
                    DELETE
                </button>
            </div>`;
        }

        const html = `
    <article class="post-entry">
        <div class="post-link-overlay" onclick="showPost('${post.id}')" title="${post.title}"></div>
        ${post.cover ? `<div class="post-cover" style="background-image: url('${post.cover}');"></div>` : ''}
        <div class="post-content-wrap">
            <div class="post-meta">${post.date} <span class="post-tag">${tagsDisplay}</span></div>
            <h2 class="post-title">${post.title}</h2>
            <p class="post-summary">${post.summary}</p>
        </div>
        ${adminActions}
    </article>
`;
        container.innerHTML += html;
    });

    // 淡入动画
    setTimeout(() => { container.style.opacity = 1; }, 50);
}

// 3. 翻页功能（已移除，保留函数避免错误）
function changePage(direction) {
    // 不再需要翻页
}

// 4. 筛选功能
function filterPosts(category) {
    // 退出文章模式（如果在）
    exitPostMode();

    // 按钮高亮逻辑
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtnId = category === 'HOME' ? 'btn-home' : `btn-${category.toLowerCase()}`;
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');

    // 筛选逻辑
    if (category === 'HOME') {
        currentFilteredPosts = allPostsCache;
    } else {
        currentFilteredPosts = allPostsCache.filter(post => {
            const tagsStr = Array.isArray(post.tags) ? post.tags.join(' ') : post.tags;
            return tagsStr.toLowerCase().includes(category.toLowerCase());
        });
    }

    // 重置到第一页并渲染
    renderPage(1);
}

// 5. 搜索功能
function searchPosts(keyword) {
    // 取消所有分类按钮的高亮
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    if (!keyword || keyword.trim() === '') {
        // 如果搜索为空，恢复到 HOME 状态
        document.getElementById('btn-home').classList.add('active');
        currentFilteredPosts = allPostsCache;
    } else {
        const lowerKeyword = keyword.toLowerCase().trim();
        currentFilteredPosts = allPostsCache.filter(post => {
            const titleMatch = post.title.toLowerCase().includes(lowerKeyword);
            const summaryMatch = post.summary.toLowerCase().includes(lowerKeyword);
            const tagsMatch = Array.isArray(post.tags) ?
                post.tags.join(' ').toLowerCase().includes(lowerKeyword) :
                post.tags.toLowerCase().includes(lowerKeyword);

            return titleMatch || summaryMatch || tagsMatch;
        });
    }

    renderPage(1);
}

// 6. 发现页：标签云
function showDiscoveryPage() {
    // 退出文章模式
    exitPostMode();

    // 1. 按钮高亮
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    const discoveryBtn = document.getElementById('btn-discovery');
    if (discoveryBtn) discoveryBtn.classList.add('active');

    // 2. 统计标签
    const tagCounts = {};
    allPostsCache.forEach(post => {
        let tags = [];
        if (Array.isArray(post.tags)) {
            tags = post.tags;
        } else if (typeof post.tags === 'string') {
            tags = post.tags.split(/[\s,]+/);
        }
        
        tags.forEach(tag => {
            const cleanTag = tag.trim().toUpperCase();
            if (cleanTag) {
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
        });
    });

    // 3. 渲染标签云
    const container = document.getElementById('blog-list-container');
    container.innerHTML = '';
    container.style.opacity = 0;

    const cloudWrapper = document.createElement('div');
    cloudWrapper.className = 'discovery-cloud';
    // 内联样式，保持 Phantom 风格
    cloudWrapper.style.padding = '40px';
    cloudWrapper.style.display = 'flex';
    cloudWrapper.style.flexWrap = 'wrap';
    cloudWrapper.style.justifyContent = 'center';
    cloudWrapper.style.gap = '25px';

    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

    // 计算最大最小 count 用于缩放
    let maxCount = 0;
    let minCount = Infinity;
    sortedTags.forEach(([tag, count]) => {
        if (count > maxCount) maxCount = count;
        if (count < minCount) minCount = count;
    });

    if (sortedTags.length === 0) {
        cloudWrapper.innerHTML = `<h2 style="color:white; font-family:'Bangers';">暂无标签...</h2>`;
    } else {
        sortedTags.forEach(([tag, count]) => {
            const sticker = document.createElement('div');
            // 随机旋转角度 (-5 ~ 5度)
            const rotate = (Math.random() * 10 - 5).toFixed(1);
            
            // 计算字体大小 (1.2rem ~ 3rem)
            let fontSize = 1.2;
            if (maxCount > minCount) {
                fontSize = 1.2 + ((count - minCount) / (maxCount - minCount)) * 1.8; 
            } else {
                fontSize = 1.5; // 只有一个数量级时
            }
            
            // 样式定义
            sticker.style.cssText = `
                background: var(--p5-yellow);
                color: var(--p5-black);
                padding: 10px 25px;
                font-family: 'SimHei', 'Microsoft YaHei', sans-serif; /* 黑体 */
                font-weight: 900;
                font-size: ${fontSize}rem;
                cursor: pointer;
                box-shadow: 4px 4px 0px rgba(0,0,0,0.5);
                border: 3px solid black;
                transform: rotate(${rotate}deg);
                transition: transform 0.2s, box-shadow 0.2s;
                position: relative;
                user-select: none;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            sticker.innerHTML = `
                <span>${tag}</span>
                <span style="
                    background: var(--p5-red);
                    color: white;
                    border-radius: 12px;
                    padding: 0 8px;
                    font-size: 0.6em; /* 相对主字体缩小 */
                    border: 2px solid black;
                    font-family: 'Bangers', sans-serif;
                    min-width: 20px;
                    text-align: center;
                ">${count}</span>
            `;

            // 交互效果
            sticker.onmouseover = () => { 
                sticker.style.transform = `scale(1.1) rotate(${rotate}deg)`; 
                sticker.style.zIndex = 10;
            };
            sticker.onmouseout = () => { 
                sticker.style.transform = `rotate(${rotate}deg)`; 
                sticker.style.zIndex = 1;
            };
            sticker.onclick = () => {
                // 点击标签 -> 搜索该标签
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = tag;
                searchPosts(tag);
            };

            cloudWrapper.appendChild(sticker);
        });
    }

    container.appendChild(cloudWrapper);
    
    // 淡入动画
    setTimeout(() => { container.style.opacity = 1; }, 50);
}

// 7. 关于页：动态加载
async function showAboutPage() {
    // 退出文章模式（确保目录隐藏等）
    exitPostMode();

    // 1. 按钮高亮
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    const aboutBtn = document.getElementById('btn-about');
    if (aboutBtn) aboutBtn.classList.add('active');

    const container = document.getElementById('blog-list-container');
    container.style.opacity = 0;
    container.innerHTML = `<h2 style="color:white; font-family:'Bangers'; text-align:center; margin-top:50px;">LOADING DATA...</h2>`;

    try {
        const response = await fetch('/posts/about.md');
        if (!response.ok) throw new Error("About page not found");
        
        let text = await response.text();
        
        // 0. 解析并移除 YAML Frontmatter
        let metadata = {};
        const frontMatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---/;
        const match = text.match(frontMatterRegex);
        
        if (match) {
            // 简单的 YAML 解析
            const yaml = match[1];
            yaml.split('\n').forEach(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    // 处理数组 [a, b]
                    if (value.startsWith('[') && value.endsWith(']')) {
                            metadata[key] = value.slice(1, -1).split(',').map(s => s.trim());
                    } else {
                            metadata[key] = value;
                    }
                }
            });
            // 从正文中移除 Frontmatter
            text = text.replace(match[0], '');
        }

        // 1. 解析 MD -> HTML
        const htmlContent = marked.parse(text);

        // 2. 渲染
        container.innerHTML = `
            <div class="markdown-body paper-pattern-white" style="padding:40px; box-shadow:10px 10px 0 var(--p5-black); border-top:5px solid var(--p5-black);">
                ${htmlContent}
            </div>
        `;

        // 3. 修正图片路径
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            // 如果不是网络图片(http)且不是绝对路径(/)
            if (!src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
                img.src = '/posts/' + src; 
            }
        });

        // 4. 代码高亮
        if (window.Prism) {
            Prism.highlightAllUnder(container);
        }

        // 淡入动画
        setTimeout(() => { container.style.opacity = 1; }, 50);

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="background:var(--p5-black); color:white; padding:20px; border:2px solid red;">
                <h2 style="font-family:'Bangers'; color:red;">ERROR 404</h2>
                <p>Failed to load About page.</p>
            </div>
        `;
        container.style.opacity = 1;
    }
}

// js/index.js 中的 deletePost 函数

async function deletePost(id) {
    // 使用 Phantom.confirm 替代原生 confirm
    // 参数：提示文字，点击确定的回调函数，标题
    Phantom.confirm("ARE YOU SURE TO DELETE THIS LOG? (Irreversible)", async () => {

        // --- 原有的删除逻辑开始 ---
        try {
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });

            const result = await res.json();

            if (result.success) {
                // 更新本地缓存并重新渲染
                allPostsCache = allPostsCache.filter(p => p.id !== id);

                // 刷新当前分类的过滤列表
                const currentCategory = document.querySelector('.menu-btn.active').id.replace('btn-', '').toUpperCase();
                if (currentCategory === 'HOME') {
                    currentFilteredPosts = allPostsCache;
                } else {
                    currentFilteredPosts = currentFilteredPosts.filter(p => p.id !== id);
                }

                // 如果当前页数据空了，且不是第一页，就往前翻
                if (currentFilteredPosts.length > 0) {
                    const totalPages = Math.ceil(currentFilteredPosts.length / ITEMS_PER_PAGE);
                    if (currentPage > totalPages) currentPage = totalPages;
                } else {
                    // 如果删光了
                    currentPage = 1;
                }

                renderPage(currentPage);

                // 可选：删除成功也弹个提示
                // Phantom.alert("Target Eliminated.", "SUCCESS"); 

            } else {
                Phantom.alert("DELETE FAILED: " + result.message, "ERROR"); // 替换原生 alert
            }
        } catch (err) {
            Phantom.alert("NETWORK ERROR: Is server running?", "ERROR"); // 替换原生 alert
            console.error(err);
        }
        // --- 原有的删除逻辑结束 ---

    }, "WARNING"); // 弹窗标题
}

// 退出文章阅读模式
function exitPostMode() {
    const tocWidget = document.getElementById('toc-widget');
    const webmasterWidget = document.getElementById('webmaster-widget');
    const containerDiv = document.querySelector('.container');
    
    if (tocWidget) {
        tocWidget.style.display = 'none';
        // 还原标题样式，避免污染
        const titleEl = tocWidget.querySelector('.widget-title');
        if (titleEl) {
            titleEl.innerHTML = '目录';
            titleEl.style.display = '';
            titleEl.style.justifyContent = '';
            titleEl.style.alignItems = '';
        }
    }
    if (webmasterWidget) webmasterWidget.style.display = 'block';
    if (containerDiv) containerDiv.classList.remove('post-reading-mode');
}

// 8. SPA 文章阅读：动态加载
async function showPost(postId) {
    // 1. 取消所有分类按钮的高亮（可选，或者保留当前高亮）
    // document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    const container = document.getElementById('blog-list-container');
    container.style.opacity = 0;
    container.innerHTML = `<h2 style="color:white; font-family:'Bangers'; text-align:center; margin-top:50px;">LOADING DATA...</h2>`;

    try {
        const response = await fetch(`/posts/${postId}.md`);
        if (!response.ok) throw new Error("Post not found");
        
        let text = await response.text();
        
        // 0. 解析并移除 YAML Frontmatter
        const frontMatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---/;
        const match = text.match(frontMatterRegex);
        let title = 'Blog Post';
        let date = '';
        
        if (match) {
            // 解析简单的元数据用于显示标题
            const yaml = match[1];
            yaml.split('\n').forEach(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    if (key === 'title') title = value.replace(/^['"]|['"]$/g, '');
                    if (key === 'date') date = value.replace(/^['"]|['"]$/g, '');
                }
            });
            // 从正文中移除 Frontmatter
            text = text.replace(match[0], '');
        }

        // --- 目录生成 (TOC) ---
        // 使用 marked.lexer 获取 tokens
        const tokens = marked.lexer(text);
        const tocList = [];
        
        // 遍历 tokens 找 heading
        tokens.forEach(token => {
            if (token.type === 'heading') {
                tocList.push({
                    text: token.text,
                    depth: token.depth,
                    id: token.text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 简易 slug
                });
            }
        });

        // 生成 TOC HTML
        let tocHtml = '<ul style="list-style:none; padding-left:0;">';
        tocList.forEach(item => {
            // 简单缩进
            const padding = (item.depth - 1) * 15;
            tocHtml += `<li style="margin-bottom:8px; padding-left:${padding}px;">
                <a href="#${item.id}" onclick="setTimeout(() => document.getElementById('${item.id}').scrollIntoView({behavior: 'smooth'}), 100); return false;" 
                   style="color:var(--p5-white); text-decoration:none; font-size:0.9rem; transition:color 0.2s;"
                   onmouseover="this.style.color='var(--p5-yellow)'" 
                   onmouseout="this.style.color='var(--p5-white)'">
                   ${item.text}
                </a>
            </li>`;
        });
        tocHtml += '</ul>';

        // 注入 TOC 到侧边栏
        const tocWidget = document.getElementById('toc-widget');
        const tocContent = document.getElementById('toc-content');
        const webmasterWidget = document.getElementById('webmaster-widget');
        const sidebar = document.getElementById('main-sidebar');
        const containerDiv = document.querySelector('.container');

        if (tocWidget && tocContent) {
            tocContent.innerHTML = tocHtml;
            tocWidget.style.display = 'block';
            if (webmasterWidget) webmasterWidget.style.display = 'none';
            
            // 调整布局类名
            containerDiv.classList.add('post-reading-mode');

            // --- 注入返回按钮到 Widget Title ---
            const titleEl = tocWidget.querySelector('.widget-title');
            if (titleEl) {
                titleEl.style.display = 'flex';
                titleEl.style.justifyContent = 'space-between';
                titleEl.style.alignItems = 'center';
                
                titleEl.innerHTML = `
                    <span>目录</span>
                    <button onclick="exitPostMode(); renderPage(currentPage);" 
                        style="background:transparent; color:white; border:1px solid white; 
                               padding:2px 8px; cursor:pointer; font-family:'Bangers'; font-size:0.8rem;
                               transition: all 0.2s;"
                        onmouseover="this.style.background='var(--p5-red)'; this.style.borderColor='var(--p5-red)';"
                        onmouseout="this.style.background='transparent'; this.style.borderColor='white';">
                        <i class="fas fa-undo"></i> BACK
                    </button>
                `;
            }
        }

        // 1. 解析 MD -> HTML
        const htmlContent = marked.parse(text);

        // 2. 渲染 (去除原来的返回按钮)
        container.innerHTML = `
            <div class="markdown-body paper-pattern-white" style="padding:40px; box-shadow:10px 10px 0 var(--p5-black); border-top:5px solid var(--p5-black);">
                <h1 style="border-bottom:3px solid black; padding-bottom:10px; margin-bottom:20px;">${title}</h1>
                <div style="color:#666; margin-bottom:30px; font-weight:bold;">${date}</div>
                ${htmlContent}
            </div>
        `;

        // 3. 修正图片路径
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (!src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
                img.src = '/posts/' + src; 
            }
        });

        // 4. 代码高亮
        if (window.Prism) {
            Prism.highlightAllUnder(container);
        }

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 淡入动画
        setTimeout(() => { container.style.opacity = 1; }, 50);

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="background:var(--p5-black); color:white; padding:20px; border:2px solid red;">
                <h2 style="font-family:'Bangers'; color:red;">ERROR 404</h2>
                <p>Failed to load post.</p>
                <button onclick="exitPostMode(); renderPage(1)" style="margin-top:10px; padding:5px 10px;">Back</button>
            </div>
        `;
        container.style.opacity = 1;
    }
}
