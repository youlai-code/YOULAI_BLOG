// editor.js - 极简写作模式
const input = document.getElementById('markdown-input');
const preview = document.getElementById('preview-content');
let currentEditingId = null;
let generatedPostId = null;
let columnsCache = [];
function getAdminToken() {
    return localStorage.getItem('YOULAI_ADMIN_TOKEN') || '';
}

function withAdminHeaders(headers) {
    const token = getAdminToken();
    if (!token) return headers;
    return { ...headers, 'x-admin-token': token };
}

function buildPostId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const millisecond = String(now.getMilliseconds()).padStart(3, '0');
    const random = Math.random().toString(36).slice(2, 6);
    return `post_${year}${month}${day}_${hour}${minute}${second}${millisecond}_${random}`;
}

function getPostIdForPublish() {
    if (currentEditingId) return currentEditingId;
    if (!generatedPostId) {
        generatedPostId = buildPostId();
    }
    return generatedPostId;
}

// 切换文章信息面板
function toggleMetaPanel() {
    const panel = document.getElementById('metaPanel');
    const overlay = document.getElementById('metaOverlay');
    const isActive = panel.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // 打开面板时，如果标题为空，自动聚焦标题输入框
    if (isActive) {
        const titleInput = document.getElementById('in-title');
        if (titleInput && !titleInput.value.trim()) {
            setTimeout(() => titleInput.focus(), 300);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化时间为 YYYY.MM.DD HH:mm
    const now = new Date();
    const formattedDate = now.getFullYear() + '.' + 
        String(now.getMonth() + 1).padStart(2, '0') + '.' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0');
        
    document.getElementById('in-date').value = formattedDate;

    await loadColumnsOptions('');
    
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id');
    if (editId) {
        await loadPostForEdit(editId);
    }
    
    updateStats();
    
    // 自动保存草稿到 localStorage
    loadDraft();
    setupAutoSave();
});

// 加载专栏选项
async function loadColumnsOptions(selectedId) {
    const selectEl = document.getElementById('in-column');
    if (!selectEl) return;
    try {
        const res = await fetch('/api/columns');
        const data = await res.json();
        columnsCache = Array.isArray(data?.columns) ? data.columns : [];

        selectEl.innerHTML = '<option value="">未加入专栏</option>';

        columnsCache.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col.id;
            opt.textContent = col.name;
            selectEl.appendChild(opt);
        });

        selectEl.value = selectedId || '';
    } catch (e) {
        selectEl.value = selectedId || '';
    }
}

// 加载已有文章
async function loadPostForEdit(id) {
    try {
        const listRes = await fetch('/posts.json');
        const posts = await listRes.json();
        const meta = posts.find(p => p.id === id);
        if (!meta) {
            showNotification("文章未找到！", "error");
            return;
        }
        const contentRes = await fetch(`/posts/${id}.md`);
        let content = await contentRes.text();

        // 移除 Markdown 头部元数据
        const frontMatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---/;
        const match = content.match(frontMatterRegex);
        if (match) {
            content = content.replace(match[0], '').trim();
        }

        document.getElementById('in-title').value = meta.title;
        document.getElementById('in-date').value = meta.date;
        document.getElementById('in-tags').value = Array.isArray(meta.tags) ? meta.tags.join(' / ') : meta.tags;
        document.getElementById('in-summary').value = meta.summary || '';
        document.getElementById('in-cover').value = meta.cover || '';
        await loadColumnsOptions(meta.columnId || '');

        // 显示封面预览
        if (meta.cover) {
            const previewImg = document.getElementById('cover-preview-img');
            const placeholder = document.getElementById('cover-placeholder');
            if (previewImg && placeholder) {
                previewImg.src = meta.cover;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        input.value = content;
        currentEditingId = id;
        input.dispatchEvent(new Event('input'));

        document.querySelector('.btn-publish').innerHTML = '<span>发布</span>';
    } catch (err) {
        console.error(err);
        showNotification("加载文章失败", "error");
    }
}

// 实时预览与字数统计
input.addEventListener('input', updatePreview);

// 标题输入同步到预览
document.getElementById('in-title').addEventListener('input', (e) => {
    updatePreview();
    updateSaveStatus('已修改');
});

// 更新预览
function updatePreview() {
    // 只渲染内容，不显示标题
    preview.innerHTML = marked.parse(input.value);
    Prism.highlightAllUnder(preview);
    updateStats();
    updateSaveStatus('已修改');
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 更新统计信息
function updateStats() {
    const text = input.value;
    // 字数统计
    const cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+(?=\s|$)/g) || []).length;
    const total = cnChars + enWords;

    document.getElementById('word-count').innerText = total.toLocaleString();
    
    // 阅读时间估算（假设每分钟 300 字）
    const readTime = Math.max(1, Math.ceil(total / 300));
    document.getElementById('read-time').innerText = readTime;
}

// 更新保存状态
function updateSaveStatus(status) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerText = status;
        if (status === '已保存') {
            statusEl.style.color = '#4ade80';
        } else if (status === '已修改') {
            statusEl.style.color = '#fbbf24';
        } else {
            statusEl.style.color = '#888';
        }
    }
}

