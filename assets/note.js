(function () {
    "use strict";

    const source = document.getElementById("noteSource");
    const content = document.getElementById("noteContent");
    const notification = document.getElementById("copyNotification");

    if (!source || !content) {
        return;
    }

    const rawMarkdown = readSource(source);
    content.innerHTML = renderMarkdown(rawMarkdown);
    bindPageActions(rawMarkdown);

    function readSource(element) {
        try {
            return JSON.parse(element.textContent || "\"\"");
        } catch (error) {
            console.error("Failed to parse note content:", error);
            return "";
        }
    }

    function renderMarkdown(markdown) {
        if (!markdown.trim()) {
            return '<p class="note-loading">暂无内容</p>';
        }

        const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
        const html = [];
        let paragraph = [];
        let listType = null;
        let listItems = [];

        function flushParagraph() {
            if (!paragraph.length) return;
            html.push(`<p>${inline(paragraph.join(" "))}</p>`);
            paragraph = [];
        }

        function flushList() {
            if (!listType) return;
            const items = listItems.map((item) => `<li>${inline(item)}</li>`).join("");
            html.push(`<${listType}>${items}</${listType}>`);
            listType = null;
            listItems = [];
        }

        function flushBlocks() {
            flushParagraph();
            flushList();
        }

        for (let index = 0; index < lines.length; index += 1) {
            const trimmed = lines[index].trim();

            if (!trimmed) {
                flushBlocks();
                continue;
            }

            const fence = trimmed.match(/^```([A-Za-z0-9_-]+)?\s*$/);
            if (fence) {
                flushBlocks();
                const codeLines = [];
                index += 1;
                while (index < lines.length && !lines[index].trim().startsWith("```")) {
                    codeLines.push(lines[index]);
                    index += 1;
                }
                html.push(codeBlock(codeLines.join("\n"), fence[1] || "text"));
                continue;
            }

            const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                flushBlocks();
                const level = heading[1].length;
                html.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
                continue;
            }

            if (/^-{3,}$/.test(trimmed)) {
                flushBlocks();
                html.push("<hr>");
                continue;
            }

            if (/^>\s?/.test(trimmed)) {
                flushBlocks();
                const quoteLines = [trimmed.replace(/^>\s?/, "")];
                while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1].trim())) {
                    index += 1;
                    quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
                }
                html.push(`<blockquote><p>${inline(quoteLines.join(" "))}</p></blockquote>`);
                continue;
            }

            const unordered = trimmed.match(/^[-*]\s+(.+)$/);
            const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
            if (unordered || ordered) {
                flushParagraph();
                const nextListType = ordered ? "ol" : "ul";
                if (listType && listType !== nextListType) {
                    flushList();
                }
                listType = nextListType;
                listItems.push((unordered || ordered)[1]);
                continue;
            }

            flushList();
            paragraph.push(trimmed);
        }

        flushBlocks();
        return html.join("");
    }

    function codeBlock(code, lang) {
        return `
            <div class="code-block" data-lang="${escapeHtml(lang)}">
                <button class="copy-code" type="button" aria-label="复制代码" data-code-copy>复制</button>
                <pre><code>${escapeHtml(code)}</code></pre>
            </div>
        `;
    }

    function inline(text) {
        const tokens = [];

        function keep(value) {
            const token = `%%SLINK_TOKEN_${tokens.length}%%`;
            tokens.push(value);
            return token;
        }

        let prepared = text.replace(/`([^`\n]+)`/g, (_, code) => {
            return keep(`<code>${escapeHtml(code)}</code>`);
        });

        prepared = prepared.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
            const safeUrl = sanitizeUrl(url);
            return keep(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
        });

        let html = escapeHtml(prepared);
        html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

        tokens.forEach((value, index) => {
            html = html.replace(`%%SLINK_TOKEN_${index}%%`, value);
        });

        return html;
    }

    function bindPageActions(markdown) {
        document.querySelector('[data-note-copy="content"]')?.addEventListener("click", () => {
            copyText(markdown, "内容已复制到剪贴板");
        });

        document.querySelector('[data-note-copy="url"]')?.addEventListener("click", () => {
            copyText(window.location.href, "链接已复制到剪贴板");
        });

        content.querySelectorAll("[data-code-copy]").forEach((button) => {
            button.addEventListener("click", () => {
                const code = button.closest(".code-block")?.querySelector("code")?.textContent || "";
                copyText(code, "代码已复制").then((success) => {
                    if (!success) return;
                    button.classList.add("copied");
                    button.textContent = "已复制";
                    window.setTimeout(() => {
                        button.classList.remove("copied");
                        button.textContent = "复制";
                    }, 1600);
                });
            });
        });
    }

    async function copyText(text, successMessage) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else if (!fallbackCopy(text)) {
                throw new Error("copy failed");
            }
            showNotification(successMessage);
            return true;
        } catch (error) {
            console.error("Clipboard write failed:", error);
            if (fallbackCopy(text)) {
                showNotification(successMessage);
                return true;
            }
            showNotification("复制失败，请手动选择复制");
            return false;
        }
    }

    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.style.opacity = "0";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);
        return success;
    }

    function showNotification(message) {
        if (!notification) return;
        notification.textContent = message;
        notification.classList.add("show");
        window.setTimeout(() => {
            notification.classList.remove("show");
        }, 2400);
    }

    function sanitizeUrl(url) {
        const trimmed = url.trim();
        if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) {
            return trimmed;
        }
        return "#";
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();
