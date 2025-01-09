import { filterListToString } from "./dataset";

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

const createUrlSlug = (asset: any) => {
  if (asset.asset_type === "conversation") {
    return `/conversations/${asset.id}`;
  }
  if (asset.asset_type === "comment") {
    return `/comments/${asset.id}`;
  }
  const entityName =
    asset.org_id !== "00000000-0000-0000-0000-000000000000"
      ? asset.organization.name
      : asset.user.username;
  const name = asset.name ? createNameUrlSlug(asset.name) : asset.id;
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
  const assetType = asset?.asset_type || asset?.assetType;
  const slug = asset?.slug || createUrlSlug(asset);
  const pathPostfix = config?.intent ? `?intent=${config.intent}` : "";
  let url = `${slug}${pathPostfix}`;
  if (config?.filters) {
    url += `?filters=${filterListToString(config.filters)}`;
  }

  return url;
};

export { getAssetUrl, createUrlSlug, createNameUrlSlug };
