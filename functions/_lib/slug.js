import { HttpError } from "./http.js";

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function validateCustomSlug(value) {
    const slug = String(value || "").trim();
    if (!SLUG_PATTERN.test(slug)) {
        throw new HttpError(400, "自定义短码只能包含 1-64 位字母、数字、下划线和连字符");
    }
    return slug;
}

export async function createUniqueSlug(isTaken, length = 4, maxAttempts = 12) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const slug = randomSlug(length);
        if (!(await isTaken(slug))) {
            return slug;
        }
    }

    throw new HttpError(503, "暂时无法生成唯一短码，请重试");
}

function randomSlug(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => RANDOM_ALPHABET[byte % RANDOM_ALPHABET.length]).join("");
}
