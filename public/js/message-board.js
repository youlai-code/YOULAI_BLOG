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

let isAdmin = false;

function getToken() {
    return localStorage.getItem('YOULAI_ADMIN_TOKEN') || '';
}

async function checkAdminAndInitButtons() {
    try {
        const cfgRes = await fetch('/config.json');
        if (cfgRes.ok) {
            const config = await cfgRes.json();
            isAdmin = config.features?.enableEditor === true || 
                      localStorage.getItem('YOULAI_ADMIN') === 'true' || 
                      Boolean(localStorage.getItem('YOULAI_ADMIN_TOKEN'));
            
            const adminButtons = document.getElementById('admin-buttons');
            if (adminButtons) adminButtons.style.display = isAdmin ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('Failed to check admin status:', e);
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

    // 仅管理员显示回复按钮
    if (isAdmin) {
        const actions = document.createElement('div');
        actions.className = 'comment-actions';
        actions.style.marginTop = '10px';
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.alignItems = 'center';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'comment-reply-btn';
        replyBtn.textContent = '回复';
        replyBtn.style.padding = '5px 10px';
        replyBtn.style.fontSize = '0.85rem';
        replyBtn.style.cursor = 'pointer';
        replyBtn.style.border = '1px solid #ccc';
        replyBtn.style.borderRadius = '3px';
        replyBtn.style.background = '#f5f5f5';
        replyBtn.style.transition = 'all 0.2s';

        replyBtn.addEventListener('mouseover', function() {
            replyBtn.style.background = '#e0e0e0';
        });
        replyBtn.addEventListener('mouseout', function() {
            replyBtn.style.background = '#f5f5f5';
        });

        replyBtn.addEventListener('click', function() {
            showReplyForm(comment.id);
        });

        actions.appendChild(replyBtn);
        card.appendChild(actions);
    }

    // 显示回复
    const replies = comment?.replies || [];
    if (replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'comment-replies';
        repliesContainer.style.marginTop = '15px';
        repliesContainer.style.paddingLeft = '20px';
        repliesContainer.style.borderLeft = '3px solid #ddd';

        replies.forEach(reply => {
            const replyCard = buildReplyCard(reply);
            repliesContainer.appendChild(replyCard);
        });

        card.appendChild(repliesContainer);
    }

    // 仅管理员添加回复表单容器
    if (isAdmin) {
        const replyFormContainer = document.createElement('div');
        replyFormContainer.id = `reply-form-${comment.id}`;
        replyFormContainer.className = 'reply-form-container';
        replyFormContainer.style.display = 'none';
        replyFormContainer.style.marginTop = '15px';
        replyFormContainer.style.padding = '15px';
        replyFormContainer.style.background = '#f9f9f9';
        replyFormContainer.style.borderRadius = '5px';

        replyFormContainer.innerHTML = `
            <div class="comment-field" style="margin-bottom: 10px;">
                <div class="comment-label">作者回复</div>
                <textarea id="reply-content-${comment.id}" rows="3" placeholder="写下你的回复..." class="comment-textarea" style="width: 100%;"></textarea>
            </div>
            <div class="comment-actions">
                <button onclick="submitReply('${comment.id}')" class="p5-cta-btn" style="padding: 8px 15px; font-size: 1rem;">提交回复</button>
                <button onclick="hideReplyForm('${comment.id}')" style="padding: 8px 15px; font-size: 1rem; cursor: pointer; border: 2px solid black; background: white; border-radius: 4px;">取消</button>
            </div>
        `;

        card.appendChild(replyFormContainer);
    }

    return card;
}

function buildReplyCard(reply) {
    const card = document.createElement('div');
    card.className = 'comment-reply-card';
    card.style.marginBottom = '12px';
    card.style.padding = '12px';
    card.style.background = 'rgba(255, 255, 255, 0.8)';
    card.style.border = '2px solid #eee';
    card.style.borderRadius = '5px';

    const head = document.createElement('div');
    head.className = 'comment-head';
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';
    head.style.gap = '12px';

    const name = document.createElement('div');
    name.className = 'comment-name';
    name.textContent = reply?.name || '匿名访客';

    const time = document.createElement('div');
    time.className = 'comment-time';
    time.textContent = formatDateTime(reply?.createdAt);

    head.appendChild(name);
    head.appendChild(time);

    const body = document.createElement('div');
    body.className = 'comment-body';
    body.textContent = reply?.content || '';

    card.appendChild(head);
    card.appendChild(body);

    return card;
}

function showReplyForm(commentId) {
    const formContainer = document.getElementById(`reply-form-${commentId}`);
    if (formContainer) {
        formContainer.style.display = 'block';
    }
}

function hideReplyForm(commentId) {
    const formContainer = document.getElementById(`reply-form-${commentId}`);
    if (formContainer) {
        formContainer.style.display = 'none';
    }
}

async function submitReply(commentId) {
    const contentEl = document.getElementById(`reply-content-${commentId}`);

    if (!contentEl) return;
    const content = (contentEl.value || '').trim();

    if (!content) {
        alert('请填写回复内容。');
        return;
    }

    try {
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['x-admin-token'] = token;
        
        const res = await fetch(`/api/comments/site/${commentId}/reply`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: '作者', content })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'FAILED');

        contentEl.value = '';
        hideReplyForm(commentId);
        await loadSiteComments();
    } catch (e) {
        alert('提交失败，请稍后重试。');
    }
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
    checkAdminAndInitButtons();
    const btn = document.getElementById('site-comment-submit');
    if (btn) btn.addEventListener('click', submitSiteComment);
    loadSiteComments();
});
