import { copyText, requiredElement } from "./shared.js";

const content = requiredElement("noteContent");
const toast = requiredElement("toast");
let rawMarkdown = "";
let toastTimer = null;

const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};
const SHELL_RULES = shellRules();
const HIGHLIGHT_RULES = {
    bash: SHELL_RULES,
    sh: SHELL_RULES,
    shell: SHELL_RULES,
    json: [
        { className: "property", expression: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
        { className: "string", expression: /"(?:\\.|[^"\\])*"/y },
        { className: "keyword", expression: /\b(?:true|false|null)\b/y },
        { className: "number", expression: /-?\b\d+(?:\.\d+)?\b/y },
        { className: "punctuation", expression: /[{}[\]:,]/y }
    ],
    ini: [
        { className: "comment", expression: /[#;][^\n]*/y },
        { className: "section", expression: /\[[^\]\n]*\]/y },
        { className: "property", expression: /[A-Za-z0-9_.-]+(?=\s*=)/y },
        { className: "operator", expression: /=/y },
        { className: "number", expression: /\b\d+\b/y }
    ]
};

initialize();

async function initialize() {
    try {
        assertRendererDependencies();
        rawMarkdown = await fetchMarkdown(content.dataset.source);
        const rendered = window.marked.parse(rawMarkdown, {
            gfm: true,
            breaks: false
        });
        content.innerHTML = window.DOMPurify.sanitize(rendered, {
            USE_PROFILES: { html: true }
        });
        enhanceRenderedContent();
        bindActions();
    } catch (error) {
        console.error("Note rendering failed:", error);
        content.innerHTML = `<div class="render-error"><h2>正文加载失败</h2><p>${escapeHtml(error.message || "请稍后重试")}</p></div>`;
    }
}

async function fetchMarkdown(source) {
    if (!source) throw new Error("页面没有指定 Markdown 地址");
    const response = await fetch(source, { cache: "no-cache" });
    if (!response.ok) throw new Error(`无法读取 Markdown（HTTP ${response.status}）`);
    return response.text();
}

function assertRendererDependencies() {
    if (!window.marked || !window.DOMPurify) {
        throw new Error("Markdown 渲染组件加载失败");
    }
}

function enhanceRenderedContent() {
    addHeadingAnchors();
    wrapTables();
    enhanceCodeBlocks();

    content.querySelectorAll("a[href]").forEach((link) => {
        if (!link.hash || link.origin !== window.location.origin || link.pathname !== window.location.pathname) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
    });

    content.querySelectorAll("img").forEach((image) => {
        image.loading = "lazy";
        image.decoding = "async";
    });
}

function addHeadingAnchors() {
    const usedIds = new Set();
    content.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
        const baseId = slugify(heading.textContent);
        let id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
        usedIds.add(id);
        heading.id = id;
    });
}

function wrapTables() {
    content.querySelectorAll("table").forEach((table) => {
        const wrapper = document.createElement("div");
        wrapper.className = "table-wrap";
        wrapper.tabIndex = 0;
        table.before(wrapper);
        wrapper.appendChild(table);
    });
}

function enhanceCodeBlocks() {
    content.querySelectorAll("pre > code").forEach((code) => {
        const pre = code.parentElement;
        if (pre.closest(".code-block")) return;

        const languageClass = [...code.classList].find((name) => name.startsWith("language-"));
        const language = languageClass?.slice("language-".length) || "text";
        const source = code.textContent.replace(/\n$/, "");
        code.innerHTML = highlightCode(source, language);

        const wrapper = document.createElement("div");
        wrapper.className = "code-block";
        wrapper.dataset.language = language;
        pre.before(wrapper);
        wrapper.append(createCopyButton(), pre);
    });
}

function createCopyButton() {
    const button = document.createElement("button");
    button.className = "copy-code";
    button.type = "button";
    button.dataset.copyCode = "";
    button.title = "复制代码";
    button.setAttribute("aria-label", "复制代码");
    button.textContent = "复制";
    return button;
}

function bindActions() {
    document.addEventListener("click", async (event) => {
        const codeButton = event.target.closest("[data-copy-code]");
        if (codeButton) {
            const code = codeButton.closest(".code-block")?.querySelector("code")?.textContent || "";
            await copyWithFeedback(code, "代码已复制", codeButton);
            return;
        }

        const action = event.target.closest("[data-copy]");
        if (!action) return;
        const text = action.dataset.copy === "content" ? rawMarkdown : window.location.href;
        await copyWithFeedback(text, action.dataset.copy === "content" ? "Markdown 已复制" : "链接已复制");
    });
}

async function copyWithFeedback(text, message, button = null) {
    try {
        await copyText(text);
        showToast(message);
        if (button) {
            button.textContent = "已复制";
            button.classList.add("copied");
            window.setTimeout(() => {
                button.textContent = "复制";
                button.classList.remove("copied");
            }, 1400);
        }
    } catch {
        showToast("复制失败，请手动选择复制", true);
    }
}

function showToast(message, error = false) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function highlightCode(code, language) {
    const rules = HIGHLIGHT_RULES[language.toLowerCase()];
    if (!rules) return escapeHtml(code);

    let output = "";
    let index = 0;
    let plainStart = 0;
    while (index < code.length) {
        let token = "";
        let tokenClass = "";
        for (const rule of rules) {
            rule.expression.lastIndex = index;
            const candidate = rule.expression.exec(code);
            if (candidate?.index === index && candidate[0]) {
                token = candidate[0];
                tokenClass = rule.className;
                break;
            }
        }

        if (!token) {
            index += 1;
            continue;
        }

        output += escapeHtml(code.slice(plainStart, index));
        output += `<span class="token-${tokenClass}">${escapeHtml(token)}</span>`;
        index += token.length;
        plainStart = index;
    }
    return output + escapeHtml(code.slice(plainStart));
}

function shellRules() {
    return [
        { className: "comment", expression: /#[^\n]*/y },
        { className: "string", expression: /"(?:\\.|[^"\\])*"|'[^']*'/y },
        { className: "keyword", expression: /\b(?:sudo|cd|mkdir|touch|wget|curl|unzip|mv|rm|chmod|cat|vi|docker|systemctl|grep|find|echo|apt)\b/y },
        { className: "operator", expression: /(?:&&|\|\||\||\\)/y },
        { className: "number", expression: /\b\d+\b/y }
    ];
}

function slugify(value) {
    const slug = String(value)
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || "section";
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}
