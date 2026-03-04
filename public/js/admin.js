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

function buildCommentCard(c) {
    const card = document.createElement('div');
    card.className = 'comment-card-modern';
    
    // Avatar (Initials)
    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    avatar.textContent = (c.name || '?').charAt(0).toUpperCase();
    
    // Main Content
    const main = document.createElement('div');
    main.className = 'comment-main';
    
    // Header
    const header = document.createElement('div');
    header.className = 'comment-header';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'comment-user-info';
    
    const authorLine = document.createElement('div');
    authorLine.style.display = 'flex';
    authorLine.style.alignItems = 'center';
    authorLine.style.gap = '8px';
    
    const author = document.createElement('span');
    author.className = 'comment-author';
    author.textContent = c.name;
    
    // Status Badge
    const statusBadge = document.createElement('span');
    statusBadge.className = 'pill';
    statusBadge.style.fontSize = '11px';
    if (c.status === 'approved') {
        statusBadge.textContent = '已通过';
        statusBadge.style.color = 'var(--success)';
        statusBadge.style.background = '#dcfce7';
    } else if (c.status === 'rejected') {
        statusBadge.textContent = '已拒绝';
        statusBadge.style.color = 'var(--danger)';
        statusBadge.style.background = '#fee2e2';
    } else {
        statusBadge.textContent = '待审核';
        statusBadge.style.color = 'var(--warning)';
        statusBadge.style.background = '#fef3c7';
    }
    
    authorLine.append(author, statusBadge);
    
    const time = document.createElement('span');
    time.className = 'comment-time';
    time.textContent = formatDateTime(c.createdAt) + (c.contact ? ` • ${c.contact}` : '');
    
    userInfo.append(authorLine, time);
    
    // Context (Source)
    const context = document.createElement('div');
    context.className = 'comment-context';
    context.textContent = c._scope === 'site' ? '留言板' : `文章: ${c.postId}`;
    if (c._scope === 'post') {
        context.style.cursor = 'pointer';
        context.onclick = () => window.open(`/posts/${encodeURIComponent(c.postId)}`, '_blank');
    }
    
    header.append(userInfo, context);
    
    // Content Text
    const text = document.createElement('div');
    text.className = 'comment-text collapsed';
    text.textContent = c.content;
    
    // Toggle Read More
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-text';
    toggleBtn.textContent = '展开全文';
    toggleBtn.style.display = 'none';
    
    // Check text length
    if (c.content && c.content.length > 100) {
        toggleBtn.style.display = 'inline-block';
        toggleBtn.onclick = () => {
            if (text.classList.contains('collapsed')) {
                text.classList.remove('collapsed');
                toggleBtn.textContent = '收起';
            } else {
                text.classList.add('collapsed');
                toggleBtn.textContent = '展开全文';
            }
        };
    } else {
        text.classList.remove('collapsed');
    }
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    
    const createActionBtn = (icon, cls, title, onClick) => {
        const btn = document.createElement('button');
        btn.className = `action-btn ${cls}`;
        btn.title = title;
        btn.innerHTML = icon;
        btn.onclick = onClick;
        return btn;
    };
    
    if (c.status !== 'approved') {
        actions.appendChild(createActionBtn(
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            'approve', '通过',
            () => moderateComment(c._scope, c, 'approve')
        ));
    }
    
    if (c.status !== 'rejected') {
        actions.appendChild(createActionBtn(
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            'reject', '拒绝',
            () => moderateComment(c._scope, c, 'reject')
        ));
    }
    
    actions.appendChild(createActionBtn(
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        'delete', '删除',
        () => {
            if (confirm('确定删除该留言？')) moderateComment(c._scope, c, 'delete');
        }
    ));
    
    main.append(header, text, toggleBtn, actions);
    card.append(avatar, main);
    
    return card;
}

