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
  // Future: showForm?: boolean  -- render UseRouteForm inline
}

/**
 * Normalize legacy viewMode values to the current set.
 * "chart" → "preview", "default" → "card", anything else → "card".
 */
export function normalizeViewMode(
  raw: string | undefined | null
): "card" | "preview" | "list" {
  if (raw === "default") return "card";
  if (raw === "chart") return "preview";
  if (raw === "preview" || raw === "card" || raw === "list") return raw;
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
  viewMode: "card" | "preview" | "list";
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
  `^(post|dataset|file|service|route):(${UUID_RE})$`,
  "i"
);

/** @deprecated Prefer `post:<uuid>` etc.; still supported and resolved server-side. */
const LEGACY_ASSET_LINK_RE = new RegExp(`^asset:(${UUID_RE})$`, "i");

const VALID_ASSET_TYPES = new Set([
  "post",
  "dataset",
  "file",
  "service",
  "route",
]);

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
    return { users: [], assets: [], linkedAssets: [] };
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

  // Extract asset references from link marks
  const linkedAssets: LinkedAssetRef[] = [];
  const seenAssetIds = new Set(assets.map((a) => a.id));
  const seenLinkedKeys = new Set<string>();

  for (const item of content) {
    if (item?.type !== "text" || !item?.marks) continue;
    const linkMark = item.marks.find((m: any) => m.type === "link");
    if (!linkMark?.attrs?.href) continue;

    const href: string = linkMark.attrs.href;

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

    // Check for Ouro site URLs
    const parsed = parseOuroAssetUrl(href, options?.siteUrl);
    if (parsed) {
      const key = `${parsed.assetType}:${parsed.entity}:${parsed.slug}`;
      if (!seenLinkedKeys.has(key)) {
        seenLinkedKeys.add(key);
        linkedAssets.push(parsed);
      }
    }
  }

  return {
    users,
    assets,
    linkedAssets,
  };
}

export {
  getReferencesInContent,
  parseAssetLinkShorthand,
  parseOuroAssetUrl,
};