// 自动保存草稿
function setupAutoSave() {
    let timeout;
    const saveDraft = () => {
        const draft = {
            title: document.getElementById('in-title').value,
            content: input.value,
            date: document.getElementById('in-date').value,
            tags: document.getElementById('in-tags').value,
            summary: document.getElementById('in-summary').value,
            cover: document.getElementById('in-cover').value,
            columnId: document.getElementById('in-column').value,
            timestamp: Date.now()
        };
        localStorage.setItem('editor_draft', JSON.stringify(draft));
        updateSaveStatus('已保存');
    };

    const inputs = document.querySelectorAll('#in-title, #in-tags, #in-summary, #in-date, #in-column, #markdown-input');
    inputs.forEach(el => {
        el.addEventListener('input', () => {
            clearTimeout(timeout);
            updateSaveStatus('保存中...');
            timeout = setTimeout(saveDraft, 2000);
        });
    });
}

// 加载草稿
function loadDraft() {
    const draftStr = localStorage.getItem('editor_draft');
    if (!draftStr) return;
    
    try {
        const draft = JSON.parse(draftStr);
        const params = new URLSearchParams(window.location.search);
        
        // 如果是编辑模式，不加载草稿
        if (params.get('id')) return;
        
        // 检查草稿是否过期（7天）
        const daysSince = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
            localStorage.removeItem('editor_draft');
            return;
        }
        
        if (draft.title || draft.content) {
            if (confirm('检测到未发布的草稿，是否恢复？')) {
                document.getElementById('in-title').value = draft.title || '';
                input.value = draft.content || '';
                document.getElementById('in-date').value = draft.date || '';
                document.getElementById('in-tags').value = draft.tags || '';
                document.getElementById('in-summary').value = draft.summary || '';
                document.getElementById('in-cover').value = draft.cover || '';
                document.getElementById('in-column').value = draft.columnId || '';
                
                // 恢复封面预览
                if (draft.cover) {
                    const previewImg = document.getElementById('cover-preview-img');
                    const placeholder = document.getElementById('cover-placeholder');
                    if (previewImg && placeholder) {
                        previewImg.src = draft.cover;
                        previewImg.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                }
                
                input.dispatchEvent(new Event('input'));
            } else {
                localStorage.removeItem('editor_draft');
            }
        }
    } catch (e) {
        console.error('加载草稿失败:', e);
    }
}

// 滚动同步
let isScrolling = false;
const previewContent = document.querySelector('.preview-content-wrapper');

function syncScroll(source, target) {
    if (!isScrolling) {
        isScrolling = true;
        const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
        target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);
        setTimeout(() => isScrolling = false, 10);
    }
}

if (input && previewContent) {
    input.addEventListener('scroll', () => syncScroll(input, previewContent));
    previewContent.addEventListener('scroll', () => syncScroll(previewContent, input));
    
    // 初始同步
    setTimeout(() => {
        syncScroll(input, previewContent);
    }, 100);
}

// 粘贴图片上传
input.addEventListener('paste', async (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
            const blob = item.getAsFile();
            await uploadPastedImage(blob);
            event.preventDefault();
        }
    }
});

async function uploadPastedImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    insertText('![上传中...]()', '');
    
    try {
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: withAdminHeaders({}),
            body: formData
        });
        const result = await res.json();
        
        if (result.success) {
            input.value = input.value.replace('![上传中...]()', `![image](${result.url})`);
            input.dispatchEvent(new Event('input'));
        } else {
            showNotification('图片上传失败: ' + result.message, 'error');
            input.value = input.value.replace('![上传中...]()', '');
        }
    } catch (err) {
        console.error('Upload error:', err);
        showNotification('上传出错', 'error');
        input.value = input.value.replace('![上传中...]()', '');
    }
}

// 插入文本
function insertText(before, after) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    input.value = newText;
    
    const newCursor = start + before.length + selected.length;
    input.setSelectionRange(newCursor, newCursor);
    input.focus();
    input.dispatchEvent(new Event('input'));
}

