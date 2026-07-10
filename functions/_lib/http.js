const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
};

export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: JSON_HEADERS
    });
}

export async function readJson(request) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
        throw new HttpError(415, "请求必须使用 application/json");
    }

    try {
        return await request.json();
    } catch {
        throw new HttpError(400, "请求正文不是有效的 JSON");
    }
}

export function methodNotAllowed(allowedMethods) {
    return new Response("Method Not Allowed", {
        status: 405,
        headers: {
            Allow: allowedMethods.join(", "),
            "Content-Type": "text/plain; charset=utf-8"
        }
    });
}

export function handleError(error, scope) {
    if (error instanceof HttpError) {
        return json({ error: error.message }, error.status);
    }

    console.error(`${scope}:`, error);
    return json({ error: "服务器内部错误" }, 500);
}

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}
