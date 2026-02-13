function getToken() {
    return localStorage.getItem('YOULAI_ADMIN_TOKEN') || '';
}

function setToken(token) {
    if (token) {
        localStorage.setItem('YOULAI_ADMIN_TOKEN', token);
        localStorage.setItem('YOULAI_ADMIN', 'true');
    } else {
        localStorage.removeItem('YOULAI_ADMIN_TOKEN');
        localStorage.removeItem('YOULAI_ADMIN');
    }
}

async function api(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['x-admin-token'] = token;
    return await fetch(path, { ...options, headers });
}

function qs(sel) {
    return document.querySelector(sel);
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

function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

const pageTitles = {
    dashboard: '仪表盘',
    posts: '文章管理',
    comments: '留言审核',
    columns: '专栏管理',
    portfolio: '作品集管理',
    settings: '网站设置'
};

function showPanel(panel) {
    const panels = document.querySelectorAll('[data-panel]');
    panels.forEach(p => (p.style.display = p.getAttribute('data-panel') === panel ? '' : 'none'));
    
    document.querySelectorAll('.sidebar-link').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === panel));
    
    const titleEl = document.getElementById('page-title');
    if (titleEl && pageTitles[panel]) {
        titleEl.textContent = pageTitles[panel];
    }
}

async function checkSession() {
    const token = getToken();
    if (!token) return false;
    try {
        const res = await api('/api/admin/me');
        if (!res.ok) return false;
        const data = await res.json();
        return Boolean(data?.success);
    } catch {
        return false;
    }
}

async function login() {
    const pwdEl = document.getElementById('admin-password');
    const statusEl = document.getElementById('login-status');
    if (!pwdEl) return;

    const password = (pwdEl.value || '').trim();
    if (!password) {
        if (statusEl) statusEl.textContent = '请输入密码。';
        return;
    }

    if (statusEl) statusEl.textContent = '登录中...';
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        setToken(data.token);
        if (statusEl) statusEl.textContent = '登录成功。';
        await boot();
    } catch (e) {
        setToken('');
        if (statusEl) statusEl.textContent = '登录失败。';
    }
}

function logout() {
    setToken('');
    window.location.reload();
}

function buildActionButtons(actions) {
    const wrap = document.createElement('div');
    wrap.className = 'cell-actions';
    actions.forEach(a => wrap.appendChild(a));
    return wrap;
}

