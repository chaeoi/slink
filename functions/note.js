import { handleError, HttpError, json, methodNotAllowed, readJson } from "./_lib/http.js";
import { createUniqueSlug } from "./_lib/slug.js";
import { slugExists, writeNote } from "./_lib/storage.js";

const MAX_TITLE_LENGTH = 160;
const MAX_MARKDOWN_LENGTH = 500_000;

export function onRequest(context) {
    if (context.request.method !== "POST") {
        return methodNotAllowed(["POST"]);
    }
    return createNote(context);
}

async function createNote({ request, env }) {
    try {
        const body = await readJson(request);
        const markdown = String(body.content || "").trim();
        const title = String(body.title || "").trim();

        if (!markdown) {
            throw new HttpError(400, "便签内容不能为空");
        }
        if (markdown.length > MAX_MARKDOWN_LENGTH) {
            throw new HttpError(413, "便签正文不能超过 500,000 个字符");
        }
        if (title.length > MAX_TITLE_LENGTH) {
            throw new HttpError(400, "便签标题不能超过 160 个字符");
        }

        const slug = await createUniqueSlug((candidate) => slugExists(env, candidate));
        const note = {
            slug,
            title,
            createdAt: new Date().toISOString()
        };

        await writeNote(env, note, markdown);

        const origin = new URL(request.url).origin;
        return json({
            success: true,
            slug,
            title,
            createdAt: note.createdAt,
            noteUrl: `${origin}/${slug}`,
            markdownUrl: `${origin}/${slug}.md`
        }, 201);
    } catch (error) {
        return handleError(error, "Note creation failed");
    }
}
