// js/index.js

// 全局变量
let allPostsCache = [];
let currentFilteredPosts = []; // 当前筛选后的所有文章
let currentPage = 1;
const ITEMS_PER_PAGE = 6; // 每页显示几篇文章

function getPostUrl(postId) {
    const base = window.SITE_CONFIG?.seo?.postSubdomainBase;
    if (base && typeof base === 'string' && base.trim()) {
        const host = base.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `${window.location.protocol}//${postId}.${host}/`;
    }
    return `/posts/${postId}`;
}

function goToPost(postId, hash) {
    const url = getPostUrl(postId);
    window.location.href = hash ? `${url}${hash}` : url;
}

function setHomeTopVisible(visible) {
    const el = document.getElementById('home-top');
    if (!el) return;
    el.style.display = visible ? '' : 'none';
}

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

    try {
        const [cfgRes, postsRes] = await Promise.all([
            fetch('config.json'),
            fetch('posts.json')
        ]);

        if (cfgRes.ok) {
            const config = await cfgRes.json();
            window.IS_ADMIN = config.features?.enableEditor === true || localStorage.getItem('YOULAI_ADMIN') === 'true' || Boolean(localStorage.getItem('YOULAI_ADMIN_TOKEN'));
            window.SITE_CONFIG = config;
            applySiteConfig(config);
        }

        if (!postsRes.ok) throw new Error("JSON NOT FOUND");
        allPostsCache = await postsRes.json();

        currentFilteredPosts = allPostsCache;
        
        // 只有在首页才显示文章列表
        const blogListContainer = document.getElementById('blog-list-container');
        if (blogListContainer) {
            setHomeTopVisible(true);
            renderPage(1);
        }

        setTimeout(() => {
            updateSiteStats();
            renderCategoryTags();
            renderRandomPosts();
        }, 0);

        // 处理从其他页面跳转过来的情况
        const returnPage = localStorage.getItem('returnPage');
        if (returnPage) {
            localStorage.removeItem('returnPage');
            switch (returnPage) {
                case 'discovery':
                    showDiscoveryPage();
                    break;
                case 'portfolio':
                    showPortfolioPage();
                    break;
                case 'about':
                    showAboutPage();
                    break;
                default:
                    break;
            }
        }

        // 处理搜索参数
        const params = new URLSearchParams(window.location.search);
        const postId = params.get('id');
        const searchQuery = params.get('search');
        
        if (postId) {
            await showPost(postId, false);
        } else if (searchQuery) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = searchQuery;
            searchPosts(searchQuery);
        }
    } catch (err) {
        setHomeTopVisible(true);
        if (container) {
            container.innerHTML = `
                <div style="background:var(--p5-black); color:white; padding:20px; border:2px solid red; transform:rotate(-2deg);">
                    <h2 style="font-family:'Bangers'; color:red;">连接错误</h2>
                    <p>无法连接到 Phantom Network (posts.json).</p>
                    <p>请确保已运行: node server.js</p>
                </div>
            `;
        }
    }
}

let allCategoryTags = [];

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderCategoryTags(randomize = false) {
    const container = document.getElementById('category-tags');
    const shuffleBtn = document.getElementById('shuffle-tags-btn');
    if (!container) return;

    if (allCategoryTags.length === 0) {
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
        allCategoryTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    }

    if (allCategoryTags.length === 0) {
        container.innerHTML = '<span style="color: #aaa; font-size: 0.85rem;">暂无分类</span>';
        if (shuffleBtn) shuffleBtn.style.display = 'none';
        return;
    }

    if (shuffleBtn) {
        shuffleBtn.style.display = allCategoryTags.length > 8 ? 'block' : 'none';
    }

    const displayTags = allCategoryTags.length > 8 
        ? (randomize ? shuffleArray(allCategoryTags) : allCategoryTags).slice(0, 8)
        : allCategoryTags;

    container.innerHTML = displayTags.map(([tag, count]) => {
        return `<a href="#" class="tag-item" onclick="filterPosts('${tag}'); return false;" title="${count}篇文章"># ${tag} <span style="font-size:0.7em; opacity:0.8;">(${count})</span></a>`;
    }).join('');
}

