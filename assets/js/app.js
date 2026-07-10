import {
    copyText,
    formatDate,
    requestJson,
    requiredElement,
    setButtonLoading
} from "./shared.js";

const elements = {
    tabs: [...document.querySelectorAll("[data-tab]")],
    panels: [...document.querySelectorAll("[data-panel]")],
    shortenForm: requiredElement("shortenForm"),
    noteForm: requiredElement("noteForm"),
    originalUrl: requiredElement("originalUrl"),
    customSlug: requiredElement("customSlug"),
    noteTitle: requiredElement("noteTitle"),
    noteContent: requiredElement("noteContent"),
    shortenButton: requiredElement("shortenButton"),
    noteButton: requiredElement("noteButton"),
    result: requiredElement("result"),
    resultTitle: requiredElement("resultTitle"),
    resultTime: requiredElement("resultTime"),
    resultUrl: requiredElement("resultUrl"),
    resultDetail: requiredElement("resultDetail"),
    copyButton: requiredElement("copyButton"),
    error: requiredElement("errorMessage")
};

elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

elements.shortenForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = elements.originalUrl.value.trim();
    const customSlug = elements.customSlug.value.trim();

    if (!url) {
        showError("请输入要缩短的网址");
        elements.originalUrl.focus();
        return;
    }

    await submit(elements.shortenButton, "/shorten", {
        url,
        customSlug: customSlug || undefined
    }, (data) => {
        showResult({
            title: "短链地址:",
            url: data.shortUrl,
            detail: data.originalUrl,
            createdAt: data.createdAt
        });
    });
});

elements.noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();

    if (!content) {
        showError("便签正文不能为空");
        elements.noteContent.focus();
        return;
    }

    await submit(elements.noteButton, "/note", { title, content }, (data) => {
        showResult({
            title: "便签地址:",
            url: data.noteUrl,
            detail: `原始文件：${data.markdownUrl}`,
            createdAt: data.createdAt
        });
    });
});

elements.copyButton.addEventListener("click", async () => {
    const originalLabel = elements.copyButton.textContent;
    try {
        await copyText(elements.resultUrl.value);
        elements.copyButton.textContent = "已复制";
        elements.copyButton.classList.add("copied");
    } catch {
        showError("复制失败，请手动复制地址");
    } finally {
        window.setTimeout(() => {
            elements.copyButton.textContent = originalLabel;
            elements.copyButton.classList.remove("copied");
        }, 1600);
    }
});

async function submit(button, endpoint, payload, onSuccess) {
    setButtonLoading(button, true);
    hideFeedback();

    try {
        const data = await requestJson(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        onSuccess(data);
    } catch (error) {
        showError(error.message || "请求失败，请稍后重试");
    } finally {
        setButtonLoading(button, false);
    }
}

function activateTab(name) {
    elements.tabs.forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
    });

    elements.panels.forEach((panel) => {
        const active = panel.dataset.panel === name;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
    });
    hideFeedback();
}

function showResult({ title, url, detail, createdAt }) {
    elements.resultTitle.textContent = title;
    elements.resultUrl.value = url;
    elements.resultDetail.textContent = detail;
    elements.resultTime.textContent = formatDate(createdAt);
    elements.result.hidden = false;
    elements.error.hidden = true;
    elements.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
    elements.result.hidden = true;
    elements.error.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFeedback() {
    elements.result.hidden = true;
    elements.error.hidden = true;
}
