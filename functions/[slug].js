import { SLUG_PATTERN } from "./_lib/slug.js";
import {
    readNoteMarkdown,
    readNote,
    readUrl
} from "./_lib/storage.js";

const FONT_STYLESHEET = "https://registry.npmmirror.com/lxgw-wenkai-screen-web/1.522.0/files/style.css";
const MARKED_SCRIPT = "https://cdn.jsdelivr.net/npm/marked@17.0.1/lib/marked.umd.js";
const PURIFY_SCRIPT = "https://cdn.jsdelivr.net/npm/dompurify@3.3.1/dist/purify.min.js";

export async function onRequest(context) {
    if (context.request.method !== "GET" && context.request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const requestedSlug = String(context.params.slug || "");
    const markdownRequest = requestedSlug.toLowerCase().endsWith(".md");
    const slug = markdownRequest ? requestedSlug.slice(0, -3) : requestedSlug;

    if (!SLUG_PATTERN.test(slug)) {
        return notFound();
    }

    try {
        if (markdownRequest) {
            return serveMarkdown(context.env, slug, context.request.method === "HEAD");
        }

        const note = await readNote(context.env, slug);
        if (note) {
            return serveNote(note);
        }

        const link = await readUrl(context.env, slug);
        if (link) {
            return Response.redirect(link, 302);
        }

        return notFound();
    } catch (error) {
        console.error(`Failed to resolve slug ${slug}:`, error);
        return new Response("服务器暂时无法处理该请求", {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }
}

async function serveMarkdown(env, slug, headOnly) {
    const markdown = await readNoteMarkdown(env, slug);
    if (markdown === null) return notFound();

    return new Response(headOnly ? null : markdown, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `inline; filename="${slug}.md"`,
            "Cache-Control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff"
        }
    });
}

function serveNote(note) {
    return new Response(generateNoteHtml(note), {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Security-Policy": [
                "default-src 'self'",
                `script-src 'self' ${new URL(MARKED_SCRIPT).origin}`,
                `style-src 'self' ${new URL(FONT_STYLESHEET).origin}`,
                `font-src 'self' ${new URL(FONT_STYLESHEET).origin} data:`,
                "img-src 'self' https: data:",
                "connect-src 'self'",
                "object-src 'none'",
                "base-uri 'none'",
                "frame-ancestors 'none'"
            ].join("; "),
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Content-Type-Options": "nosniff"
        }
    });
}

function generateNoteHtml(note) {
    const title = note.title || "便签预览";
    const createdAt = formatDate(note.createdAt);
    const markdownPath = `/${encodeURIComponent(note.slug)}.md`;

    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)} - SLink</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://registry.npmmirror.com" crossorigin>
    <link rel="stylesheet" href="${FONT_STYLESHEET}">
    <link rel="stylesheet" href="/assets/css/note.css">
    <script src="${MARKED_SCRIPT}" integrity="sha384-KwzR5her+zXi/Bzz4PVrBjkrjsBZy9adZtt3jA6Jgj3/hzPihRUV6HqMONpTe7Ll" crossorigin="anonymous" defer></script>
    <script src="${PURIFY_SCRIPT}" integrity="sha384-80VlBZnyAwkkqtSfg5NhPyZff6nU4K/qniLBL8Jnm4KDv6jZhLiYtJbhglg/i9ww" crossorigin="anonymous" defer></script>
    <script type="module" src="/assets/js/note.js"></script>
</head>
<body>
    <header class="site-header page-width">
        <a class="brand" href="/">SLink</a>
        <h1>${escapeHtml(title)}</h1>
        <div class="note-meta">
            <time datetime="${escapeHtml(note.createdAt)}">${escapeHtml(createdAt)}</time>
        </div>
    </header>

    <main class="note-shell page-width">
        <article class="markdown" id="noteContent" data-source="${markdownPath}" aria-live="polite">
            <p class="loading-state">正在加载正文...</p>
        </article>
        <footer class="note-actions">
            <button class="action primary" type="button" data-copy="content">复制 Markdown</button>
            <button class="action" type="button" data-copy="url">复制链接</button>
            <a class="action" href="${markdownPath}" download>下载 .md</a>
            <a class="action" href="/">创建新便签</a>
        </footer>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>`;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "未知时间";
    return new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Shanghai"
    }).format(date);
}

function notFound() {
    return new Response("未找到该短链或便签", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