function renderRandomPosts(randomize = false) {
    const container = document.getElementById('random-posts');
    const shuffleBtn = document.getElementById('shuffle-posts-btn');
    if (!container) return;

    if (allPostsCache.length === 0) {
        container.innerHTML = '<span style="color: #aaa; font-size: 0.85rem;">暂无文章</span>';
        if (shuffleBtn) shuffleBtn.style.display = 'none';
        return;
    }

    if (shuffleBtn) {
        shuffleBtn.style.display = allPostsCache.length > 6 ? 'block' : 'none';
    }

    const displayPosts = allPostsCache.length > 6
        ? (randomize ? shuffleArray(allPostsCache) : allPostsCache).slice(0, 6)
        : allPostsCache;

    container.innerHTML = displayPosts.map(post => {
        return `<div class="random-post-item" onclick="goToPost('${post.id}')" style="padding:8px 0; border-bottom:1px dashed rgba(255,255,255,0.2); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)';" onmouseout="this.style.background='transparent';">
            <div style="font-size:0.9rem; color:var(--p5-white); font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${post.title}</div>
            <div style="font-size:0.75rem; color:#888; margin-top:4px;">${post.date || ''}</div>
        </div>`;
    }).join('');
}

async function updateSiteStats() {
    try {
        // 1. 文章数量
        const postCount = allPostsCache.length;
        document.getElementById('stat-post-count').innerText = postCount;

        // 2. 最近更新时间（只显示日期部分）
        let lastUpdate = 'N/A';
        if (allPostsCache.length > 0) {
            const sorted = [...allPostsCache].sort((a, b) => {
                const dateA = new Date(a.date.replace(/\./g, '-'));
                const dateB = new Date(b.date.replace(/\./g, '-'));
                return dateB - dateA;
            });
            // 只取日期部分（YYYY.MM.DD）
            const fullDate = sorted[0].date;
            lastUpdate = fullDate.split(' ')[0];
        }
        document.getElementById('stat-last-update').innerText = lastUpdate;

        // 3. 访问量 (调用后端接口)
        const res = await fetch('/api/visit');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('stat-visit-count').innerText = data.count;
        }
    } catch (e) {
        console.error('Update stats failed:', e);
    }
}

