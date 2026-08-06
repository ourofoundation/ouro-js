import type {
  AssetFilters,
  AssetMetadataFilters,
  AssetSearchFilters,
} from "../schema/asset-filters";

/**
 * Map UI {@link AssetFilters} (short keys) to API {@link AssetSearchFilters}
 * (column names). Does not include `file_type` / `extension` — those belong in
 * {@link AssetMetadataFilters} via {@link toAssetMetadataFilters}.
 */
function toAssetSearchFilters(filters: AssetFilters = {}): AssetSearchFilters {
  const out: AssetSearchFilters = {};

  if (filters.user) out.user_id = filters.user;
  if (filters.team) out.team_id = filters.team;
  if (filters.visibility) out.visibility = filters.visibility;
  if (filters.license) out.license_id = filters.license;
  if (filters.method) out.method = filters.method;
  if (filters.status) out.status = filters.status;
  if (filters.source) out.source = filters.source;
  if (filters.top_level_only) out.top_level_only = filters.top_level_only;
  if (filters.asset_type) out.asset_type = filters.asset_type;

  return out;
}

/**
 * Pull file-oriented fields off UI {@link AssetFilters} into metadata filters.
 */
function toAssetMetadataFilters(
  filters: AssetFilters = {}
): AssetMetadataFilters {
  const out: AssetMetadataFilters = {};
  if (filters.file_type) out.file_type = filters.file_type;
  if (filters.extension) out.extension = filters.extension;
  return out;
}

export { toAssetSearchFilters, toAssetMetadataFilters };
