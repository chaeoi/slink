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

export function highlightCode(code, language) {
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
            if (candidate?.[0]) {
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

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}
