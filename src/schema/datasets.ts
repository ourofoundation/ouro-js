import {
  object,
  string,
  uuid,
  number,
  array,
  literal,
  record,
  optional,
  nullable,
  type z,
  any,
  enum as zodEnum
} from "zod";

import {
  AssetSchema,
  CreateAssetSchema,
  AssetMetadataSchema,
  normalizeAssetConfigForParsing,
} from "./assets";
import { AssetTypeSchema } from "./common";

const DatasetFromFileMetadataSchema = object({
  type: string(),
  size: number(),
  path: string(),
  extension: string(),
  name: string(),
  id: uuid(), // storage file object id,
  bucket: zodEnum(["public-files", "files"]),
});

/**
 * Per-column asset reference declarations.
 *
 * A column becomes an asset reference when the backend adds a real Postgres FK
 * to public.assets(id). The optional asset_type refines validation/display.
 */
const DatasetAssetRefsSchema = record(
  string(),
  object({
    asset_type: optional(AssetTypeSchema),
  })
);

/**
 * Per-column enum declarations.
 *
 * Enum columns are stored as ordinary dataset columns plus a Postgres CHECK
 * constraint. The values are surfaced in schema reads so agents can query with
 * known categorical values.
 */
const DatasetEnumColumnsSchema = record(
  string(),
  object({
    values: array(string()),
  })
);

const BaseDatasetMetadataSchema = object({
  table_name: string(),
  schema: literal("datasets").default("datasets"),
  columns: array(string()),
  asset_refs: optional(nullable(DatasetAssetRefsSchema)),
  enum_columns: optional(nullable(DatasetEnumColumnsSchema)),
});

/**
 * A single column from GET /datasets/:id/schema, enriched server-side.
 *
 * The FK fields come straight from get_table_schema. `semantic_type` is pure
 * inference: "asset_ref" when the column has an FK to public.assets. The
 * optional `asset_type` is the declared target-type hint from
 * metadata.asset_refs (display + soft validation only). `semantic_type: "enum"`
 * comes from metadata.enum_columns and exposes its known values.
 */
const EnrichedDatasetSchemaFieldSchema = object({
  column_name: string(),
  data_type: string(),
  fk_constraint_name: optional(nullable(string())),
  foreign_table_schema: optional(nullable(string())),
  foreign_table_name: optional(nullable(string())),
  foreign_column_name: optional(nullable(string())),
  semantic_type: optional(nullable(zodEnum(["asset_ref", "enum"]))),
  asset_type: optional(nullable(AssetTypeSchema)),
  enum_values: optional(nullable(array(string()))),
});

/**
 * A resolved asset reference returned in the `resolved_asset_refs` sidecar of
 * GET /datasets/:id/data?resolve_asset_refs=true. Reuses the platform-wide
 * { asset_id, asset_type } vocabulary (see KeyedAssetRefsSchema).
 */
const ResolvedAssetRefSchema = object({
  asset_id: uuid(),
  asset_type: AssetTypeSchema,
  name: nullable(string()),
  web_url: nullable(string()),
});

/** column -> (referenced uuid -> resolved asset). */
const ResolvedAssetRefsSchema = record(
  string(),
  record(string(), ResolvedAssetRefSchema)
);

const DatasetMetadataSchema = BaseDatasetMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const DatasetSchema = AssetSchema.extend({
  asset_type: literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema.extend({
    ...DatasetFromFileMetadataSchema.partial().shape,
  }),
  preview: array(record(string(), any())),
});

const CreateDatasetFromFileSchema = CreateAssetSchema.extend({
  asset_type: literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema.extend({
    ...DatasetFromFileMetadataSchema.shape,
  }),
  preview: array(record(string(), any())),
}).transform((value) => normalizeAssetConfigForParsing(value));

const CreateDatasetFromSchemaSchema = CreateAssetSchema.extend({
  asset_type: literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema,
  preview: array(record(string(), any())),
}).transform((value) => normalizeAssetConfigForParsing(value));

const updateDatasetSchema = DatasetSchema.partial()
  .omit({
    user_id: true,
    id: true,
    created_at: true,
    last_updated: true,
    organization: true,
    user: true,
    team: true,
    slug: true,
    is_pinned_in_team: true,
  })
  .extend({
    asset_type: literal("dataset").default("dataset"),
    last_updated: string().default(() => new Date().toISOString()),
  })
  .transform((value) => normalizeAssetConfigForParsing(value));

export {
  DatasetSchema,
  CreateDatasetFromFileSchema,
  CreateDatasetFromSchemaSchema,
  updateDatasetSchema,
  DatasetAssetRefsSchema,
  DatasetEnumColumnsSchema,
  EnrichedDatasetSchemaFieldSchema,
  ResolvedAssetRefSchema,
  ResolvedAssetRefsSchema,
};
export type Dataset = z.infer<typeof DatasetSchema>;
export type CreateFromFileDataset = z.infer<typeof CreateDatasetFromFileSchema>;
export type CreateFromSchemaDataset = z.infer<typeof CreateDatasetFromSchemaSchema>;
export type UpdateDataset = z.infer<typeof updateDatasetSchema>;
export type DatasetAssetRefs = z.infer<typeof DatasetAssetRefsSchema>;
export type DatasetEnumColumns = z.infer<typeof DatasetEnumColumnsSchema>;
export type EnrichedDatasetSchemaField = z.infer<
  typeof EnrichedDatasetSchemaFieldSchema
>;
export type ResolvedAssetRef = z.infer<typeof ResolvedAssetRefSchema>;
export type ResolvedAssetRefs = z.infer<typeof ResolvedAssetRefsSchema>;
