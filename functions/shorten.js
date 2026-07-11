import { handleError, HttpError, json, methodNotAllowed, readJson } from "./_lib/http.js";
import { createUniqueSlug, validateCustomSlug } from "./_lib/slug.js";
import { slugExists, writeUrl } from "./_lib/storage.js";

const MAX_URL_LENGTH = 8192;

export function onRequest(context) {
    if (context.request.method !== "POST") {
        return methodNotAllowed(["POST"]);
    }
    return createShortUrl(context);
}

async function createShortUrl({ request, env }) {
    try {
        const body = await readJson(request);
        const originalUrl = normalizeHttpUrl(body.url);

        let slug;
        if (body.customSlug) {
            slug = validateCustomSlug(body.customSlug);
            if (await slugExists(env, slug)) {
                throw new HttpError(409, "该短码已被使用");
            }
        } else {
            slug = await createUniqueSlug((candidate) => slugExists(env, candidate));
        }

        const createdAt = new Date().toISOString();
        await writeUrl(env, slug, originalUrl);

        const origin = new URL(request.url).origin;
        return json({
            success: true,
            slug,
            originalUrl,
            createdAt,
            shortUrl: `${origin}/${slug}`
        }, 201);
    } catch (error) {
        return handleError(error, "URL creation failed");
    }
}

function normalizeHttpUrl(value) {
    let candidate = String(value || "").trim();
    if (!candidate) {
        throw new HttpError(400, "请输入要缩短的网址");
    }
    if (candidate.length > MAX_URL_LENGTH) {
        throw new HttpError(400, "网址过长");
    }
    if (!/^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(candidate)) {
        candidate = `https://${candidate}`;
    }

    try {
        const url = new URL(candidate);
        if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
            throw new Error("unsupported protocol");
        }
        return url.href;
    } catch {
        throw new HttpError(400, "请输入有效的 HTTP 或 HTTPS 网址");
    }
}
