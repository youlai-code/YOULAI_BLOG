// js/index.js

// 全局变量
let allPostsCache = [];
let currentFilteredPosts = []; // 当前筛选后的所有文章
let currentPage = 1;
const ITEMS_PER_PAGE = 6; // 每页显示几篇文章

// 1. 初始化
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    const container = document.getElementById('blog-list-container');
    try {
        const res = await fetch('posts.json');
        if (!res.ok) throw new Error("JSON NOT FOUND");
        allPostsCache = await res.json();

        // 初始状态：显示所有文章
        currentFilteredPosts = allPostsCache;
        renderPage(1);

        // 加载社交媒体链接
        loadSocialLinks();
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

// 加载社交媒体链接
async function loadSocialLinks() {
    try {
        const res = await fetch('config.json');
        if (!res.ok) return; // 如果配置文件不存在，静默失败

        const config = await res.json();
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

        // 加载底部滚动文字
        if (config.footer && config.footer.marquee) {
            const marqueeContent = document.querySelector('.marquee-content');
            if (marqueeContent) {
                marqueeContent.innerText = config.footer.marquee;
            }
        }
    } catch (err) {
        console.error('Failed to load social links:', err);
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
    <article class="post-entry" onclick="location.href='/posts/${post.id}'">
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
