import { marked } from "marked";

const katexParser = {
  name: "katex",
  level: "inline",
  start(src: string) {
    const match = src.match(/\\\[|\\\(/);
    return match ? match.index : undefined;
  },
  end(src: string) {
    const match = src.match(/\s\\\]|\s\\\)/);
    return match ? (match.index ?? 0) + (match[0]?.length ?? 0) : undefined;
  },
  tokenizer(src: string, tokens: any) {
    const displayRule = /^\\\[([\s\S]*?)\\\]/;
    const inlineRule = /^\\\(([\s\S]*?)\\\)/;

    let match = displayRule.exec(src);
    if (match) {
      return {
        type: "katex",
        raw: match[0],
        latex: match[1].trim(),
        displayMode: true,
      };
    }
    match = inlineRule.exec(src);
    if (match) {
      return {
        type: "katex",
        raw: match[0],
        latex: match[1].trim(),
        displayMode: false,
      };
    }
  },
  renderer(token: any) {
    // STRANGE: The non-self-closing tag is important for client side to render as inline and render text after it
    return `<span data-latex="${token.latex}" data-display-mode="${token.displayMode}"></span>`;
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
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ")}></asset-component>`;

    return componentHtml;
  },
};

const userMentionExtension = {
  name: "userMention",
  level: "inline",
  start(src: string) {
    return src.match(/`\{@/)?.index;
  },
  end(src: string) {
    return src.match(/\}`/)?.index;
  },
  tokenizer(src: string, tokens: any) {
    const rule = /^`\{@([a-zA-Z0-9_]+)\}`/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "userMention",
        raw: match[0],
        username: match[1],
      };
    }
  },
  renderer(token: any) {
    return `<user-mention username="${token.username}" data-label="${token.username}"></user-mention>`;
  },
};

marked.use({
  gfm: true,
  extensions: [assetComponentExtension, userMentionExtension, katexParser],
});

export function parseMarkdown(markdown: string) {
  return marked.parse(markdown);
}