function buildBtn(text, cls, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${cls || ''}`.trim();
    btn.textContent = text;
    btn.onclick = onClick;
    return btn;
}

async function loadPosts() {
    const tbody = document.getElementById('posts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    setStatus('posts-status', '加载中...');
    try {
        const res = await fetch('/posts.json');
        const posts = await res.json();
        tbody.innerHTML = '';

        (Array.isArray(posts) ? posts : []).forEach(p => {
            const tr = document.createElement('tr');

            const tdId = document.createElement('td');
            tdId.className = 'mono';
            tdId.textContent = p.id;

            const tdTitle = document.createElement('td');
            const a = document.createElement('a');
            a.href = `/posts/${encodeURIComponent(p.id)}`;
            a.textContent = p.title || p.id;
            a.style.color = 'inherit';
            a.style.textDecoration = 'none';
            tdTitle.appendChild(a);

            const tdDate = document.createElement('td');
            tdDate.textContent = p.date || '';

            const tdCol = document.createElement('td');
            tdCol.innerHTML = p.columnId ? `<span class="pill mono">${p.columnId}</span>` : '<span class="pill">-</span>';

            const tdActions = document.createElement('td');
            const btnEdit = buildBtn('编辑', '', () => (window.location.href = `/editor.html?id=${encodeURIComponent(p.id)}`));
            const btnDel = buildBtn('删除', 'btn-danger', async () => {
                if (!confirm('确定删除该文章？')) return;
                await deletePost(p.id);
            });
            tdActions.appendChild(buildActionButtons([btnEdit, btnDel]));

            tr.appendChild(tdId);
            tr.appendChild(tdTitle);
            tr.appendChild(tdDate);
            tr.appendChild(tdCol);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        setStatus('posts-status', '');
    } catch {
        setStatus('posts-status', '加载失败');
    }
}

async function deletePost(id) {
    setStatus('posts-status', '删除中...');
    try {
        const res = await api('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        setStatus('posts-status', '已删除');
        await loadPosts();
        setTimeout(() => setStatus('posts-status', ''), 1500);
    } catch {
        setStatus('posts-status', '删除失败');
    }
}

function commentRow(c, scope) {
    const tr = document.createElement('tr');

    const cols = [];
    if (scope === 'post') {
        const tdPid = document.createElement('td');
        tdPid.className = 'mono';
        tdPid.textContent = c.postId;
        cols.push(tdPid);
    }

    const tdTime = document.createElement('td');
    tdTime.textContent = formatDateTime(c.createdAt);

    const tdName = document.createElement('td');
    tdName.textContent = c.name;

    const tdContent = document.createElement('td');
    tdContent.textContent = c.content;

    const tdContact = document.createElement('td');
    tdContact.textContent = c.contact || '';

    const tdActions = document.createElement('td');
    const approveBtn = buildBtn('通过', 'btn-primary', () => moderateComment(scope, c, 'approve'));
    const rejectBtn = buildBtn('拒绝', '', () => moderateComment(scope, c, 'reject'));
    const delBtn = buildBtn('删除', 'btn-danger', () => moderateComment(scope, c, 'delete'));
    tdActions.appendChild(buildActionButtons([approveBtn, rejectBtn, delBtn]));

    cols.push(tdTime, tdName, tdContent, tdContact, tdActions);
    cols.forEach(td => tr.appendChild(td));
    return tr;
}

async function loadComments() {
    const status = (document.getElementById('comments-status')?.value || 'pending').toString();
    setStatus('comments-status-text', '加载中...');

    const siteBody = document.getElementById('site-comments-tbody');
    const postBody = document.getElementById('post-comments-tbody');
    if (siteBody) siteBody.innerHTML = '';
    if (postBody) postBody.innerHTML = '';

    try {
        const res = await api(`/api/admin/comments?scope=all&status=${encodeURIComponent(status)}`);
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        const site = Array.isArray(data.data?.site) ? data.data.site : [];
        const posts = Array.isArray(data.data?.posts) ? data.data.posts : [];

        if (siteBody) {
            if (site.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 5;
                td.className = 'muted';
                td.textContent = '暂无数据';
                tr.appendChild(td);
                siteBody.appendChild(tr);
            } else {
                site.forEach(c => siteBody.appendChild(commentRow(c, 'site')));
            }
        }

        if (postBody) {
            if (posts.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 6;
                td.className = 'muted';
                td.textContent = '暂无数据';
                tr.appendChild(td);
                postBody.appendChild(tr);
            } else {
                posts.forEach(c => postBody.appendChild(commentRow(c, 'post')));
            }
        }

        setStatus('comments-status-text', '');
    } catch {
        setStatus('comments-status-text', '加载失败');
    }
}

async function moderateComment(scope, comment, action) {
    setStatus('comments-status-text', '提交中...');
    try {
        const payload = {
            scope,
            action,
            commentId: comment.id
        };
        if (scope === 'post') payload.postId = comment.postId;

        const res = await api('/api/admin/comments/moderate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        await loadComments();
        setStatus('comments-status-text', '已更新');
        setTimeout(() => setStatus('comments-status-text', ''), 1200);
    } catch {
        setStatus('comments-status-text', '操作失败');
    }
}

function normalizeColumnId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 64);
}

function buildColumnRow(column) {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    const inId = document.createElement('input');
    inId.type = 'text';
    inId.className = 'input';
    inId.value = column.id || '';
    inId.placeholder = 'e.g. unity-toolchain';
    inId.style.minWidth = '120px';
    inId.onblur = () => { inId.value = normalizeColumnId(inId.value); };
    tdId.appendChild(inId);

    const tdName = document.createElement('td');
    const inName = document.createElement('input');
    inName.type = 'text';
    inName.className = 'input';
    inName.value = column.name || '';
    inName.placeholder = '专栏名称';
    tdName.appendChild(inName);

    const tdDesc = document.createElement('td');
    const inDesc = document.createElement('input');
    inDesc.type = 'text';
    inDesc.className = 'input';
    inDesc.value = column.description || '';
    inDesc.placeholder = '一句话描述';
    tdDesc.appendChild(inDesc);

    const tdCover = document.createElement('td');
    const inCover = document.createElement('input');
    inCover.type = 'text';
    inCover.className = 'input';
    inCover.value = column.cover || '';
    inCover.placeholder = 'https://...';
    tdCover.appendChild(inCover);

    const tdActions = document.createElement('td');
    const btnDel = buildBtn('删除', 'btn-danger', () => {
        if (confirm('确定删除该专栏？（不会自动修改文章归属）')) {
            tr.remove();
        }
    });
    tdActions.appendChild(buildActionButtons([btnDel]));

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCover);
    tr.appendChild(tdActions);

    tr._getColumnData = () => ({
        id: normalizeColumnId(inId.value),
        name: String(inName.value || '').trim().slice(0, 64),
        description: String(inDesc.value || '').trim().slice(0, 120),
        cover: String(inCover.value || '').trim().slice(0, 500)
    });

    return tr;
}

async function loadColumns() {
    const tbody = document.getElementById('columns-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    setStatus('columns-status', '加载中...');

    try {
        const res = await fetch('/api/columns');
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || 'FAILED');
        const columns = Array.isArray(data.columns) ? data.columns : [];

        columns.forEach(c => tbody.appendChild(buildColumnRow(c)));
        if (columns.length === 0) {
            tbody.appendChild(buildColumnRow({ id: '', name: '', description: '', cover: '' }));
        }
        setStatus('columns-status', '');
    } catch {
        setStatus('columns-status', '加载失败');
    }
}

function collectColumnsData() {
    const tbody = document.getElementById('columns-tbody');
    if (!tbody) return [];
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const data = rows
        .map(r => r._getColumnData?.())
        .filter(Boolean)
        .filter(c => c.id && c.name);

    const map = new Map();
    data.forEach(c => {
        if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
}

async function saveColumns() {
    const btn = document.getElementById('btn-save-columns');
    if (btn) btn.disabled = true;
    setStatus('columns-status', '保存中...');

    try {
        const columns = collectColumnsData();
        const res = await api('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columns })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        setStatus('columns-status', '已保存');
        setTimeout(() => setStatus('columns-status', ''), 1500);
        await loadColumns();
    } catch {
        setStatus('columns-status', '保存失败');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function addColumnRow() {
    const tbody = document.getElementById('columns-tbody');
    if (!tbody) return;
    tbody.appendChild(buildColumnRow({ id: '', name: '', description: '', cover: '' }));
}

function buildPortfolioRow(item) {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    const inId = document.createElement('input');
    inId.type = 'text';
    inId.className = 'input';
    inId.value = item.id || '';
    inId.placeholder = 'e.g. my-app';
    inId.style.minWidth = '100px';
    tdId.appendChild(inId);

    const tdName = document.createElement('td');
    const inName = document.createElement('input');
    inName.type = 'text';
    inName.className = 'input';
    inName.value = item.name || '';
    inName.placeholder = '作品名称';
    tdName.appendChild(inName);

    const tdDesc = document.createElement('td');
    const inDesc = document.createElement('input');
    inDesc.type = 'text';
    inDesc.className = 'input';
    inDesc.value = item.description || '';
    inDesc.placeholder = '作品描述';
    inDesc.style.minWidth = '150px';
    tdDesc.appendChild(inDesc);

    const tdCover = document.createElement('td');
    const inCover = document.createElement('input');
    inCover.type = 'text';
    inCover.className = 'input';
    inCover.value = item.cover || '';
    inCover.placeholder = '/img/cover.jpg';
    tdCover.appendChild(inCover);

    const tdUrl = document.createElement('td');
    const inUrl = document.createElement('input');
    inUrl.type = 'text';
    inUrl.className = 'input';
    inUrl.value = item.url || '';
    inUrl.placeholder = 'https://...';
    tdUrl.appendChild(inUrl);

    const tdTags = document.createElement('td');
    const inTags = document.createElement('input');
    inTags.type = 'text';
    inTags.className = 'input';
    inTags.value = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');
    inTags.placeholder = '标签1, 标签2';
    inTags.style.minWidth = '120px';
    tdTags.appendChild(inTags);

    const tdStatus = document.createElement('td');
    const selStatus = document.createElement('select');
    selStatus.className = 'input';
    selStatus.innerHTML = `
        <option value="已上线" ${item.status === '已上线' ? 'selected' : ''}>已上线</option>
        <option value="开发中" ${item.status === '开发中' ? 'selected' : ''}>开发中</option>
        <option value="已下线" ${item.status === '已下线' ? 'selected' : ''}>已下线</option>
    `;
    tdStatus.appendChild(selStatus);

    const tdActions = document.createElement('td');
    const btnDel = buildBtn('删除', 'btn-danger', () => {
        if (confirm('确定删除该作品？')) {
            tr.remove();
        }
    });
    tdActions.appendChild(buildActionButtons([btnDel]));

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCover);
    tr.appendChild(tdUrl);
    tr.appendChild(tdTags);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tr._getPortfolioData = () => ({
        id: String(inId.value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
        name: String(inName.value || '').trim(),
        description: String(inDesc.value || '').trim(),
        cover: String(inCover.value || '').trim(),
        url: String(inUrl.value || '').trim(),
        tags: String(inTags.value || '').split(',').map(t => t.trim()).filter(Boolean),
        status: selStatus.value
    });

    return tr;
}

async function loadPortfolio() {
    const tbody = document.getElementById('portfolio-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    setStatus('portfolio-status', '加载中...');

    try {
        const res = await fetch('/portfolio.json');
        const items = await res.json();
        tbody.innerHTML = '';

        (Array.isArray(items) ? items : []).forEach(item => tbody.appendChild(buildPortfolioRow(item)));
        if (items.length === 0) {
            tbody.appendChild(buildPortfolioRow({ id: '', name: '', description: '', cover: '', url: '', tags: [], status: '开发中' }));
        }
        setStatus('portfolio-status', '');
    } catch {
        setStatus('portfolio-status', '加载失败');
    }
}

function collectPortfolioData() {
    const tbody = document.getElementById('portfolio-tbody');
    if (!tbody) return [];
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const data = rows
        .map(r => r._getPortfolioData?.())
        .filter(Boolean)
        .filter(item => item.id && item.name);

    const map = new Map();
    data.forEach(item => {
        if (!map.has(item.id)) map.set(item.id, item);
    });
    return Array.from(map.values());
}

async function savePortfolio() {
    const btn = document.getElementById('btn-save-portfolio');
    if (btn) btn.disabled = true;
    setStatus('portfolio-status', '保存中...');

    try {
        const items = collectPortfolioData();
        const res = await api('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        setStatus('portfolio-status', '已保存');
        setTimeout(() => setStatus('portfolio-status', ''), 1500);
        await loadPortfolio();
    } catch {
        setStatus('portfolio-status', '保存失败');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function addPortfolioRow() {
    const tbody = document.getElementById('portfolio-tbody');
    if (!tbody) return;
    tbody.appendChild(buildPortfolioRow({ id: '', name: '', description: '', cover: '', url: '', tags: [], status: '开发中' }));
}

async function boot() {
    const loginPanel = document.getElementById('login-panel');
    const appPanel = document.getElementById('app-panel');
    const sidebar = document.getElementById('sidebar');
    const ok = await checkSession();

    if (!ok) {
        if (loginPanel) loginPanel.style.display = '';
        if (appPanel) appPanel.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        return;
    }

    if (loginPanel) loginPanel.style.display = 'none';
    if (appPanel) appPanel.style.display = '';
    if (sidebar) sidebar.style.display = '';

    showPanel('dashboard');
    await loadDashboard();
    await loadPosts();
    await loadComments();
    await loadSettings();
    await loadColumns();
    await loadPortfolio();
}

async function loadDashboard() {
    setStatus('dashboard-status', '加载中...');
    try {
        const res = await api('/api/admin/dashboard');
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        const overview = data.data.overview || {};
        document.getElementById('dash-total-posts').textContent = overview.totalPosts || 0;
        document.getElementById('dash-total-columns').textContent = overview.totalColumns || 0;
        document.getElementById('dash-total-visits').textContent = overview.totalVisits || 0;
        document.getElementById('dash-total-comments').textContent = (overview.totalSiteComments || 0) + (overview.totalPostComments || 0);
        document.getElementById('dash-pending-comments').textContent = overview.pendingComments || 0;

        renderPostsChart(data.data.postsByMonth || []);
        renderColumnStats(data.data.columnStats || []);
        renderRecentPosts(data.data.recentPosts || []);
        renderRecentComments(data.data.recentComments || []);

        setStatus('dashboard-status', '');
    } catch (e) {
        console.error(e);
        setStatus('dashboard-status', '加载失败');
    }
}

function renderPostsChart(postsByMonth) {
    const container = document.getElementById('chart-bars');
    if (!container) return;
    container.innerHTML = '';

    const maxCount = Math.max(...postsByMonth.map(m => m.count), 1);

    postsByMonth.forEach(item => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const height = (item.count / maxCount) * 100;
        bar.innerHTML = `
            <div class="bar-fill" style="height: ${height}%"></div>
            <div class="bar-label">${item.month.split('-')[1]}</div>
            <div class="bar-value">${item.count}</div>
        `;
        container.appendChild(bar);
    });
}

function renderColumnStats(columnStats) {
    const container = document.getElementById('column-stats');
    if (!container) return;
    container.innerHTML = '';

    if (columnStats.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无专栏数据</div>';
        return;
    }

    const maxCount = Math.max(...columnStats.map(c => c.count), 1);

    columnStats.forEach(col => {
        const item = document.createElement('div');
        item.className = 'column-stat-item';
        const width = (col.count / maxCount) * 100;
        item.innerHTML = `
            <div class="column-stat-name">${col.name || col.id}</div>
            <div class="column-stat-bar">
                <div class="column-stat-fill" style="width: ${width}%"></div>
            </div>
            <div class="column-stat-count">${col.count}</div>
        `;
        container.appendChild(item);
    });
}

function renderRecentPosts(posts) {
    const container = document.getElementById('recent-posts-list');
    if (!container) return;
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无文章</div>';
        return;
    }

    posts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-main">
                <a class="list-item-title" href="/posts/${encodeURIComponent(post.id)}" target="_blank">${post.title || post.id}</a>
                <div class="list-item-meta">
                    <span>${post.date || '-'}</span>
                    ${post.columnId ? `<span class="pill mono">${post.columnId}</span>` : ''}
                </div>
            </div>
            <a class="btn btn-sm" href="/editor.html?id=${encodeURIComponent(post.id)}">编辑</a>
        `;
        container.appendChild(item);
    });
}

