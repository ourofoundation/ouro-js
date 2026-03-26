import { marked } from "marked";

/** Safe for double-quoted HTML attributes (e.g. data-latex). */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function mathSpanHtml(latex: string, displayMode: boolean): string {
  return `<span data-latex="${escapeHtmlAttr(latex)}" data-display-mode="${displayMode}"></span>`;
}

/** Same-line `$...$` that looks like a plain price (e.g. $5, $3.50) — not math. */
function isLikelyCurrencyAmount(s: string): boolean {
  return /^\d+(\.\d+)?$/.test(s);
}

/**
 * First `$` in `src` opens inline math only if it is not `$$` and the segment is not a bare amount.
 * Digit after `$` is allowed when the rest of the (same-line) formula contains obvious math syntax.
 */
function dollarInlineOpenOk(src: string): boolean {
  if (!src.startsWith("$") || src.startsWith("$$")) return false;
  const rest = src.slice(1);
  const c = rest[0];
  if (!c || c === " " || c === "\t" || c === "$") return false;
  if (!/\d/.test(c)) return true;
  return /[+\-*^_=\\{<>\/()[\]|]/.test(rest.slice(1));
}

/** Closing `$` for inline math at start of `src` (which must begin with a single `$`). */
function endIndexOfDollarInline(src: string): number {
  let i = 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") return -1;
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "$") {
      if (src[i + 1] === "$") {
        i += 2;
        continue;
      }
      return i;
    }
    i++;
  }
  return -1;
}

const katexDollarBlock = {
  name: "katexDollarBlock",
  level: "block",
  start(src: string) {
    const match = src.match(/\$\$/);
    return match ? match.index : undefined;
  },
  end(src: string) {
    const match = src.match(/\$\$/);
    return match ? (match.index ?? 0) + 2 : undefined;
  },
  tokenizer(src: string, tokens: any) {
    const rule = /^\$\$([\s\S]*?)\$\$/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "katexDollarBlock",
        raw: match[0],
        latex: match[1].trim(),
        displayMode: true,
      };
    }
  },
  renderer(token: any) {
    return mathSpanHtml(token.latex, true);
  },
};

const katexDollarInline = {
  name: "katexDollarInline",
  level: "inline",
  start(src: string) {
    const match = src.match(/\$(?!\$)/);
    return match ? match.index : undefined;
  },
  end(src: string) {
    const match = src.match(/\$(?!\$)/);
    return match ? (match.index ?? 0) + 1 : undefined;
  },
  tokenizer(src: string, tokens: any) {
    if (!dollarInlineOpenOk(src)) return;
    const close = endIndexOfDollarInline(src);
    if (close < 0) return;
    const latex = src.slice(1, close).trim();
    if (latex.length === 0 || isLikelyCurrencyAmount(latex)) return;
    return {
      type: "katexDollarInline",
      raw: src.slice(0, close + 1),
      latex,
      displayMode: false,
    };
  },
  renderer(token: any) {
    return mathSpanHtml(token.latex, false);
  },
};

const katexBlockParser = {
  name: "katexBlock",
  level: "block",
  start(src: string) {
    const match = src.match(/\\\[/);
    return match ? match.index : undefined;
  },
  end(src: string) {
    const match = src.match(/\s\\\]/);
    return match ? (match.index ?? 0) + (match[0]?.length ?? 0) : undefined;
  },
  tokenizer(src: string, tokens: any) {
    const displayRule = /^\\\[([\s\S]*?)\\\]/;
    const match = displayRule.exec(src);
    if (match) {
      return {
        type: "katexBlock",
        raw: match[0],
        latex: match[1].trim(),
        displayMode: true,
      };
    }
  },
  renderer(token: any) {
    // Non-self-closing span is important for client-side inline flow around the node.
    return mathSpanHtml(token.latex, token.displayMode);
  },
};

