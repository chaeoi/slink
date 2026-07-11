export async function requestJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("服务器返回了无法识别的响应");
        }
    }

    if (!response.ok) {
        throw new Error(data?.error || `请求失败（HTTP ${response.status}）`);
    }
    return data;
}

export async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall through when clipboard permission is denied.
        }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.inset = "-9999px auto auto -9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
        if (!document.execCommand("copy")) throw new Error("copy failed");
    } finally {
        textarea.remove();
    }
}

export function setButtonLoading(button, loading) {
    button.disabled = loading;
    button.querySelector("[data-label]").hidden = loading;
    button.querySelector("[data-loading]").hidden = !loading;
}

export function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

export function requiredElement(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing required element: #${id}`);
    return element;
}