// 加载社交媒体链接和站点配置
function applySiteConfig(config) {
    try {
        // --- 0. 权限控制 UI ---
        const adminButtons = document.getElementById('admin-buttons');
        if (adminButtons) adminButtons.style.display = window.IS_ADMIN ? 'flex' : 'none';

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

        Object.entries(config.social).forEach(([key, social]) => {
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


// 2. 核心：渲染文章（分页）
function renderPage(page) {
    const container = document.getElementById('blog-list-container');

    container.innerHTML = '';

    if (currentFilteredPosts.length === 0) {
        container.innerHTML = `<h2 style="color:white; font-family:'Bangers'; margin-top:50px;">未找到数据...</h2>`;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(currentFilteredPosts.length / ITEMS_PER_PAGE));
    currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pagedPosts = currentFilteredPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // 渲染当前页文章
    container.style.opacity = 0;
    pagedPosts.forEach(post => {
        let tagsDisplay = Array.isArray(post.tags) ? post.tags.join(' / ') : post.tags;

        const editBtnHtml = window.IS_ADMIN ? `
            <div class="card-actions">
                <button class="action-mini-btn btn-edit" onclick="event.stopPropagation(); window.location.href='/editor.html?id=${post.id}'">
                    EDIT
                </button>
            </div>` : '';

        const html = `
    <article class="post-entry">
        <div class="post-link-overlay" onclick="goToPost('${post.id}')" title="${post.title}"></div>
        ${post.cover ? `<div class="post-cover" style="background-image: url('${post.cover}');"></div>` : ''}
        <div class="post-content-wrap">
            <div class="post-meta">${post.date} <span class="post-tag">${tagsDisplay}</span></div>
            <h2 class="post-title">${post.title}</h2>
            <p class="post-summary">${post.summary}</p>
        </div>
        ${editBtnHtml}
    </article>
`;
        container.innerHTML += html;
    });

    // 分页控件
    if (totalPages > 1) {
        const pagination = document.createElement('div');
        pagination.className = 'pagination-bar pagination-home';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn page-btn--prev';
        prevBtn.innerText = '上一页';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => changePage(-1);

        const info = document.createElement('div');
        info.className = 'page-info';
        info.innerText = `${currentPage} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn page-btn--next';
        nextBtn.innerText = '下一页';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => changePage(1);

        pagination.appendChild(prevBtn);
        pagination.appendChild(info);
        pagination.appendChild(nextBtn);
        container.appendChild(pagination);
    }

    // 淡入动画
    setTimeout(() => { container.style.opacity = 1; }, 50);
}

// 3. 翻页功能
function changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(currentFilteredPosts.length / ITEMS_PER_PAGE));
    const nextPage = Math.min(Math.max(1, currentPage + direction), totalPages);
    if (nextPage === currentPage) return;
    renderPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. 筛选功能
function filterPosts(category) {
    // 退出文章模式（如果在）
    exitPostMode();

    setHomeTopVisible(category === 'HOME');

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
        setHomeTopVisible(true);
        // 如果搜索为空，恢复到 HOME 状态
        document.getElementById('btn-home').classList.add('active');
        currentFilteredPosts = allPostsCache;
    } else {
        setHomeTopVisible(false);
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

    setHomeTopVisible(false);

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

    setHomeTopVisible(false);

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

async function showPortfolioPage() {
    exitPostMode();
    setHomeTopVisible(false);

    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    const portfolioBtn = document.getElementById('btn-portfolio');
    if (portfolioBtn) portfolioBtn.classList.add('active');

    const container = document.getElementById('blog-list-container');
    container.style.opacity = 0;
    container.innerHTML = `<h2 style="color:white; font-family:'Bangers'; text-align:center; margin-top:50px;">LOADING PORTFOLIO...</h2>`;

    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error("Portfolio data not found");
        
        const data = await response.json();
        const portfolioItems = data?.items || [];

        if (!Array.isArray(portfolioItems) || portfolioItems.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px;">
                    <h2 style="color:white; font-family:'Bangers'; font-size:2rem;">暂无作品</h2>
                    <p style="color:#aaa; margin-top:20px;">作品集正在准备中，敬请期待...</p>
                </div>
            `;
            container.style.opacity = 1;
            return;
        }

        container.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = 'text-align:center; margin-bottom:40px;';
        header.innerHTML = `
            <p style="color:#aaa; margin-top:10px; font-size:0.95rem;">独立开发的作品集合，持续更新中...</p>
        `;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'portfolio-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(192px, 1fr));
            gap: 20px;
            padding: 0 20px;
        `;

        portfolioItems.forEach(item => {
            const card = document.createElement('div');
            const rotate = (Math.random() * 4 - 2).toFixed(1);
            
            card.className = 'portfolio-card';
            card.style.cssText = `
                background: var(--p5-white);
                border: 3px solid var(--p5-black);
                box-shadow: 5px 5px 0 var(--p5-black);
                transform: rotate(${rotate}deg);
                transition: all 0.3s ease;
                overflow: hidden;
                position: relative;
            `;

            card.onmouseover = () => {
                card.style.transform = `rotate(0deg) translateY(-5px)`;
                card.style.boxShadow = '8px 10px 0 var(--p5-black)';
                card.style.zIndex = '10';
            };
            card.onmouseout = () => {
                card.style.transform = `rotate(${rotate}deg)`;
                card.style.boxShadow = '5px 5px 0 var(--p5-black)';
                card.style.zIndex = '1';
            };

            const tagsHtml = Array.isArray(item.tags) 
                ? item.tags.map(tag => `<span style="background:var(--p5-yellow); color:var(--p5-black); padding:1px 5px; font-size:0.6rem; font-weight:bold; border:1px solid var(--p5-black); margin-right:3px;">${tag}</span>`).join('')
                : '';

            const statusColor = item.status === '已上线' ? 'var(--p5-red)' : '#666';

            // 构建卡片内容
            const cardContent = `
                <div style="position:relative; height:180px; overflow:hidden; border-bottom:3px solid var(--p5-black);">
                    ${item.cover 
                        ? `<img src="${item.cover}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/400x200?text=No+Image'">`
                        : `<div style="width:100%; height:100%; background:var(--p5-black); display:flex; align-items:center; justify-content:center;"><i class="fas fa-box" style="font-size:3rem; color:var(--p5-yellow);"></i></div>`
                    }
                    <div style="position:absolute; top:8px; right:8px; display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
                        <div style="background:${statusColor}; color:white; padding:2px 8px; font-size:0.6rem; font-weight:bold; border:1px solid var(--p5-black);">
                            ${item.status || '开发中'}
                        </div>
                        ${item.url 
                            ? `<div style="background:var(--p5-yellow); color:var(--p5-black); padding:2px 8px; font-size:0.6rem; font-weight:bold; border:1px solid var(--p5-black);">
                                <i class="fas fa-external-link-alt"></i> 可访问
                            </div>`
                            : ''
                        }
                    </div>
                </div>
                <div style="padding:10px;">
                    <h3 style="font-family:'Noto Sans SC', sans-serif; font-size:1rem; color:var(--p5-black); margin-bottom:6px; font-weight:bold;">${item.name}</h3>
                    <p style="color:#555; font-size:0.7rem; line-height:1.3; margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">${item.description}</p>
                    <div style="margin-bottom:8px; display:flex; flex-wrap:wrap; align-items:center; gap:5px;">
                        ${tagsHtml}
                    </div>
                </div>
            `;

            // 如果有URL，让整个卡片可点击
            if (item.url) {
                const linkWrapper = document.createElement('a');
                linkWrapper.href = item.url;
                linkWrapper.target = '_blank';
                linkWrapper.rel = 'noopener noreferrer';
                linkWrapper.style.display = 'block';
                linkWrapper.style.textDecoration = 'none';
                linkWrapper.style.color = 'inherit';
                linkWrapper.innerHTML = cardContent;
                card.appendChild(linkWrapper);
            } else {
                card.innerHTML = cardContent;
            }

            grid.appendChild(card);
        });

        container.appendChild(grid);
        setTimeout(() => { container.style.opacity = 1; }, 50);

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="background:var(--p5-black); color:white; padding:20px; border:2px solid red; max-width:500px; margin:50px auto;">
                <h2 style="font-family:'Bangers'; color:red;">ERROR</h2>
                <p>Failed to load portfolio data.</p>
            </div>
        `;
        container.style.opacity = 1;
    }
}

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
    const backBtnWidget = document.getElementById('back-btn-widget');
    
    if (tocWidget) {
        tocWidget.style.display = 'none';
    }
    if (backBtnWidget) {
        backBtnWidget.style.display = 'none';
    }
    if (webmasterWidget) webmasterWidget.style.display = 'block';
    if (containerDiv) containerDiv.classList.remove('post-reading-mode');

    setHomeTopVisible(true);

    // 恢复 URL 到首页 (如果没有 id 就不 push 了，防止重复)
    if (window.location.search) {
        window.history.pushState({}, '', window.location.pathname);
    }
}

// 监听浏览器后退/前进
window.addEventListener('popstate', (event) => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    if (postId) {
        showPost(postId, false);
    } else {
        exitPostMode();
        renderPage(currentPage);
    }
});

// 8. SPA 文章阅读：动态加载
async function showPost(postId, updateHistory = true) {
    // 1. 取消所有分类按钮的高亮（可选，或者保留当前高亮）
    // document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    const container = document.getElementById('blog-list-container');
    setHomeTopVisible(false);
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
        let tocHtml = '';
        if (tocList.length > 0) {
            tocHtml = '<ul style="list-style:none; padding-left:0;">';
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
        } else {
            tocHtml = '<div style="color:#aaa; text-align:center; padding:20px; font-size:0.9rem;">该文章没有目录</div>';
        }

        // 注入 TOC 到侧边栏
        const tocWidget = document.getElementById('toc-widget');
        const tocContent = document.getElementById('toc-content');
        const webmasterWidget = document.getElementById('webmaster-widget');
        const sidebar = document.getElementById('main-sidebar');
        const containerDiv = document.querySelector('.container');
        const backBtnWidget = document.getElementById('back-btn-widget');

        if (tocWidget && tocContent) {
            tocContent.innerHTML = tocHtml;
            tocWidget.style.display = 'block';
            if (backBtnWidget) backBtnWidget.style.display = 'block';
            if (webmasterWidget) webmasterWidget.style.display = 'none';
            
            // 调整布局类名
            containerDiv.classList.add('post-reading-mode');
        }

        // 1. 解析 MD -> HTML
        const htmlContent = marked.parse(text);

        // 2. 渲染
        container.innerHTML = `
            <div class="markdown-body paper-pattern-white" style="padding:40px; box-shadow:10px 10px 0 var(--p5-black); border-top:5px solid var(--p5-black);">
                <h1 style="border-bottom:3px solid black; padding-bottom:10px; margin-bottom:20px;">${title}</h1>
                <div style="color:#666; margin-bottom:30px; font-weight:bold;">${date}</div>
                <div id="post-comments" style="margin-bottom: 26px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                        <div style="font-family:'Bangers'; font-size:1.6rem;">文章留言</div>
                        <a class="p5-link-btn" href="/message-board">网站留言板</a>
                    </div>
                    <div class="comment-form" style="margin-top:14px;">
                        <div class="comment-form-row">
                            <div class="comment-field">
                                <div class="comment-label">昵称</div>
                                <input id="post-comment-name" placeholder="匿名访客" class="comment-input">
                            </div>
                        </div>
                        <div class="comment-field" style="margin-top: 14px;">
                            <div class="comment-label">联系方式（可选）</div>
                            <input id="post-comment-contact" placeholder="邮箱/微信/网址（仅管理员可见）" class="comment-input">
                        </div>
                        <div class="comment-field" style="margin-top: 14px;">
                            <div class="comment-label">留言内容</div>
                            <textarea id="post-comment-content" rows="4" placeholder="写下你的想法..." class="comment-textarea"></textarea>
                        </div>
                        <div class="comment-actions" style="margin-top: 14px;">
                            <button id="post-comment-submit" class="p5-link-btn" type="button">提交</button>
                            <div id="post-comment-status" class="comment-status"></div>
                        </div>
                    </div>
                    <div id="post-comments-list" class="comment-list" style="margin-top: 16px;"></div>
                </div>
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

        initPostComments(postId);

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

function formatDateTime(iso) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
        return '';
    }
}

function buildCommentCard(comment) {
    const card = document.createElement('div');
    card.className = 'comment-card';

    const head = document.createElement('div');
    head.className = 'comment-head';

    const name = document.createElement('div');
    name.className = 'comment-name';
    name.textContent = comment?.name || '匿名访客';

    const time = document.createElement('div');
    time.className = 'comment-time';
    time.textContent = formatDateTime(comment?.createdAt);

    head.appendChild(name);
    head.appendChild(time);

    const body = document.createElement('div');
    body.className = 'comment-body';
    body.textContent = comment?.content || '';

    card.appendChild(head);
    card.appendChild(body);
    return card;
}

async function loadPostComments(postId) {
    const listEl = document.getElementById('post-comments-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const placeholder = document.createElement('div');
    placeholder.className = 'comment-empty';
    placeholder.textContent = '加载中...';
    listEl.appendChild(placeholder);

    try {
        const res = await fetch(`/api/comments/post/${encodeURIComponent(postId)}`);
        const data = await res.json();
        listEl.innerHTML = '';
        if (!data?.success) throw new Error(data?.message || 'FAILED');

        const comments = Array.isArray(data.comments) ? data.comments : [];
        if (comments.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'comment-empty';
            empty.textContent = '还没有留言，来当第一个吧。';
            listEl.appendChild(empty);
            return;
        }

        comments.forEach(c => listEl.appendChild(buildCommentCard(c)));
    } catch (e) {
        listEl.innerHTML = '';
        const err = document.createElement('div');
        err.className = 'comment-empty';
        err.textContent = '加载失败，请稍后重试。';
        listEl.appendChild(err);
    }
}

async function submitPostComment(postId) {
    const nameEl = document.getElementById('post-comment-name');
    const contactEl = document.getElementById('post-comment-contact');
    const contentEl = document.getElementById('post-comment-content');
    const btn = document.getElementById('post-comment-submit');
    const statusEl = document.getElementById('post-comment-status');

    if (!contentEl || !btn) return;
    const name = (nameEl?.value || '').trim();
    const contact = (contactEl?.value || '').trim();
    const content = (contentEl.value || '').trim();
    if (!content) {
        if (statusEl) statusEl.textContent = '请填写留言内容。';
        return;
    }

    btn.disabled = true;
    if (statusEl) statusEl.textContent = '提交中...';
    try {
        const res = await fetch(`/api/comments/post/${encodeURIComponent(postId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contact, content })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        contentEl.value = '';
        if (statusEl) statusEl.textContent = '已提交，等待审核。';
        await loadPostComments(postId);
    } catch (e) {
        if (statusEl) statusEl.textContent = '提交失败，请稍后重试。';
    } finally {
        btn.disabled = false;
        setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
        }, 2000);
    }
}

function initPostComments(postId) {
    const btn = document.getElementById('post-comment-submit');
    if (btn) {
        btn.onclick = () => submitPostComment(postId);
    }
    loadPostComments(postId);
}
