function postUrl(id) {
    return `/posts/${encodeURIComponent(id)}`;
}

async function checkAdminAndInitButtons() {
    try {
        const cfgRes = await fetch('/config.json');
        if (cfgRes.ok) {
            const config = await cfgRes.json();
            const isAdmin = config.features?.enableEditor === true || 
                           localStorage.getItem('YOULAI_ADMIN') === 'true' || 
                           Boolean(localStorage.getItem('YOULAI_ADMIN_TOKEN'));
            
            const adminButtons = document.getElementById('admin-buttons');
            if (adminButtons) adminButtons.style.display = isAdmin ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('Failed to check admin status:', e);
    }
}

function renderColumns(columns, posts) {
    const root = document.getElementById('columns-list');
    if (!root) return;
    root.innerHTML = '';

    if (!Array.isArray(columns) || columns.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'comment-empty';
        empty.textContent = '暂无专栏。';
        root.appendChild(empty);
        return;
    }

    const map = new Map();
    columns.forEach(c => map.set(c.id, []));
    (Array.isArray(posts) ? posts : []).forEach(p => {
        const cid = p?.columnId || '';
        if (cid && map.has(cid)) map.get(cid).push(p);
    });

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    grid.style.gap = '20px';

    columns.forEach(col => {
        const card = document.createElement('div');
        card.style.border = '3px solid black';
        card.style.boxShadow = '6px 6px 0 var(--p5-black)';
        card.style.overflow = 'hidden';

        const cover = document.createElement('div');
        cover.style.height = '120px';
        if (col.cover) {
            cover.style.backgroundImage = `url('${col.cover}')`;
            cover.style.backgroundSize = 'cover';
            cover.style.backgroundPosition = 'center';
        } else {
            cover.style.background = 'linear-gradient(135deg, rgba(252,225,0,0.35), rgba(210,5,5,0.25))';
        }

        const body = document.createElement('div');
        body.style.padding = '16px';

        const name = document.createElement('div');
        name.style.fontFamily = "'Bangers'";
        name.style.fontSize = '1.6rem';
        name.textContent = col.name;

        const desc = document.createElement('div');
        desc.style.marginTop = '8px';
        desc.style.color = '#444';
        desc.textContent = col.description || '';

        const listWrap = document.createElement('div');
        listWrap.style.marginTop = '14px';

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        const items = map.get(col.id) || [];
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#666';
            empty.style.fontWeight = 'bold';
            empty.textContent = '暂无文章';
            list.appendChild(empty);
        } else {
            items.slice(0, 6).forEach(p => {
                const a = document.createElement('a');
                a.href = postUrl(p.id);
                a.style.textDecoration = 'none';
                a.style.color = '#111';
                a.style.border = '2px solid black';
                a.style.padding = '8px 10px';
                a.style.display = 'block';
                a.style.background = 'rgba(255,255,255,0.7)';
                a.textContent = p.title;
                list.appendChild(a);
            });
        }

        listWrap.appendChild(list);

        body.appendChild(name);
        body.appendChild(desc);
        body.appendChild(listWrap);

        card.appendChild(cover);
        card.appendChild(body);
        grid.appendChild(card);
    });

    root.appendChild(grid);
}

async function initColumns() {
    checkAdminAndInitButtons();
    
    const root = document.getElementById('columns-list');
    if (root) {
        const loading = document.createElement('div');
        loading.className = 'comment-empty';
        loading.textContent = '加载中...';
        root.appendChild(loading);
    }

    try {
        const [colRes, postRes] = await Promise.all([
            fetch('/api/columns'),
            fetch('/posts.json')
        ]);
        const colData = await colRes.json();
        const posts = await postRes.json();
        if (!colData?.success) throw new Error(colData?.message || 'FAILED');
        renderColumns(colData.columns, posts);
    } catch (e) {
        if (root) {
            root.innerHTML = '';
            const err = document.createElement('div');
            err.className = 'comment-empty';
            err.textContent = '加载失败，请稍后重试。';
            root.appendChild(err);
        }
    }
}

// 导出函数供其他脚本调用
if (typeof window !== 'undefined') {
    window.initColumns = initColumns;
}