function renderRecentComments(comments) {
    const container = document.getElementById('recent-comments-list');
    if (!container) return;
    container.innerHTML = '';

    if (comments.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无评论</div>';
        return;
    }

    comments.forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const statusClass = c.status === 'pending' ? 'status-pending' : c.status === 'approved' ? 'status-approved' : 'status-rejected';
        const statusText = c.status === 'pending' ? '待审核' : c.status === 'approved' ? '已通过' : '已拒绝';
        item.innerHTML = `
            <div class="list-item-main">
                <div class="list-item-header">
                    <span class="comment-author">${c.name}</span>
                    <span class="comment-scope">${c.scope === 'site' ? '留言板' : '文章评论'}</span>
                    <span class="comment-status ${statusClass}">${statusText}</span>
                </div>
                <div class="list-item-content">${c.content || ''}</div>
                <div class="list-item-meta">
                    <span>${formatDateTime(c.createdAt)}</span>
                    ${c.postId ? `<a href="/posts/${encodeURIComponent(c.postId)}" target="_blank">查看文章</a>` : ''}
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-link').forEach(btn => {
        btn.addEventListener('click', () => showPanel(btn.getAttribute('data-tab')));
    });

    const refreshDashboard = document.getElementById('btn-refresh-dashboard');
    if (refreshDashboard) refreshDashboard.addEventListener('click', loadDashboard);

    document.querySelectorAll('[data-goto]').forEach(btn => {
        btn.addEventListener('click', () => showPanel(btn.getAttribute('data-goto')));
    });

    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.addEventListener('click', login);
    const pwdEl = document.getElementById('admin-password');
    if (pwdEl) pwdEl.addEventListener('keypress', e => {
        if (e.key === 'Enter') login();
    });

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const refreshPosts = document.getElementById('btn-refresh-posts');
    if (refreshPosts) refreshPosts.addEventListener('click', loadPosts);
    const refreshComments = document.getElementById('btn-refresh-comments');
    if (refreshComments) refreshComments.addEventListener('click', loadComments);
    const commentsStatus = document.getElementById('comments-status');
    if (commentsStatus) commentsStatus.addEventListener('change', loadComments);

    const saveSettings = document.getElementById('btn-save-settings');
    if (saveSettings) saveSettings.addEventListener('click', saveSettingsHandler);

    document.querySelectorAll('.btn-select-image').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            const preview = btn.getAttribute('data-preview');
            openImagePicker(target, preview);
        });
    });

    const closePickerBtn = document.getElementById('close-image-picker');
    if (closePickerBtn) closePickerBtn.addEventListener('click', closeImagePicker);

    const imagePickerModal = document.getElementById('image-picker-modal');
    if (imagePickerModal) {
        imagePickerModal.addEventListener('click', (e) => {
            if (e.target === imagePickerModal) closeImagePicker();
        });
    }

    const uploadInput = document.getElementById('image-upload-input');
    if (uploadInput) {
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            const url = await uploadImage(file);
            if (url) {
                const activeTarget = document.querySelector('.btn-select-image.active');
                if (activeTarget) {
                    const targetInputId = activeTarget.getAttribute('data-target');
                    const previewId = activeTarget.getAttribute('data-preview');
                    selectImage(url, targetInputId, previewId);
                }
            }
            e.target.value = '';
        });
    }

    const addColumnBtn = document.getElementById('btn-add-column');
    if (addColumnBtn) addColumnBtn.addEventListener('click', addColumnRow);
    const saveColumnsBtn = document.getElementById('btn-save-columns');
    if (saveColumnsBtn) saveColumnsBtn.addEventListener('click', saveColumns);

    const addPortfolioBtn = document.getElementById('btn-add-portfolio');
    if (addPortfolioBtn) addPortfolioBtn.addEventListener('click', addPortfolioRow);
    const savePortfolioBtn = document.getElementById('btn-save-portfolio');
    if (savePortfolioBtn) savePortfolioBtn.addEventListener('click', savePortfolio);

    boot();
});

let settingsData = null;

async function loadSettings() {
    setStatus('settings-status', '加载中...');
    try {
        const res = await api('/api/admin/settings');
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        settingsData = data.data;
        const config = data.data.config || {};
        const stats = data.data.stats || {};
        const env = data.data.env || {};

        const owner = config.owner || {};
        const social = config.social || {};
        const footer = config.footer || {};
        const seo = config.seo || {};

        setFieldValue('cfg-owner-name', owner.name);
        setFieldValue('cfg-owner-title', owner.title);
        setFieldValue('cfg-owner-avatar', owner.avatar);
        setFieldValue('cfg-owner-bio', owner.bio);

        setFieldValue('cfg-social-github', social.github?.url);
        setFieldValue('cfg-social-bilibili', social.bilibili?.url);
        setFieldValue('cfg-social-qq', social.qq?.url);
        setFieldValue('cfg-social-email', social.email?.url);
        setFieldValue('cfg-social-douyin', social.douyin?.url);

        setFieldValue('cfg-footer-copyright', footer.copyright);
        setFieldValue('cfg-footer-marquee', footer.marquee);

        setFieldValue('cfg-seo-siteurl', seo.siteUrl);

        document.getElementById('stat-visits').textContent = stats.visits || 0;
        document.getElementById('stat-columns').textContent = data.data.columnsCount || 0;
        document.getElementById('stat-site-comments').textContent = stats.siteComments || 0;
        document.getElementById('stat-post-comments').textContent = stats.postComments || 0;

        updateEnvStatus('env-deepseek', env.DEEPSEEK_API_KEY);
        updateEnvStatus('env-doubao-image', env.DOUBAO_IMAGE_API_KEY);
        updateEnvStatus('env-r2', env.R2_BUCKET_NAME);
        updateEnvStatus('env-admin-pw', env.ADMIN_PASSWORD);

        setStatus('settings-status', '');
    } catch (e) {
        console.error(e);
        setStatus('settings-status', '加载失败');
    }
}

function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
    updateImagePreview(id, value);
}

function updateImagePreview(inputId, url) {
    const previewMap = {
        'cfg-owner-avatar': 'avatar-preview'
    };
    const previewId = previewMap[inputId];
    if (!previewId) return;
    
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    const img = preview.querySelector('img');
    if (img && url) {
        img.src = url;
        img.style.display = '';
    } else if (img) {
        img.style.display = 'none';
    }
}

function getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
}

function updateEnvStatus(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value && value.includes('*')) {
        el.textContent = '已配置';
        el.className = 'env-value configured';
    } else if (value) {
        el.textContent = value;
        el.className = 'env-value configured';
    } else {
        el.textContent = '未配置';
        el.className = 'env-value not-configured';
    }
}

async function saveSettingsHandler() {
    setStatus('settings-status', '保存中...');

    const config = {
        owner: {
            name: getFieldValue('cfg-owner-name'),
            title: getFieldValue('cfg-owner-title'),
            avatar: getFieldValue('cfg-owner-avatar'),
            bio: getFieldValue('cfg-owner-bio')
        },
        social: {
            github: { url: getFieldValue('cfg-social-github'), icon: 'fab fa-github', label: 'GitHub' },
            bilibili: { url: getFieldValue('cfg-social-bilibili'), icon: 'fab fa-bilibili', label: 'Bilibili' },
            qq: { url: getFieldValue('cfg-social-qq'), icon: 'fab fa-qq', label: 'QQ' },
            email: { url: getFieldValue('cfg-social-email'), icon: 'fas fa-envelope', label: 'Email' },
            douyin: { url: getFieldValue('cfg-social-douyin'), icon: 'fab fa-tiktok', label: 'Douyin' }
        },
        footer: {
            copyright: getFieldValue('cfg-footer-copyright'),
            marquee: getFieldValue('cfg-footer-marquee')
        },
        features: settingsData?.config?.features || {},
        seo: {
            siteUrl: getFieldValue('cfg-seo-siteurl'),
            postSubdomainBase: settingsData?.config?.seo?.postSubdomainBase || ''
        }
    };

    try {
        const res = await api('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        setStatus('settings-status', '保存成功');
        setTimeout(() => setStatus('settings-status', ''), 2000);
    } catch (e) {
        console.error(e);
        setStatus('settings-status', '保存失败');
    }
}

let imagePickerCallback = null;

function openImagePicker(targetInputId, previewId) {
    const modal = document.getElementById('image-picker-modal');
    if (modal) {
        modal.classList.add('open');
        loadImages(targetInputId, previewId);
    }
}

function closeImagePicker() {
    const modal = document.getElementById('image-picker-modal');
    if (modal) modal.classList.remove('open');
    imagePickerCallback = null;
}

async function loadImages(targetInputId, previewId) {
    const grid = document.getElementById('image-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const res = await api('/api/images');
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        grid.innerHTML = '';
        const images = data.data || [];

        if (images.length === 0) {
            grid.innerHTML = '<div class="empty-state">暂无图片</div>';
            return;
        }

        images.forEach(img => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `
                <div class="image-thumb">
                    <img src="${img.url}" alt="${img.name}" loading="lazy">
                </div>
                <div class="image-name">${img.name}</div>
            `;
            item.onclick = () => selectImage(img.url, targetInputId, previewId);
            grid.appendChild(item);
        });
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

function selectImage(url, targetInputId, previewId) {
    const input = document.getElementById(targetInputId);
    if (input) {
        input.value = url;
        updateImagePreview(targetInputId, url);
    }
    closeImagePicker();
}

async function uploadImage(file) {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) statusEl.textContent = '上传中...';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await api('/upload-image', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        if (statusEl) statusEl.textContent = '上传成功';
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
        
        return data.url;
    } catch (e) {
        console.error(e);
        if (statusEl) statusEl.textContent = '上传失败';
        return null;
    }
}
