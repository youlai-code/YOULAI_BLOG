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

function showPanel(panel) {
    const panels = document.querySelectorAll('[data-panel]');
    panels.forEach(p => (p.style.display = p.getAttribute('data-panel') === panel ? '' : 'none'));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === panel));
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

async function boot() {
    const loginPanel = document.getElementById('login-panel');
    const appPanel = document.getElementById('app-panel');
    const ok = await checkSession();

    if (!ok) {
        if (loginPanel) loginPanel.style.display = '';
        if (appPanel) appPanel.style.display = 'none';
        return;
    }

    if (loginPanel) loginPanel.style.display = 'none';
    if (appPanel) appPanel.style.display = '';

    showPanel('posts');
    await loadPosts();
    await loadComments();
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => showPanel(btn.getAttribute('data-tab')));
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

    boot();
});

