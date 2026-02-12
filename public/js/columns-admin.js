function setStatus(text) {
    const el = document.getElementById('columns-admin-status');
    if (!el) return;
    el.textContent = text || '';
}

function getAdminToken() {
    return localStorage.getItem('YOULAI_ADMIN_TOKEN') || '';
}

function withAdminHeaders(headers) {
    const token = getAdminToken();
    if (!token) return headers;
    return { ...headers, 'x-admin-token': token };
}

function normalizeId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 64);
}

function buildRow(column) {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.style.padding = '10px 12px';
    tdId.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    const inId = document.createElement('input');
    inId.className = 'comment-input';
    inId.value = column.id || '';
    inId.placeholder = 'e.g. unity-toolchain';
    inId.onblur = () => { inId.value = normalizeId(inId.value); };
    tdId.appendChild(inId);

    const tdName = document.createElement('td');
    tdName.style.padding = '10px 12px';
    tdName.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    const inName = document.createElement('input');
    inName.className = 'comment-input';
    inName.value = column.name || '';
    inName.placeholder = '专栏名称';
    tdName.appendChild(inName);

    const tdDesc = document.createElement('td');
    tdDesc.style.padding = '10px 12px';
    tdDesc.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    const inDesc = document.createElement('input');
    inDesc.className = 'comment-input';
    inDesc.value = column.description || '';
    inDesc.placeholder = '一句话描述';
    tdDesc.appendChild(inDesc);

    const tdCover = document.createElement('td');
    tdCover.style.padding = '10px 12px';
    tdCover.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    const inCover = document.createElement('input');
    inCover.className = 'comment-input';
    inCover.value = column.cover || '';
    inCover.placeholder = 'https://...';
    tdCover.appendChild(inCover);

    const tdActions = document.createElement('td');
    tdActions.style.padding = '10px 12px';
    tdActions.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    const btnDel = document.createElement('button');
    btnDel.className = 'p5-cta-btn';
    btnDel.type = 'button';
    btnDel.textContent = '删除';
    btnDel.onclick = () => {
        Phantom.confirm('确定删除该专栏？（不会自动修改文章归属）', () => tr.remove(), 'WARNING');
    };
    tdActions.appendChild(btnDel);

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCover);
    tr.appendChild(tdActions);

    tr._getData = () => ({
        id: normalizeId(inId.value),
        name: String(inName.value || '').trim().slice(0, 64),
        description: String(inDesc.value || '').trim().slice(0, 120),
        cover: String(inCover.value || '').trim().slice(0, 500)
    });

    return tr;
}

async function loadColumns() {
    const tbody = document.getElementById('columns-admin-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    setStatus('加载中...');
    try {
        const res = await fetch('/api/columns');
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || 'FAILED');
        const columns = Array.isArray(data.columns) ? data.columns : [];

        columns.forEach(c => tbody.appendChild(buildRow(c)));
        if (columns.length === 0) tbody.appendChild(buildRow({ id: '', name: '', description: '', cover: '' }));
        setStatus('');
    } catch (e) {
        setStatus('加载失败');
    }
}

function collectColumns() {
    const tbody = document.getElementById('columns-admin-tbody');
    if (!tbody) return [];
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const data = rows
        .map(r => r._getData?.())
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
    setStatus('保存中...');
    try {
        const columns = collectColumns();
        const res = await fetch('/api/columns', {
            method: 'POST',
            headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ columns })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');
        setStatus('已保存');
        setTimeout(() => setStatus(''), 1500);
        await loadColumns();
    } catch (e) {
        setStatus('保存失败');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function addColumnRow() {
    const tbody = document.getElementById('columns-admin-tbody');
    if (!tbody) return;
    tbody.appendChild(buildRow({ id: '', name: '', description: '', cover: '' }));
}

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('btn-add-column');
    const saveBtn = document.getElementById('btn-save-columns');
    if (addBtn) addBtn.addEventListener('click', addColumnRow);
    if (saveBtn) saveBtn.addEventListener('click', saveColumns);
    loadColumns();
});