const katexInlineParser = {
  name: "katexInline",
  level: "inline",
  start(src: string) {
    const match = src.match(/\\\(/);
    return match ? match.index : undefined;
  },
  end(src: string) {
    const match = src.match(/\s\\\)/);
    return match ? (match.index ?? 0) + (match[0]?.length ?? 0) : undefined;
  },
  tokenizer(src: string, tokens: any) {
    const inlineRule = /^\\\(([\s\S]*?)\\\)/;
    const match = inlineRule.exec(src);
    if (match) {
      return {
        type: "katexInline",
        raw: match[0],
        latex: match[1].trim(),
        displayMode: false,
      };
    }
  },
  renderer(token: any) {
    // STRANGE: The non-self-closing tag is important for client side to render as inline and render text after it
    return mathSpanHtml(token.latex, token.displayMode);
  },
};

const assetComponentExtension = {
  name: "assetComponent",
  level: "block",
  start(src: string) {
    return src.match(/^```assetComponent/)?.index;
  },
  end(src: string) {
    return src.match(/^```/)?.index;
  },
  tokenizer(src: string, tokens: any) {
    const rule = /^```assetComponent\s+(\{[\s\S]*?\})\n```/;
    const match = rule.exec(src);
    if (match) {
      const token = {
        type: "assetComponent",
        raw: match[0],
        properties: match[1],
        tokens: [],
      };
      return token;
    }
  },
  renderer(token: any) {
    let properties;
    try {
      properties = JSON.parse(token.properties);
    } catch (e) {
      console.error("Invalid JSON in assetComponent properties:", e);
      properties = {};
    }
    const componentHtml = `
        <asset-component ${Object.entries(properties)
        .map(([key, value]) => {
          // Stringify arrays and objects, keep primitives as-is
          const stringValue = typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : String(value);
          // Escape quotes for HTML attributes
          const escapedValue = stringValue.replace(/"/g, '&quot;');
          return `${key}="${escapedValue}"`;
        })
        .join(" ")}></asset-component>`;

    return componentHtml;
  },
};

const userMentionExtension = {
  name: "userMention",
  level: "inline",
  start(src: string) {
    const m = src.match(/`\{@|(?<![`])\{@/);
    return m ? m.index : undefined;
  },
  end(src: string) {
    return src.match(/\}`/)?.index ?? src.match(/(?<![`])\{@[^}]*\}/)?.index;
  },
  tokenizer(src: string, tokens: any) {
    const codeWrapped = /^`\{@([a-zA-Z0-9_]+)\}`/.exec(src);
    if (codeWrapped) {
      return {
        type: "userMention",
        raw: codeWrapped[0],
        username: codeWrapped[1],
      };
    }
    const bracesOnly = /^\{@([a-zA-Z0-9_]+)\}/.exec(src);
    if (bracesOnly) {
      return {
        type: "userMention",
        raw: bracesOnly[0],
        username: bracesOnly[1],
      };
    }
  },
  renderer(token: any) {
    const u = escapeHtmlAttr(token.username);
    return `<user-mention username="${u}" data-label="${u}"></user-mention>`;
  },
};

marked.use({
  gfm: true,
  extensions: [
    assetComponentExtension,
    userMentionExtension,
    katexDollarBlock,
    katexBlockParser,
    katexDollarInline,
    katexInlineParser,
  ],
  renderer: {
    list(token: any) {
      if (
        !token.ordered &&
        token.items?.length > 0 &&
        token.items.every((item: any) => item.task)
      ) {
        const body = token.items
          .map((item: any) => {
            const inner = item.tokens.filter(
              (t: any) => t.type !== "checkbox"
            );
            let text = (this as any).parser.parse(inner, !!item.loose);
            if (!item.loose) text = `<p>${text}</p>`;
            const checked = item.checked ? "true" : "false";
            const ckAttr = item.checked ? ' checked="checked"' : "";
            return `<li data-type="taskItem" data-checked="${checked}"><label contenteditable="false"><input type="checkbox"${ckAttr}></label><div>${text}</div></li>`;
          })
          .join("\n");
        return `<ul data-type="taskList">\n${body}\n</ul>\n`;
      }
      return false as any;
    },
  },
});

export function parseMarkdown(markdown: string) {
  return marked.parse(markdown);
}
