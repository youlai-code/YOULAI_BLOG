
// editor.js 新版：支持新建与编辑模式
const input = document.getElementById('markdown-input');
const preview = document.getElementById('preview-content');
const previewPane = document.querySelector('.preview-pane');
let currentEditingId = null;

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
    
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id');
    if (editId) {
        await loadPostForEdit(editId);
    }
    updateWordCount(); // 初始化字数
});

// 加载已有文章
async function loadPostForEdit(id) {
    try {
        const listRes = await fetch('/posts.json');
        const posts = await listRes.json();
        const meta = posts.find(p => p.id === id);
        if (!meta) {
            alert("文章未找到！");
            return;
        }
        const contentRes = await fetch(`/posts/${id}.md`);
        let content = await contentRes.text();

        // 移除 Markdown 头部元数据 (Frontmatter) 以避免在编辑器中显示
        const frontMatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---/;
        const match = content.match(frontMatterRegex);
        if (match) {
            content = content.replace(match[0], '').trim();
        }

        document.getElementById('in-title').value = meta.title;
        document.getElementById('in-date').value = meta.date;
        document.getElementById('in-tags').value = Array.isArray(meta.tags) ? meta.tags.join(' / ') : meta.tags;
        document.getElementById('in-summary').value = meta.summary;
        document.getElementById('in-cover').value = meta.cover || '';  // 加载封面

        // 如果有封面，显示预览
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

        document.querySelector('.btn-publish').innerText = "更新文章";
    } catch (err) {
        console.error(err);
        alert("加载文章数据失败");
    }
}

// 实时预览与字数统计
input.addEventListener('input', () => {
    preview.innerHTML = marked.parse(input.value);
    Prism.highlightAllUnder(preview);
    updateWordCount();
});

// 字数统计功能
function updateWordCount() {
    const text = input.value;
    // 简单的字数统计：中文字符算1个，英文单词算1个
    const cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+(?=\s|$)/g) || []).length;
    const total = cnChars + enWords;

    const wordCountEl = document.getElementById('word-count-text');
    if (wordCountEl) {
        wordCountEl.innerText = total;
    }
}

// 滚动同步功能
let isScrolling = false;

input.addEventListener('scroll', () => {
    if (!isScrolling) {
        isScrolling = true;
        const percentage = input.scrollTop / (input.scrollHeight - input.clientHeight);
        previewPane.scrollTop = percentage * (previewPane.scrollHeight - previewPane.clientHeight);
        setTimeout(() => isScrolling = false, 10); // 防止死循环
    }
});

previewPane.addEventListener('scroll', () => {
    if (!isScrolling) {
        isScrolling = true;
        const percentage = previewPane.scrollTop / (previewPane.scrollHeight - previewPane.clientHeight);
        input.scrollTop = percentage * (input.scrollHeight - input.clientHeight);
        setTimeout(() => isScrolling = false, 10);
    }
});

// 粘贴板图片上传支持
input.addEventListener('paste', async (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
            const blob = item.getAsFile();
            await uploadPastedImage(blob);
            event.preventDefault(); // 阻止默认粘贴行为（防止粘贴二进制乱码）
        }
    }
});

async function uploadPastedImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // 显示上传中提示
    insertText('![上传中...](', ')');
    
    try {
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        
        if (result.success) {
            // 替换占位符为真实链接
            const currentVal = input.value;
            // 简单替换最后一次插入的占位符（注意：如果用户在上传期间快速输入可能会有偏差，这里做简化处理）
            // 更严谨的做法是记录光标位置或使用唯一占位符 ID
            input.value = currentVal.replace('![上传中...]()', `![image](${result.url})`);
            input.dispatchEvent(new Event('input'));
        } else {
            alert('图片上传失败: ' + result.message);
            input.value = input.value.replace('![上传中...]()', ''); // 清除占位符
        }
    } catch (err) {
        console.error('Upload error:', err);
        alert('上传出错');
        input.value = input.value.replace('![上传中...]()', '');
    }
}

// 快捷插入
function insertText(before, after) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    input.value = text.substring(0, start) + (before + selected + after) + text.substring(end);
    input.focus();
    input.selectionStart = start + before.length;
    input.selectionEnd = start + before.length + selected.length;
    input.dispatchEvent(new Event('input'));
}

// editor.js 中的 publish 函数

async function publish() {
    let finalId;
    if (currentEditingId) {
        finalId = currentEditingId;
    } else {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-T:.]/g, '').slice(0, 14);
        finalId = `post_${timestamp}`;
    }

    const data = {
        id: finalId,
        title: document.getElementById('in-title').value,
        date: document.getElementById('in-date').value,
        tags: document.getElementById('in-tags').value,
        summary: document.getElementById('in-summary').value,
        content: input.value,
        cover: document.getElementById('in-cover').value || null  // 封面（可选，为空则传 null）
    };

    console.log("Preparing to publish:", data); // Debug log

    if (!data.title || !data.content) {
        Phantom.alert("数据缺失: 标题和内容是必填项。", "数据错误");
        return;
    }

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.success) {
            const msg = currentEditingId ? "文章已更新！" : "新文章已创建！";
            Phantom.confirm(msg + "\n返回首页？", () => {
                // 修改为返回上一级 ../index.html
                window.location.href = '/index.html';
            }, "操作成功");
        } else {
            Phantom.alert("错误: " + result.message, "服务器错误");
        }
    } catch (err) {
        Phantom.alert("网络错误: server.js 是否在运行？", "连接丢失");
    }
}
// AI 自动填充逻辑
async function aiAutoFill() {
    const content = input.value;
    // 注意：按钮现在在 header 里，class 是 btn-ai
    const btn = document.querySelector('.btn-ai');

    if (content.length < 10) { alert("内容太短，无法生成"); return; }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 思考中...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/ai-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
        const result = await res.json();
        if (result.success) {
            if (!document.getElementById('in-title').value) document.getElementById('in-title').value = result.data.title;
            if (!document.getElementById('in-summary').value) document.getElementById('in-summary').value = result.data.summary;
            if (!document.getElementById('in-tags').value) document.getElementById('in-tags').value = result.data.tags;
            btn.innerHTML = '<i class="fas fa-check"></i> 完成!';
        } else { alert("AI 生成失败"); }
    } catch (e) { alert("网络错误"); }

    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }, 2000);
}