// 上传图片
function uploadImage() {
    document.getElementById('image-upload-input').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    insertText('![上传中...]()', '');
    
    try {
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: withAdminHeaders({}),
            body: formData
        });
        const result = await res.json();
        
        if (result.success) {
            input.value = input.value.replace('![上传中...]()', `![${file.name}](${result.url})`);
            input.dispatchEvent(new Event('input'));
        } else {
            showNotification('上传失败: ' + result.message, 'error');
            input.value = input.value.replace('![上传中...]()', '');
        }
    } catch (err) {
        console.error(err);
        showNotification('上传出错', 'error');
        input.value = input.value.replace('![上传中...]()', '');
    }
    
    event.target.value = '';
}

// 插入视频
function insertVideo() {
    const url = prompt('请输入视频链接 (支持 Bilibili、YouTube 等):');
    if (url) {
        insertText(`\n<video src="${url}" controls style="max-width:100%;"></video>\n`, '');
    }
}

// 封面上传
function uploadCover() {
    document.getElementById('cover-upload-input').click();
}

async function handleCoverUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    const placeholder = document.getElementById('cover-placeholder');
    const previewImg = document.getElementById('cover-preview-img');
    
    placeholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>上传中...</span>';
    
    try {
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: withAdminHeaders({}),
            body: formData
        });
        const result = await res.json();
        
        if (result.success) {
            document.getElementById('in-cover').value = result.url;
            previewImg.src = result.url;
            previewImg.style.display = 'block';
            placeholder.style.display = 'none';
            showNotification('封面上传成功', 'success');
        } else {
            showNotification('上传失败: ' + result.message, 'error');
            placeholder.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>点击上传封面</span>';
        }
    } catch (err) {
        console.error(err);
        showNotification('上传出错', 'error');
        placeholder.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>点击上传封面</span>';
    }
    
    event.target.value = '';
}

// AI 自动生成
async function aiAutoFill() {
    const content = input.value.trim();
    if (!content || content.length < 50) {
        showNotification('请先输入至少 50 字文章内容', 'error');
        return;
    }
    
    // 检查登录状态
    const token = getAdminToken();
    if (!token) {
        showNotification('请先登录管理员账号', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }
    
    const btn = document.querySelector('.ai-generate-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>生成中...</span>';
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ content })
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                showNotification('登录已过期，请重新登录', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
                return;
            }
            throw new Error('网络错误');
        }
        
        const result = await res.json();
        
        if (result.success) {
            if (result.data.title) document.getElementById('in-title').value = result.data.title;
            if (result.data.summary) document.getElementById('in-summary').value = result.data.summary;
            if (result.data.tags) document.getElementById('in-tags').value = result.data.tags;
            showNotification('AI 生成完成', 'success');
        } else {
            showNotification('生成失败: ' + result.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('AI 服务出错', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// 发布文章
async function publish() {
    // 检查登录状态
    const token = getAdminToken();
    if (!token) {
        showNotification('请先登录管理员账号', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    const title = document.getElementById('in-title').value.trim();
    const content = input.value.trim();
    const date = document.getElementById('in-date').value.trim();
    const tags = document.getElementById('in-tags').value.trim();
    const summary = document.getElementById('in-summary').value.trim();
    const cover = document.getElementById('in-cover').value.trim();
    const columnId = document.getElementById('in-column')?.value || '';

    if (!title) {
        showNotification('请输入文章标题', 'error');
        document.getElementById('in-title').focus();
        return;
    }
    if (!content) {
        showNotification('请输入文章内容', 'error');
        input.focus();
        return;
    }
    if (!date) {
        showNotification('请输入发布日期', 'error');
        return;
    }

    const btn = document.querySelector('.btn-publish');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>发布中...</span>';
    btn.disabled = true;
    const postId = getPostIdForPublish();

    const data = {
        id: postId,
        title,
        content,
        date,
        tags,
        summary,
        cover,
        columnId
    };

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            showNotification(currentEditingId ? '文章更新成功！' : '文章发布成功！', 'success');
            localStorage.removeItem('editor_draft');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification('发布失败: ' + result.message, 'error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        showNotification('发布出错', 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// 通知提示
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 10000;
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    if (type === 'success') {
        notif.style.background = '#22c55e';
        notif.style.color = 'white';
        notif.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    } else if (type === 'error') {
        notif.style.background = '#ef4444';
        notif.style.color = 'white';
        notif.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    } else {
        notif.style.background = '#3b82f6';
        notif.style.color = 'white';
        notif.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    }
    
    document.body.appendChild(notif);
    
    // 动画显示
    requestAnimationFrame(() => {
        notif.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // 自动隐藏
    setTimeout(() => {
        notif.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Tab 键支持
input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        insertText('    ', '');
    }
});
