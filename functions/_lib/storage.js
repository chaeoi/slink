export const keys = {
    url: (slug) => `url:${slug}`,
    note: (slug) => `note:${slug}`
};

export async function slugExists(env, slug) {
    const [url, note] = await Promise.all([
        env.SLINK_KV.get(keys.url(slug)),
        env.SLINK_KV.get(keys.note(slug))
    ]);
    return url !== null || note !== null;
}

export function readUrl(env, slug) {
    return env.SLINK_KV.get(keys.url(slug));
}

export function writeUrl(env, slug, originalUrl) {
    return env.SLINK_KV.put(keys.url(slug), originalUrl);
}

export async function readNote(env, slug) {
    const result = await env.SLINK_KV.getWithMetadata(keys.note(slug));
    if (result.value === null) return null;

    return {
        slug,
        title: result.metadata?.title || "",
        createdAt: result.metadata?.createdAt || ""
    };
}

export function readNoteMarkdown(env, slug) {
    return env.SLINK_KV.get(keys.note(slug));
}

export function writeNote(env, note, markdown) {
    return env.SLINK_KV.put(keys.note(note.slug), markdown, {
        metadata: {
            title: note.title,
            createdAt: note.createdAt
        }
    });
}