async function loadComments() {
    const status = (document.getElementById('comments-status')?.value || 'pending').toString();
    setStatus('comments-status-text', '加载中...');

    const container = document.getElementById('comments-list-container');
    if (container) container.innerHTML = '';

    try {
        // Handle "all" status by sending empty string if API supports it, or check backend logic.
        // Assuming backend treats empty status as "all" or we need to send specific query.
        // If backend is strictly filtering, we might need to handle 'all' specially.
        // For now, let's try sending the status value directly, but if it's 'all', we send empty.
        const queryStatus = status === 'all' ? '' : status;
        
        const res = await api(`/api/admin/comments?scope=all&status=${encodeURIComponent(queryStatus)}`);
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        const site = Array.isArray(data.data?.site) ? data.data.site : [];
        const posts = Array.isArray(data.data?.posts) ? data.data.posts : [];
        
        // Merge and sort
        const allComments = [
            ...site.map(c => ({...c, _scope: 'site'})), 
            ...posts.map(c => ({...c, _scope: 'post'}))
        ];
        allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (container) {
            if (allComments.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无数据</div>';
            } else {
                allComments.forEach(c => container.appendChild(buildCommentCard(c)));
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

function buildColumnCard(column) {
    const card = document.createElement('div');
    card.className = 'admin-card';

    // Cover
    const coverArea = document.createElement('div');
    coverArea.className = 'card-cover';
    const img = document.createElement('img');
    img.src = column.cover || '/img/default-cover.png';
    img.onerror = () => { img.src = '/img/default-cover.png'; };
    
    coverArea.innerHTML = `
        <div class="upload-hint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style="margin-top:4px">更换封面</span>
        </div>
    `;
    coverArea.prepend(img);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        const originalSrc = img.src;
        img.style.opacity = '0.5';
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const res = await api('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                img.src = data.url;
                card._coverUrl = data.url;
            } else {
                alert('上传失败: ' + (data.message || '未知错误'));
                img.src = originalSrc;
            }
        } catch (e) {
            console.error('Upload failed:', e);
            alert('上传出错，请重试');
            img.src = originalSrc;
        } finally {
            img.style.opacity = '1';
            fileInput.value = '';
        }
    };
    
    coverArea.onclick = () => fileInput.click();
    card._coverUrl = column.cover || '';

    // Content
    const content = document.createElement('div');
    content.className = 'card-content';

    const createField = (label, value, placeholder, onInput) => {
        const field = document.createElement('div');
        field.className = 'card-field';
        field.innerHTML = `<label>${label}</label>`;
        const input = document.createElement('input');
        input.className = 'input';
        input.value = value || '';
        input.placeholder = placeholder;
        if (onInput) input.oninput = () => onInput(input.value);
        field.appendChild(input);
        return { field, input };
    };

    const nameField = createField('名称', column.name, '专栏名称', (val) => {
        if ((!idInput.value || idInput._isAuto) && val) {
             if (!column.id || idInput._isAuto) {
                  idInput.value = generateIdFromName(val);
                  idInput._isAuto = true;
             }
        }
    });
    
    const idField = createField('ID (自动生成)', column.id, 'unique-id');
    const idInput = idField.input;
    idInput.readOnly = true;
    idInput.style.background = 'var(--bg)';
    idInput.style.color = 'var(--muted)';
    idInput._isAuto = !column.id;

    const descField = createField('描述', column.description, '一句话描述');

    content.append(nameField.field, idField.field, descField.field);

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'card-delete-btn';
    delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('确定删除该专栏？（不会自动修改文章归属）')) {
            card.remove();
        }
    };

    card.append(coverArea, content, delBtn);

    card._getColumnData = () => ({
        id: idInput.value,
        name: nameField.input.value,
        description: descField.input.value,
        cover: card._coverUrl
    });

    return card;
}

async function loadColumns() {
    const grid = document.getElementById('columns-grid');
    if (!grid) return;
    grid.innerHTML = '';
    setStatus('columns-status', '加载中...');

    try {
        const res = await fetch('/api/columns');
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || 'FAILED');
        const columns = Array.isArray(data.columns) ? data.columns : [];

        grid.innerHTML = '';
        columns.forEach(c => grid.appendChild(buildColumnCard(c)));
        
        setStatus('columns-status', '');
    } catch {
        setStatus('columns-status', '加载失败');
    }
}

