import { SLUG_PATTERN } from "./_lib/slug.js";
import {
    readNoteMarkdown,
    readNote,
    readUrl
} from "./_lib/storage.js";

const FONT_STYLESHEET = "https://registry.npmmirror.com/lxgw-wenkai-screen-web/1.522.0/files/style.css";
const MARKED_SCRIPT = "https://cdn.jsdelivr.net/npm/marked@17.0.1/lib/marked.umd.js";
const PURIFY_SCRIPT = "https://cdn.jsdelivr.net/npm/dompurify@3.3.1/dist/purify.min.js";
const FAVICON_HREF = `data:image/svg+xml,<svg role='img' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><title>Vanilla Extract</title><path d='M12.016.023a.26.26 0 0 0-.24.013.237.237 0 0 0-.106.3c.2.481.379 1.161.055 1.619-.357.502-.91.76-1.71 1.135-.432.201-.935.436-1.517.761-1.585.883-2.194 1.725-2.306 2.781-.941.1-1.495.535-1.822 1.017l-.003.002c-.36.529-.444 1.11-.464 1.348-1.146.656-.267 1.997-.143 2.175l-.01.006-.011.007s-.2.288-.215.622c-.252-.1-.532-.048-.789.186-.202.184-.328.518-.225 1.01-.322-.089-.482.067-.364.409l.2.588c-.2.003-.286.156-.198.432.35.824.604 1.714.854 2.595a45 45 0 0 0 .563 1.87c.292.932.588 1.876.971 2.766.282.652.877.996 1.513 1.283 1.82.82 3.945 1.032 5.917 1.05 1.78.019 3.627-.137 5.325-.702.571-.19 1.162-.427 1.636-.805.6-.48.847-1.354 1.057-2.095l.064-.225c.473-1.634 1.019-3.233 1.568-4.84q.12-.347.238-.697c.118-.35-.043-.505-.37-.413q.168-.519.374-1.01c.13-.404-.117-.544-.557-.325q-.07.034-.14.079c0-.245-.108-.386-.207-.516l-.06-.08a.98.98 0 0 0-.938-.439c.511-.92.474-1.884-.246-2.613a2.9 2.9 0 0 0-.627-.476h-.002l-.032.01c.081-.273.115-.548.115-.81 0-1.183-.542-1.857-.865-2.153a3 3 0 0 0-.058-.32 1.7 1.7 0 0 0-.243-.555c-.556-.85-1.743-1.201-2.092-1.289-.2-.573-.49-1.11-.85-1.498a9.4 9.4 0 0 0-3.04-2.203m-.282 17.605a.304.304 0 0 1 .604-.008l.002.03.067 5.094-.001.03a.304.304 0 0 1-.604.009l-.002-.031-.067-5.093zm-2.5-.316a.304.304 0 0 1 .603-.053l.004.03.474 5.298a.304.304 0 0 1-.6.085l-.005-.031-.474-5.297zm4.93-.209a.304.304 0 0 1 .604.054l-.474 5.298a.304.304 0 0 1-.605-.054zm-7.13-.064a.304.304 0 0 1 .6-.082l.005.03.709 5.163.002.03a.304.304 0 0 1-.598.083l-.006-.03-.709-5.163zm9.33-.235a.304.304 0 0 1 .602.082l-.709 5.162a.304.304 0 0 1-.601-.082zm2.528-.653a.304.304 0 0 1 .592.137l-1.215 5.247a.304.304 0 0 1-.591-.137zm-14.145-.244a.304.304 0 0 1 .356.197l.009.03 1.214 5.212.006.031a.304.304 0 0 1-.589.137l-.008-.03-1.215-5.212-.005-.03a.304.304 0 0 1 .232-.335m8.52-3.702a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m-7.085-.354a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m11.792-.152a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m-9.261-1.366a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m6.427-1.215a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0M6.08 8.865a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m5.263-.202a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m4.808-2.581a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0M9.168 5.88a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m3.846-1.468a.405.405 0 1 1 .81 0 .405.405 0 0 1-.81 0m3.56 9.994c1.322-.438 2.343-1.128 2.979-1.893.912.548 1.465 1.2 1.525 1.903-.363.238-.697.617-.794.944.115-.393-.158-.559-.61-.391-.456.168-.91.603-1.004.99.095-.387-.205-.58-.668-.45-.462.13-.905.526-.977.906.07-.379-.253-.596-.721-.505-.469.09-.897.453-.947.829.048-.375-.3-.62-.772-.568-.476.053-.887.384-.913.757.026-.373-.34-.65-.818-.636s-.87.314-.874.687c.004-.373-.383-.68-.86-.705-.475-.024-.849.244-.83.617-.021-.374-.425-.71-.9-.773-.473-.062-.825.178-.783.555-.042-.376-.461-.751-.93-.85-.47-.1-.796.111-.734.494-.064-.383-.498-.79-.96-.93-.46-.14-.762.05-.675.438-.087-.389-.533-.834-.984-1.01s-.727-.014-.617.382c-.094-.338-.437-.738-.808-.983.125-.56.565-1.085 1.248-1.544.845.551 1.868 1.012 2.979 1.371h.002c3.107 1.004 6.908 1.209 9.447.365'/></svg>`;

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
    <link rel="icon" type="image/svg+xml" href="${FAVICON_HREF}">
    <link rel="preconnect" href="https://registry.npmmirror.com" crossorigin>
    <link rel="stylesheet" href="${FONT_STYLESHEET}">
    <link rel="stylesheet" href="/assets/css/note.css">
    <script src="${MARKED_SCRIPT}" integrity="sha384-KwzR5her+zXi/Bzz4PVrBjkrjsBZy9adZtt3jA6Jgj3/hzPihRUV6HqMONpTe7Ll" crossorigin="anonymous" defer></script>
    <script src="${PURIFY_SCRIPT}" integrity="sha384-80VlBZnyAwkkqtSfg5NhPyZff6nU4K/qniLBL8Jnm4KDv6jZhLiYtJbhglg/i9ww" crossorigin="anonymous" defer></script>
    <script type="module" src="/assets/js/note.js"></script>
</head>
<body>
    <header class="site-header page-width">
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
            <a class="action" href="${markdownPath}" download>下载便签</a>
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
