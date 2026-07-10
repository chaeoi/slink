export async function onRequest(context) {
    const { env, params } = context;
    const slug = params.slug;

    if (!slug || slug.includes('.')) {
        return new Response('Not Found', { status: 404 });
    }

    try {
        // 首先尝试查找便签
        let dataStr = await env.SLINK_KV.get(`note:${slug}`);
        let isNote = false;
        
        if (dataStr) {
            isNote = true;
        } else {
            // 如果不是便签，查找短链
            dataStr = await env.SLINK_KV.get(`url:${slug}`);
        }
        
        if (!dataStr) {
            return Response.redirect('/', 302);
        }

        const data = JSON.parse(dataStr);
        
        if (isNote) {
            // 便签预览：更新访问统计并返回HTML页面
            context.waitUntil(
                env.SLINK_KV.put(`note:${slug}`, JSON.stringify({
                    ...data,
                    viewCount: (data.viewCount || 0) + 1,
                    lastAccessed: new Date().toISOString()
                })).catch(() => {
                    console.warn(`Failed to update stats for note ${slug}`);
                })
            );

            return new Response(generateNoteHTML(data), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        } else {
            // 短链重定向：确保URL格式正确
            let redirectUrl = data.originalUrl; 
            if (!/^https?:\/\//i.test(redirectUrl)) {
                redirectUrl = 'https://' + redirectUrl;
            }
            
            // 异步更新访问统计
            context.waitUntil(
                env.SLINK_KV.put(`url:${slug}`, JSON.stringify({
                    ...data,
                    clickCount: (data.clickCount || 0) + 1,
                    lastAccessed: new Date().toISOString()
                })).catch(() => {
                    console.warn(`Failed to update stats for ${slug}`);
                })
            );

            return Response.redirect(redirectUrl, 302);
        }

    } catch (error) {
        console.error('Redirect error:', error);
        return Response.redirect('/', 302);
    }
}

function generateNoteHTML(noteData) {
    const title = noteData.title || '便签预览';
    const content = noteData.content || '';
    const createdAt = new Date(noteData.createdAt).toLocaleString('zh-CN');
    const viewCount = noteData.viewCount || 0;
    const contentJson = escapeJsonScript(JSON.stringify(content));
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - SLink 便签</title>
    <link rel="preconnect" href="https://registry.npmmirror.com" crossorigin>
    <link rel="stylesheet" href="https://registry.npmmirror.com/lxgw-wenkai-screen-web/latest/files/lxgwwenkaiscreen/result.css">
    <link rel="stylesheet" href="/assets/note.css">
    <script src="/assets/note.js" defer></script>
</head>
<body class="note-preview">
    <header class="note-site-header note-width">
        <h1 class="note-title">${escapeHtml(title)}</h1>
        <div class="note-meta">
            <span>${createdAt}</span>
            <span>${viewCount} 次查看</span>
        </div>
    </header>

    <main class="note-paper note-width">
        <article class="note-content" id="noteContent" aria-live="polite">
            <p class="note-loading">正在加载正文</p>
        </article>

        <div class="note-actions">
            <button class="action-btn primary" type="button" data-note-copy="content">复制内容</button>
            <button class="action-btn" type="button" data-note-copy="url">复制链接</button>
            <a href="/" class="action-btn">创建新便签</a>
        </div>
    </main>

    <div id="copyNotification" class="copy-notification">
        已复制到剪贴板
    </div>

    <script type="application/json" id="noteSource">${contentJson}</script>
</body>
</html>`;
}

function escapeJsonScript(json) {
    return json
        .replace(/&/g, '\\u0026')
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
