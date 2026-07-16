import { SLUG_PATTERN } from "./_lib/slug.js";
import { markdownFile, notFoundPage, notePage, plainTextFile } from "./_lib/render.js";
import {
    readNoteMarkdown,
    readNote,
    readUrl
} from "./_lib/storage.js";

export async function onRequest(context) {
    if (context.request.method !== "GET" && context.request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const requestedSlug = String(context.params.slug || "");
    const markdownRequest = requestedSlug.toLowerCase().endsWith(".md");
    const slug = markdownRequest ? requestedSlug.slice(0, -3) : requestedSlug;

    if (!SLUG_PATTERN.test(slug)) {
        return notFoundPage();
    }

    try {
        if (markdownRequest) {
            const markdown = await readNoteMarkdown(context.env, slug, context);
            if (markdown === null) return notFoundPage();
            return markdownFile(slug, markdown, context.request.method === "HEAD");
        }

        const note = await readNote(context.env, slug, context);
        if (note) {
            // 浏览器请求显示预览页；curl/wget 等不声明 text/html 的客户端直接拿原文，
            // 因此便签地址本身就是可 `curl | bash` 的直链。
            const acceptsHtml = (context.request.headers.get("Accept") || "").includes("text/html");
            if (acceptsHtml) {
                return notePage(note);
            }
            return plainTextFile(note.markdown, context.request.method === "HEAD");
        }

        const link = await readUrl(context.env, slug, context);
        if (link) {
            return new Response(null, {
                status: 302,
                headers: {
                    Location: link,
                    "Cache-Control": "public, max-age=300"
                }
            });
        }

        return notFoundPage();
    } catch (error) {
        console.error(`Failed to resolve slug ${slug}:`, error);
        return new Response("服务器暂时无法处理该请求", {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }
}