function collectColumnsData() {
    const grid = document.getElementById('columns-grid');
    if (!grid) return [];
    const cards = Array.from(grid.querySelectorAll('.admin-card'));
    const data = cards
        .map(c => c._getColumnData?.())
        .filter(Boolean)
        .filter(c => c.id && c.name);

    const map = new Map();
    data.forEach(c => {
        if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
}

function saveColumns() {
    const btn = document.getElementById('btn-save-columns');
    if (btn) btn.disabled = true;
    setStatus('columns-status', '保存中...');

    try {
        const columns = collectColumnsData();
        api('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columns })
        }).then(res => res.json()).then(data => {
             if (!data?.success) throw new Error(data?.message || 'FAILED');
             setStatus('columns-status', '已保存');
             setTimeout(() => setStatus('columns-status', ''), 1500);
             loadColumns();
        }).catch(() => {
             setStatus('columns-status', '保存失败');
        }).finally(() => {
             if (btn) btn.disabled = false;
        });
    } catch {
        setStatus('columns-status', '保存失败');
        if (btn) btn.disabled = false;
    }
}

function addColumnCard() {
    const grid = document.getElementById('columns-grid');
    if (!grid) return;
    grid.prepend(buildColumnCard({ id: '', name: '', description: '', cover: '' }));
}

function generateIdFromName(name) {
    return String(name || '').trim().toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || 'new-item-' + Date.now();
}

function buildPortfolioCard(item) {
    const card = document.createElement('div');
    card.className = 'admin-card';

    // Cover
    const coverArea = document.createElement('div');
    coverArea.className = 'card-cover';
    const img = document.createElement('img');
    img.src = item.cover || '/img/default-cover.png';
    img.onerror = () => { img.src = '/img/default-cover.png'; };
    
    coverArea.innerHTML = `
        <div class="upload-hint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style="margin-top:4px">更换封面</span>
        </div>
    `;
    coverArea.prepend(img);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        const originalSrc = img.src;
        img.style.opacity = '0.5';
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const res = await api('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                img.src = data.url;
                card._coverUrl = data.url;
            } else {
                alert('上传失败: ' + (data.message || '未知错误'));
                img.src = originalSrc;
            }
        } catch (e) {
            console.error('Upload failed:', e);
            alert('上传出错，请重试');
            img.src = originalSrc;
        } finally {
            img.style.opacity = '1';
            fileInput.value = '';
        }
    };
    
    coverArea.onclick = () => fileInput.click();
    card._coverUrl = item.cover || '';

    // Content
    const content = document.createElement('div');
    content.className = 'card-content';

    const createField = (label, value, placeholder, onInput) => {
        const field = document.createElement('div');
        field.className = 'card-field';
        field.innerHTML = `<label>${label}</label>`;
        const input = document.createElement('input');
        input.className = 'input';
        input.value = value || '';
        input.placeholder = placeholder;
        if (onInput) input.oninput = () => onInput(input.value);
        field.appendChild(input);
        return { field, input };
    };

    const nameField = createField('名称', item.name, '作品名称', (val) => {
        if ((!idInput.value || idInput._isAuto) && val) {
            // Only auto-generate if ID is empty or was previously auto-generated
            // And if we are creating a new item (no initial ID) or it's flagged as auto
            if (!item.id || idInput._isAuto) {
                 idInput.value = generateIdFromName(val);
                 idInput._isAuto = true;
            }
        }
    });
    
    const idField = createField('ID (自动生成)', item.id, 'unique-id');
    const idInput = idField.input;
    idInput.readOnly = true;
    idInput.style.background = 'var(--bg)';
    idInput.style.color = 'var(--muted)';
    idInput._isAuto = !item.id; // If no ID initially, mark as auto-generated

    const descField = createField('描述', item.description, '简短介绍');
    const linkField = createField('链接', item.url, 'https://...');
    const tagsField = createField('标签', Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''), '标签1, 标签2');

    // Status
    const statusField = document.createElement('div');
    statusField.className = 'card-field';
    statusField.innerHTML = `<label>状态</label>`;
    const statusSelect = document.createElement('select');
    statusSelect.className = 'input';
    statusSelect.innerHTML = `
        <option value="已上线" ${item.status === '已上线' ? 'selected' : ''}>已上线</option>
        <option value="开发中" ${item.status === '开发中' ? 'selected' : ''}>开发中</option>
        <option value="已下线" ${item.status === '已下线' ? 'selected' : ''}>已下线</option>
    `;
    statusField.appendChild(statusSelect);

    content.append(nameField.field, idField.field, descField.field, linkField.field, tagsField.field, statusField);

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'card-delete-btn';
    delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('确定删除该作品？')) {
            card.remove();
        }
    };

    card.append(coverArea, content, delBtn);

    card._getPortfolioData = () => ({
        id: idInput.value,
        name: nameField.input.value,
        description: descField.input.value,
        cover: card._coverUrl,
        url: linkField.input.value,
        tags: tagsField.input.value.split(',').map(t => t.trim()).filter(Boolean),
        status: statusSelect.value
    });

    return card;
}

async function loadPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.innerHTML = '';
    setStatus('portfolio-status', '加载中...');

    try {
        const res = await fetch('/api/portfolio');
        const data = await res.json();
        grid.innerHTML = '';

        (Array.isArray(data?.items) ? data.items : []).forEach(item => grid.appendChild(buildPortfolioCard(item)));
        
        setStatus('portfolio-status', '');
    } catch {
        setStatus('portfolio-status', '加载失败');
    }
}

function collectPortfolioData() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return [];
    const cards = Array.from(grid.querySelectorAll('.admin-card'));
    const data = cards
        .map(c => c._getPortfolioData?.())
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

