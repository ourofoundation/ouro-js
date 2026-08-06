import {
  object,
  string,
  uuid,
  boolean,
  array,
  union,
  enum as zodEnum,
  optional,
  type z,
} from "zod";

import {
  AssetTypeSchema,
  HttpMethodSchema,
  SourceSchema,
  StatusSchema,
} from "./common";

/** Filterable visibilities — excludes `inherit` (not a browse/search value). */
const AssetFilterVisibilitySchema = zodEnum([
  "public",
  "private",
  "organization",
  "monetized",
]);

/** UI file-category chips used in the assets filter bar. */
const AssetFilterFileTypeSchema = zodEnum(["image", "video", "audio"]);

/**
 * Client/UI filter state for asset lists and the filter bar.
 * Short keys (`user`, `team`, `license`) map to API columns via
 * {@link toAssetSearchFilters}.
 */
const AssetFiltersSchema = object({
  user: optional(uuid()),
  team: optional(uuid()),
  visibility: optional(AssetFilterVisibilitySchema),
  top_level_only: optional(boolean()),
  /** Data-list subtype chip (file vs dataset). */
  asset_type: optional(zodEnum(["file", "dataset"])),
  file_type: optional(AssetFilterFileTypeSchema),
  extension: optional(string()),
  license: optional(string()),
  method: optional(HttpMethodSchema),
  status: optional(StatusSchema),
  source: optional(SourceSchema),
  has_reactions: optional(boolean()),
  has_comments: optional(boolean()),
});

/**
 * Wire-format `filters` object for `/search/assets` and related RPCs.
 * Uses DB/API column names (`user_id`, `team_id`, `license_id`).
 */
const AssetSearchFiltersSchema = object({
  asset_type: optional(union([AssetTypeSchema, array(AssetTypeSchema)])),
  user_id: optional(uuid()),
  org_id: optional(uuid()),
  team_id: optional(uuid()),
  visibility: optional(
    union([AssetFilterVisibilitySchema, array(AssetFilterVisibilitySchema)])
  ),
  license_id: optional(string()),
  source: optional(SourceSchema),
  top_level_only: optional(boolean()),
  method: optional(HttpMethodSchema),
  status: optional(StatusSchema),
  /** Server-side personal/global scoping helper. */
  exclude_user_id: optional(uuid()),
  exclude_org_ids: optional(array(uuid())),
});

/**
 * Wire-format `metadata_filters` for file-oriented search
 * (`file_type`, `extension`, and arbitrary metadata keys).
 */
const AssetMetadataFiltersSchema = object({
  file_type: optional(string()),
  extension: optional(union([string(), array(string())])),
}).catchall(optional(union([string(), array(string()), boolean()])));

export {
  AssetFilterVisibilitySchema,
  AssetFilterFileTypeSchema,
  AssetFiltersSchema,
  AssetSearchFiltersSchema,
  AssetMetadataFiltersSchema,
};

export type AssetFilterVisibility = z.infer<typeof AssetFilterVisibilitySchema>;
export type AssetFilterFileType = z.infer<typeof AssetFilterFileTypeSchema>;
export type AssetFilters = z.infer<typeof AssetFiltersSchema>;
export type AssetSearchFilters = z.infer<typeof AssetSearchFiltersSchema>;
export type AssetMetadataFilters = z.infer<typeof AssetMetadataFiltersSchema>;
