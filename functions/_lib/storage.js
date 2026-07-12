const TTL_SECONDS = 60 * 60 * 24 * 90;
const RENEW_THRESHOLD_SECONDS = 60 * 60 * 24 * 30;

export const keys = {
    url: (slug) => `url:${slug}`,
    note: (slug) => `note:${slug}`
};

function expiresAtFromNow() {
    return Math.floor(Date.now() / 1000) + TTL_SECONDS;
}

function shouldRenew(metadata) {
    const expiresAt = Number(metadata?.expiresAt);
    if (!Number.isFinite(expiresAt)) return true;
    return expiresAt - Date.now() / 1000 < RENEW_THRESHOLD_SECONDS;
}

// 读取并在剩余寿命不足 30 天时重写以续期 90 天。
// 提供 ctx 时续期在响应返回后异步完成，不阻塞请求。
async function readWithRenewal(env, key, ctx) {
    const { value, metadata } = await env.SLINK_KV.getWithMetadata(key);
    if (value === null) return { value: null, metadata: null };

    if (shouldRenew(metadata)) {
        const renewedMetadata = { ...(metadata || {}), expiresAt: expiresAtFromNow() };
        const renewal = env.SLINK_KV.put(key, value, {
            expirationTtl: TTL_SECONDS,
            metadata: renewedMetadata
        });
        if (ctx?.waitUntil) {
            ctx.waitUntil(renewal.catch((error) => console.error(`Failed to renew ${key}:`, error)));
        } else {
            await renewal;
        }
        return { value, metadata: renewedMetadata };
    }

    return { value, metadata };
}

export async function slugExists(env, slug) {
    const [url, note] = await Promise.all([
        env.SLINK_KV.get(keys.url(slug)),
        env.SLINK_KV.get(keys.note(slug))
    ]);
    return url !== null || note !== null;
}

export async function readUrl(env, slug, ctx) {
    const { value } = await readWithRenewal(env, keys.url(slug), ctx);
    return value;
}

export function writeUrl(env, slug, originalUrl) {
    return env.SLINK_KV.put(keys.url(slug), originalUrl, {
        expirationTtl: TTL_SECONDS,
        metadata: { expiresAt: expiresAtFromNow() }
    });
}

export async function readNote(env, slug, ctx) {
    const { value, metadata } = await readWithRenewal(env, keys.note(slug), ctx);
    if (value === null) return null;

    return {
        slug,
        title: metadata?.title || "",
        createdAt: metadata?.createdAt || "",
        markdown: value
    };
}

export async function readNoteMarkdown(env, slug, ctx) {
    const { value } = await readWithRenewal(env, keys.note(slug), ctx);
    return value;
}

export function writeNote(env, note, markdown) {
    return env.SLINK_KV.put(keys.note(note.slug), markdown, {
        expirationTtl: TTL_SECONDS,
        metadata: {
            title: note.title,
            createdAt: note.createdAt,
            expiresAt: expiresAtFromNow()
        }
    });
}