function addPortfolioCard() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.prepend(buildPortfolioCard({ id: '', name: '', description: '', cover: '', url: '', tags: [], status: '开发中' }));
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
        document.getElementById('dash-pending-comments').textContent = overview.pendingComments || 0;

        renderMainChart(data.data.postsByMonth || []);
        renderTimeline(data.data.recentPosts || [], data.data.recentComments || []);

        setStatus('dashboard-status', '');
    } catch (e) {
        console.error(e);
        setStatus('dashboard-status', '加载失败');
    }
}

function renderMainChart(data) {
    const container = document.getElementById('main-chart');
    if (!container) return;
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无数据</div>';
        return;
    }

    // Prepare data
    const values = data.map(d => d.count);
    const max = Math.max(...values, 5);
    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - (val / max) * 100;
        return `${x},${y}`;
    }).join(' ');

    // SVG Content
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.overflow = 'visible';

    // Gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
    `;
    svg.appendChild(defs);

    // Area path (closed)
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', `M0,100 ${points.split(' ').map(p => 'L' + p).join(' ')} L100,100 Z`);
    areaPath.setAttribute('fill', 'url(#chartGradient)');
    areaPath.setAttribute('stroke', 'none');
    svg.appendChild(areaPath);

    // Line path
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    linePath.setAttribute('points', points);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', 'var(--accent)');
    linePath.setAttribute('stroke-width', '2');
    linePath.setAttribute('vector-effect', 'non-scaling-stroke'); // Keep line width constant
    svg.appendChild(linePath);

    container.appendChild(svg);

    // Dots (HTML Overlay to avoid SVG scaling distortion)
    values.forEach((val, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - (val / max) * 100;
        
        const dot = document.createElement('div');
        dot.className = 'chart-dot';
        dot.style.left = `${x}%`;
        dot.style.top = `${y}%`;
        dot.title = `${data[i].month}: ${val} 篇`;
        
        container.appendChild(dot);
    });
}

function renderTimeline(posts, comments) {
    const container = document.getElementById('activity-timeline');
    if (!container) return;
    container.innerHTML = '';

    const activities = [
        ...posts.map(p => ({ type: 'post', date: p.date, title: '发布文章', desc: p.title, id: p.id })),
        ...comments.map(c => ({ type: 'comment', date: c.createdAt, title: '新留言', desc: `${c.name}: ${c.content}`, id: c.id }))
    ];

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = activities.slice(0, 8);

    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无动态</div>';
        return;
    }

    recent.forEach(item => {
        const el = document.createElement('div');
        el.className = 'timeline-item';
        el.innerHTML = `
            <div class="timeline-marker ${item.type}"></div>
            <div class="timeline-content">
                <span class="timeline-time">${formatDateTime(item.date)}</span>
                <span class="timeline-title">${item.title}</span>
                <div class="timeline-desc text-truncate">${item.desc}</div>
            </div>
        `;
        container.appendChild(el);
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

    // Avatar Uploader Logic
    const avatarUploader = document.getElementById('avatar-uploader');
    const avatarInput = document.getElementById('avatar-file-input');
    if (avatarUploader && avatarInput) {
        avatarUploader.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', async (e) => {
             const file = e.target.files?.[0];
             if (!file) return;
             
             // Visual feedback
             const img = document.getElementById('cfg-owner-avatar-img');
             const originalSrc = img ? img.src : '';
             if (img) img.style.opacity = '0.5';

             const url = await uploadImage(file);
             
             if (img) img.style.opacity = '1';
             
             if (url) {
                 const input = document.getElementById('cfg-owner-avatar');
                 if (img) img.src = url;
                 if (input) input.value = url;
             } else if (img) {
                 img.src = originalSrc;
             }
             e.target.value = '';
        });
    }

    // Keep existing image picker for other fields if any
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
    if (addColumnBtn) addColumnBtn.addEventListener('click', addColumnCard);
    const saveColumnsBtn = document.getElementById('btn-save-columns');
    if (saveColumnsBtn) saveColumnsBtn.addEventListener('click', saveColumns);

    const addPortfolioBtn = document.getElementById('btn-add-portfolio');
    if (addPortfolioBtn) addPortfolioBtn.addEventListener('click', addPortfolioCard);
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
        
        // Handle Avatar specifically
        const avatarInput = document.getElementById('cfg-owner-avatar');
        const avatarImg = document.getElementById('cfg-owner-avatar-img');
        if (avatarInput) avatarInput.value = owner.avatar || '';
        if (avatarImg) avatarImg.src = owner.avatar || '/img/default-avatar.png';
        
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
    // No longer using updateImagePreview for general fields as avatar is handled separately
}

function updateImagePreview(inputId, url) {
    // Deprecated for avatar, kept if needed for other image pickers
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
