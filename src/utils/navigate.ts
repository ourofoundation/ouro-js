import { filterListToString } from "./dataset";
import { GLOBAL_ORG_ID } from "../schema/constants";

// Lowercase Greek letters spelled out so they survive the ASCII-only filter
// ("Cu Kα" -> "cu-k-alpha", "κ_lat" -> "kappa-lat").
const GREEK_LETTER_NAMES: Record<string, string> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  ς: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  ϕ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
};

const createNameUrlSlug = (name: string) => {
  return (
    name
      // Convert to lowercase
      .toLowerCase()
      // Compatibility-normalize: splits accents and folds superscripts/
      // subscripts to plain digits ("cm⁻³" -> "cm-3", "m²" -> "m2")
      .normalize("NFKD")
      // Remove diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Keep decimals readable: "1.21" -> "1-21" rather than "121"
      .replace(/(\d)\.(?=\d)/g, "$1-")
      // Spell out Greek letters
      .replace(/[\u03b1-\u03c9\u03d5]/g, (ch) =>
        GREEK_LETTER_NAMES[ch] ? `-${GREEK_LETTER_NAMES[ch]}-` : ch
      )
      // Superscript/subscript minus and other dashes become hyphens
      .replace(/[\u2010-\u2015\u2212\u207b\u208b]/g, "-")
      // Replace spaces, forward slashes, and underscores with hyphens
      .replace(/[\s\/\_]+/g, "-")
      // Remove special characters
      .replace(/[^\w\-]+/g, "")
      // Remove multiple consecutive hyphens
      .replace(/\-\-+/g, "-")
      // Trim hyphens from start and end
      .replace(/^-+/, "")
      .replace(/-+$/, "")
  );
};

const getEntityName = (asset: any) => {
  if (asset.org_id === GLOBAL_ORG_ID) return asset.user?.username;
  if (asset.org_id) return asset.organization?.name;
  return asset.organization?.name || asset.user?.username;
};

const missingAssetUrlWarnings = new Set<string>();

const warnMissingAssetUrlData = (asset: any, reason: string) => {
  const key = `${reason}:${asset?.id || "no-id"}:${asset?.asset_type || "no-type"}`;
  if (missingAssetUrlWarnings.has(key)) return;
  missingAssetUrlWarnings.add(key);

  console.warn("[ouro-js] Unable to build asset URL", {
    reason,
    id: asset?.id,
    asset_type: asset?.asset_type,
    org_id: asset?.org_id,
    user_id: asset?.user_id,
    name: asset?.name,
    name_url_slug: asset?.name_url_slug,
    organization_name: asset?.organization?.name,
    username: asset?.user?.username,
  });
};

const createUrlSlug = (asset: any) => {
  if (asset?.slug) {
    return asset.slug;
  }
  if (!asset?.asset_type) {
    warnMissingAssetUrlData(asset, "missing_asset_type");
    return "#";
  }
  if (asset.asset_type === "conversation") {
    return `/conversations/${asset.id}`;
  }
  if (asset.asset_type === "comment") {
    return `/comments/${asset.id}`;
  }
  const entityName = getEntityName(asset);
  const name =
    asset.name_url_slug || asset.id || (asset.name ? createNameUrlSlug(asset.name) : undefined);
  if (!entityName || !name) {
    warnMissingAssetUrlData(
      asset,
      !entityName ? "missing_entity_name" : "missing_asset_name"
    );
    return "#";
  }
  const assetType = asset.asset_type;
  return `/${assetType}s/${entityName}/${name}`;
};

const getParentAssetUrl = (asset: any, config?: any): string => {
  if (!asset?.parent) return "#";
  const postfix = asset.asset_type === "comment" ? `#comment-${asset.id}` : "";
  return `${getAssetUrl(asset.parent, config)}${postfix}`;
};

const getAssetUrl = (
  asset: any,
  config?: {
    intent?: "share";
    filters?: { column: string; value: string; operator: string }[];
  }
) => {
  // const assetType = asset?.asset_type || asset?.assetType;
  const slug = createUrlSlug(asset);
  if (slug === "#") {
    return slug;
  }
  const pathPostfix = config?.intent ? `?intent=${config.intent}` : "";
  let url = `${slug}${pathPostfix}`;
  if (config?.filters) {
    url += `?filters=${filterListToString(config.filters)}`;
  }

  return url;
};

export { getAssetUrl, createUrlSlug, createNameUrlSlug };
