import { Content } from "../../schema/posts";
import { Profile } from "../../schema/users";

export interface DataFilter {
  column: string;
  value: string;
  operator: string;
  active?: boolean;
}

export interface DisplayConfig {
  /** Dataset: ID of a saved visualization to render instead of the default chart. */
  visualizationId?: string | null;
  /** Dataset: column filters applied to the data. */
  filters?: DataFilter[];
  /** Route: ID of a specific action to preview (status, logs, side-effect assets). */
  actionId?: string | null;
  /** Route: author-provided defaults for an interactive route form. */
  defaultValues?: Record<string, unknown>;
}

/**
 * Normalize legacy viewMode values to the current set.
 * "chart" → "preview", "default" → "card", anything else → "card".
 */
export function normalizeViewMode(
  raw: string | undefined | null
): "card" | "preview" | "interactive" | "list" {
  if (raw === "default") return "card";
  if (raw === "chart") return "preview";
  if (
    raw === "preview" ||
    raw === "interactive" ||
    raw === "card" ||
    raw === "list"
  )
    return raw;
  return "card";
}

/**
 * Build a DisplayConfig from node/element attributes, handling the legacy
 * flat `visualizationId` / `filters` attrs and the new `displayConfig` object.
 * Prefers values inside `displayConfig` when present.
 */