// 封面上传功能
function uploadCover() {
    document.getElementById('cover-upload-input').click();
}

async function handleCoverUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('只支持上传图片文件 (jpg, jpeg, png, gif, webp)');
        return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();

        if (result.success) {
            document.getElementById('in-cover').value = result.url;

            // 显示封面预览
            const previewImg = document.getElementById('cover-preview-img');
            const placeholder = document.getElementById('cover-placeholder');

            if (previewImg && placeholder) {
                previewImg.src = result.url;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            }

            console.log('封面上传成功:', result.url);
            // 迷你模式下不弹窗打扰，或者用小提示
            // alert('封面上传成功！'); 
        } else {
            alert('封面上传失败: ' + result.message);
        }
    } catch (err) {
        console.error('上传错误:', err);
        alert('封面上传失败，请检查网络连接');
    }

    event.target.value = '';
}

// --- 图片上传功能 ---
function uploadImage() {
    // 触发隐藏的文件选择器
    document.getElementById('image-upload-input').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('只支持上传图片文件 (jpg, jpeg, png, gif, webp)');
        return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB');
        return;
    }

    // 创建 FormData
    const formData = new FormData();
    formData.append('image', file);

    try {
        // 显示上传进度
        const startText = `\n\n![上传中...]()\n`;
        insertText(startText, '');

        // 上传到服务器
        const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });

        const result = await res.json();

        if (result.success) {
            // 替换上传中的文本为实际图片
            const imageMarkdown = `![${file.name}](${result.url})`;
            input.value = input.value.replace(startText, `\n\n${imageMarkdown}\n`);
            input.dispatchEvent(new Event('input'));
            console.log('图片上传成功:', result.url);
        } else {
            alert('上传失败: ' + result.message);
            // 清除上传中的文本
            input.value = input.value.replace(startText, '');
            input.dispatchEvent(new Event('input'));
        }
    } catch (err) {
        console.error('上传错误:', err);
        alert('上传失败，请检查网络连接');
        // 清除上传中的文本
        input.value = input.value.replace(`\n\n![上传中...]()\n`, '');
        input.dispatchEvent(new Event('input'));
    }

    // 重置文件选择器
    event.target.value = '';
}

// --- 视频嵌入功能 ---
function insertVideo() {
    const videoUrl = prompt('请输入视频链接:\n\n支持:\n- YouTube: https://www.youtube.com/watch?v=...\n- Bilibili: https://www.bilibili.com/video/BV...\n- 腾讯视频: https://v.qq.com/x/page/...\n- 直接视频文件: .mp4 / .webm 链接');

    if (!videoUrl) return;

    let embedCode = '';

    // 识别视频平台并生成嵌入代码
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube 视频
        let videoId = '';
        if (videoUrl.includes('watch?v=')) {
            videoId = videoUrl.split('watch?v=')[1].split('&')[0];
        } else if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
        embedCode = `\n<div class="video-container">\n  <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n</div>\n`;
    }
    else if (videoUrl.includes('bilibili.com')) {
        // Bilibili 视频
        let bvid = '';
        if (videoUrl.includes('/video/')) {
            bvid = videoUrl.split('/video/')[1].split('/')[0].split('?')[0];
        }
        embedCode = `\n<div class="video-container">\n  <iframe src="//player.bilibili.com/player.html?bvid=${bvid}&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>\n</div>\n`;
    }
    else if (videoUrl.includes('v.qq.com')) {
        // 腾讯视频
        let vid = '';
        if (videoUrl.includes('/x/page/')) {
            vid = videoUrl.split('/x/page/')[1].split('.')[0];
        } else if (videoUrl.includes('/x/cover/')) {
            vid = videoUrl.split('/')[videoUrl.split('/').length - 1].split('.')[0];
        }
        embedCode = `\n<div class="video-container">\n  <iframe src="https://v.qq.com/txp/iframe/player.html?vid=${vid}" frameborder="0" allowfullscreen></iframe>\n</div>\n`;
    }
    else if (videoUrl.match(/\.(mp4|webm|ogg)$/i)) {
        // 直接视频文件
        embedCode = `\n<div class="video-container">\n  <video controls>\n    <source src="${videoUrl}" type="video/${videoUrl.split('.').pop()}">\n    您的浏览器不支持视频播放。\n  </video>\n</div>\n`;
    }
    else {
        // 未识别的链接，使用通用 iframe
        const useIframe = confirm('未能识别视频平台，是否使用通用 iframe 嵌入？\n（如果是其他平台的分享链接，通常可以正常工作）');
        if (useIframe) {
            embedCode = `\n<div class="video-container">\n  <iframe src="${videoUrl}" frameborder="0" allowfullscreen></iframe>\n</div>\n`;
        } else {
            return;
        }
    }

    // 插入到编辑器
    insertText(embedCode, '');
}
