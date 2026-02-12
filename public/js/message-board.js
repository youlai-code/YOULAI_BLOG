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

async function loadSiteComments() {
    const listEl = document.getElementById('site-comments-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const placeholder = document.createElement('div');
    placeholder.className = 'comment-empty';
    placeholder.textContent = '加载中...';
    listEl.appendChild(placeholder);

    try {
        const res = await fetch('/api/comments/site');
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

async function submitSiteComment() {
    const nameEl = document.getElementById('site-comment-name');
    const contactEl = document.getElementById('site-comment-contact');
    const contentEl = document.getElementById('site-comment-content');
    const btn = document.getElementById('site-comment-submit');
    const statusEl = document.getElementById('site-comment-status');

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
        const res = await fetch('/api/comments/site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contact, content })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        contentEl.value = '';
        if (statusEl) statusEl.textContent = '已提交，等待审核。';
        await loadSiteComments();
    } catch (e) {
        if (statusEl) statusEl.textContent = '提交失败，请稍后重试。';
    } finally {
        btn.disabled = false;
        setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('site-comment-submit');
    if (btn) btn.addEventListener('click', submitSiteComment);
    loadSiteComments();
});
