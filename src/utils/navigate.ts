import { filterListToString } from "./dataset";
import { GLOBAL_ORG_ID } from "../schema/constants";

const createNameUrlSlug = (name: string) => {
  return (
    name
      // Convert to lowercase
      .toLowerCase()
      // Normalize unicode characters
      .normalize("NFD")
      // Remove diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
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