export function resolveDisplayConfig(attrs: {
  displayConfig?: DisplayConfig | string | null;
  visualizationId?: string | null;
  filters?: DataFilter[] | string | null;
}): DisplayConfig {
  let base: DisplayConfig = {};

  if (attrs.displayConfig) {
    base =
      typeof attrs.displayConfig === "string"
        ? JSON.parse(attrs.displayConfig)
        : { ...attrs.displayConfig };
  }

  // Fall back to legacy flat attrs when displayConfig doesn't carry them
  if (base.visualizationId === undefined && attrs.visualizationId) {
    base.visualizationId = attrs.visualizationId;
  }
  if (base.filters === undefined && attrs.filters) {
    const raw = attrs.filters;
    base.filters =
      typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  return base;
}

export interface InlineAssetAttrs {
  id: string;
  assetType: string;
  viewMode: "card" | "preview" | "interactive" | "list";
  displayConfig?: DisplayConfig | null;
  /** @deprecated Use displayConfig.filters */
  filters?: any;
  /** @deprecated Use displayConfig.visualizationId */
  visualizationId?: string | null;
  partial?: boolean;
}

/** Assets pulled from Air JSON: embedded blocks or link href shorthands. */
export type ExtractedContentAsset =
  | { id: string; assetType: string; via: "embed" }
  | { id: string; assetType: string; via: "link"; legacy: false }
  | { id: string; via: "link"; legacy: true };

interface LinkedAssetRef {
  assetType: string;
  entity: string;
  slug: string;
}

/** UUID v4 pattern for inline link hrefs */
const UUID_RE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Shorthand link hrefs: `post:<uuid>`, `file:<uuid>`, … (preferred over legacy `asset:<uuid>`). */
const TYPED_ASSET_LINK_RE = new RegExp(
  `^(post|dataset|file|service|route|quest):(${UUID_RE})$`,
  "i"
);

/** @deprecated Prefer `post:<uuid>` etc.; still supported and resolved server-side. */
const LEGACY_ASSET_LINK_RE = new RegExp(`^asset:(${UUID_RE})$`, "i");

/** Route action link hrefs: `action:<uuid>` → history page for that run. */
const ACTION_LINK_RE = new RegExp(`^action:(${UUID_RE})$`, "i");

/**
 * Collapsed wiki-link form agents often write: `[dataset:<uuid>]` instead of
 * `[label](dataset:<uuid>)`. Negative lookahead skips real markdown links
 * whose label happens to be the shorthand (`[dataset:<uuid>](…)`).
 */
const ASSET_WIKI_LINK_RE = new RegExp(
  `\\[(post|dataset|file|service|route|quest|asset|action):(${UUID_RE})\\](?!\\()`,
  "gi"
);

const VALID_ASSET_TYPES = new Set([
  "post",
  "dataset",
  "file",
  "service",
  "route",
  "quest",
]);

export type ExtractedContentAction = { id: string; via: "link" };

/**
 * Parse an inline link `href` for Ouro asset shorthands.
 * - `post:<uuid>`, `file:<uuid>`, … → typed (asset type known from prefix)
 * - `asset:<uuid>` → legacy (type resolved via DB when creating connections)
 */
function parseAssetLinkShorthand(
  href: string
):
  | { id: string; assetType: string; legacy: false }
  | { id: string; legacy: true }
  | null {
  const typed = TYPED_ASSET_LINK_RE.exec(href);
  if (typed) {
    const assetType = typed[1].toLowerCase();
    if (!VALID_ASSET_TYPES.has(assetType)) return null;
    return { id: typed[2], assetType, legacy: false };
  }
  const legacy = LEGACY_ASSET_LINK_RE.exec(href);
  if (legacy) return { id: legacy[1], legacy: true };
  return null;
}

/**
 * Parse an inline link `href` for a route action shorthand: `action:<uuid>`.
 * Actions are not assets — callers must resolve them separately.
 */
function parseActionLinkShorthand(href: string): { id: string } | null {
  const match = ACTION_LINK_RE.exec(href);
  if (!match) return null;
  return { id: match[1] };
}

export type AssetWikiLinkMatch =
  | { raw: string; href: string; id: string; assetType: string; legacy: false }
  | { raw: string; href: string; id: string; legacy: true }
  | { raw: string; href: string; id: string; action: true };

/**
 * Find collapsed `[dataset:<uuid>]` / `[action:<uuid>]` spans in a text node.
 * Skips `[shorthand](href)` markdown links via the regex lookahead.
 */
function extractAssetWikiLinks(text: string): AssetWikiLinkMatch[] {
  if (!text) return [];
  const matches: AssetWikiLinkMatch[] = [];
  const re = new RegExp(ASSET_WIKI_LINK_RE.source, ASSET_WIKI_LINK_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const kind = match[1].toLowerCase();
    const id = match[2];
    const href = `${kind}:${id}`;
    if (kind === "action") {
      matches.push({ raw: match[0], href, id, action: true });
    } else if (kind === "asset") {
      matches.push({ raw: match[0], href, id, legacy: true });
    } else if (VALID_ASSET_TYPES.has(kind)) {
      matches.push({ raw: match[0], href, id, assetType: kind, legacy: false });
    }
  }
  return matches;
}

/**
 * Parse an Ouro site URL into its asset components.
 * Accepts both absolute URLs (https://ouro.foundation/posts/entity/slug)
 * and relative paths (/posts/entity/slug).
 */
function parseOuroAssetUrl(
  href: string,
  siteUrl?: string
): LinkedAssetRef | null {
  let pathname: string;
  try {
    if (href.startsWith("/")) {
      pathname = href;
    } else {
      const url = new URL(href);
      if (siteUrl) {
        const siteHost = new URL(siteUrl).host;
        if (url.host !== siteHost) return null;
      }
      pathname = url.pathname;
    }
  } catch {
    return null;
  }

  // Pattern: /{assetType}s/{entity}/{slug}
  const match = pathname.match(
    /^\/(\w+)s\/([^/]+)\/([^/?#]+)/
  );
  if (!match) return null;

  const [, assetType, entity, slug] = match;
  if (!VALID_ASSET_TYPES.has(assetType)) return null;

  return { assetType, entity: decodeURIComponent(entity), slug: decodeURIComponent(slug) };
}

const extractContent = (item: any): any => {
  if (Array.isArray(item)) return item.map(extractContent);
  if (item?.content) {
    if (Array.isArray(item.content))
      return item.content.map(extractContent).flat();
    else return extractContent(item.content);
  } else return item; // leaf
};

function getReferencesInContent(
  json: Content["json"],
  options?: { siteUrl?: string }
) {
  if (!json || !json?.content)
    return { users: [], assets: [], actions: [], linkedAssets: [] };
  const content = json.content.map(extractContent).flat();

  const users = content
    .filter((item: any) => item.type === "mention")
    .map((item: any) => ({
      user_id: item.attrs?.id,
      username: item.attrs?.label || item.attrs?.username,
    }))
    .reduce((unique: any[], item: any) => {
      if (
        !unique.some(
          (u) =>
            (u.user_id && item.user_id && u.user_id === item.user_id) ||
            (u.username && item.username && u.username === item.username)
        )
      ) {
        unique.push(item);
      }
      return unique;
    }, []) as Partial<Profile>[];

  const assets: ExtractedContentAsset[] = content
    .filter(
      (item: any) =>
        item.type === "assetComponent" && item.attrs?.id && !item.attrs?.partial
    )
    .map(({ attrs }: { attrs: InlineAssetAttrs }) => ({
      id: attrs.id,
      assetType: attrs.assetType,
      via: "embed" as const,
    }))
    .reduce((unique: ExtractedContentAsset[], item: ExtractedContentAsset) => {
      if (!unique.some((u) => u.id === item.id)) {
        unique.push(item);
      }
      return unique;
    }, []);

  // Extract asset / action references from link marks
  const linkedAssets: LinkedAssetRef[] = [];
  const actions: ExtractedContentAction[] = [];
  const seenAssetIds = new Set(assets.map((a) => a.id));
  const seenActionIds = new Set<string>();
  const seenLinkedKeys = new Set<string>();

  const addWikiRefs = (text: string) => {
    for (const wiki of extractAssetWikiLinks(text)) {
      if ("action" in wiki && wiki.action) {
        if (!seenActionIds.has(wiki.id)) {
          seenActionIds.add(wiki.id);
          actions.push({ id: wiki.id, via: "link" });
        }
        continue;
      }
      if (seenAssetIds.has(wiki.id)) continue;
      seenAssetIds.add(wiki.id);
      if ("legacy" in wiki && wiki.legacy) {
        assets.push({ id: wiki.id, via: "link", legacy: true });
      } else if ("assetType" in wiki) {
        assets.push({
          id: wiki.id,
          assetType: wiki.assetType,
          via: "link",
          legacy: false,
        });
      }
    }
  };

  for (const item of content) {
    if (item?.type !== "text") continue;
    const marks = item.marks || [];
    const hasCodeMark = marks.some((m: any) => m.type === "code");
    const linkMark = marks.find((m: any) => m.type === "link");

    if (linkMark?.attrs?.href) {
      const href: string = linkMark.attrs.href;

      const actionShorthand = parseActionLinkShorthand(href);
      if (actionShorthand) {
        if (!seenActionIds.has(actionShorthand.id)) {
          seenActionIds.add(actionShorthand.id);
          actions.push({ id: actionShorthand.id, via: "link" });
        }
        continue;
      }

      const shorthand = parseAssetLinkShorthand(href);
      if (shorthand) {
        const id = shorthand.id;
        if (!seenAssetIds.has(id)) {
          seenAssetIds.add(id);
          if (shorthand.legacy) {
            assets.push({ id, via: "link", legacy: true });
          } else {
            assets.push({
              id,
              assetType: shorthand.assetType,
              via: "link",
              legacy: false,
            });
          }
        }
        continue;
      }

      const parsed = parseOuroAssetUrl(href, options?.siteUrl);
      if (parsed) {
        const key = `${parsed.assetType}:${parsed.entity}:${parsed.slug}`;
        if (!seenLinkedKeys.has(key)) {
          seenLinkedKeys.add(key);
          linkedAssets.push(parsed);
        }
      }
      continue;
    }

    if (!hasCodeMark && typeof item.text === "string") {
      addWikiRefs(item.text);
    }
  }

  return {
    users,
    assets,
    actions,
    linkedAssets,
  };
}

export {
  extractAssetWikiLinks,
  getReferencesInContent,
  parseActionLinkShorthand,
  parseAssetLinkShorthand,
  parseOuroAssetUrl,
};
