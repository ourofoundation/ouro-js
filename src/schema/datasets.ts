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
  discriminatedUnion,
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
 * The kind of object a dataset reference column points at. The FK target table
 * is the source of truth: public.assets -> "asset", public.actions -> "action".
 */
const RefKindSchema = zodEnum(["asset", "action"]);

/**
 * Per-column reference declarations.
 *
 * A column becomes a reference when the backend adds a real Postgres FK to a
 * referenceable table. `kind` selects the target table; `asset_type` is an
 * optional target-type hint that only applies when `kind` is "asset".
 */
const DatasetRefsSchema = record(
  string(),
  object({
    kind: RefKindSchema,
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
  refs: optional(nullable(DatasetRefsSchema)),
  enum_columns: optional(nullable(DatasetEnumColumnsSchema)),
});

/**
 * A single column from GET /datasets/:id/schema, enriched server-side.
 *
 * The FK fields come straight from get_table_schema. `semantic_type` is pure
 * inference: "reference" when the column has an FK to a referenceable table,
 * with `ref_kind` naming which one ("asset" | "action"). The optional
 * `asset_type` is the declared target-type hint from metadata.refs (display +
 * soft validation only, asset kind only). `semantic_type: "enum"` comes from
 * metadata.enum_columns and exposes its known values.
 */
const EnrichedDatasetSchemaFieldSchema = object({
  column_name: string(),
  data_type: string(),
  fk_constraint_name: optional(nullable(string())),
  foreign_table_schema: optional(nullable(string())),
  foreign_table_name: optional(nullable(string())),
  foreign_column_name: optional(nullable(string())),
  semantic_type: optional(nullable(zodEnum(["reference", "enum"]))),
  ref_kind: optional(nullable(RefKindSchema)),
  asset_type: optional(nullable(AssetTypeSchema)),
  enum_values: optional(nullable(array(string()))),
});

/**
 * A resolved reference returned in the `resolved_refs` sidecar of
 * GET /datasets/:id/data?resolve_refs=true. Discriminated on `kind` so asset
 * and action references share one vocabulary while carrying kind-specific
 * fields.
 */
const ResolvedAssetRefSchema = object({
  kind: literal("asset"),
  id: uuid(),
  asset_type: AssetTypeSchema,
  name: nullable(string()),
  web_url: nullable(string()),
});

const ResolvedActionRefSchema = object({
  kind: literal("action"),
  id: uuid(),
  status: nullable(string()),
  route_id: nullable(uuid()),
  route_name: nullable(string()),
  name: nullable(string()),
  web_url: nullable(string()),
  created_at: nullable(string()),
});

const ResolvedRefSchema = discriminatedUnion("kind", [
  ResolvedAssetRefSchema,
  ResolvedActionRefSchema,
]);

/** column -> (referenced uuid -> resolved reference). */
const ResolvedRefsSchema = record(
  string(),
  record(string(), ResolvedRefSchema)
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
  RefKindSchema,
  DatasetRefsSchema,
  DatasetEnumColumnsSchema,
  EnrichedDatasetSchemaFieldSchema,
  ResolvedRefSchema,
  ResolvedRefsSchema,
};
export type Dataset = z.infer<typeof DatasetSchema>;
export type CreateFromFileDataset = z.infer<typeof CreateDatasetFromFileSchema>;
export type CreateFromSchemaDataset = z.infer<typeof CreateDatasetFromSchemaSchema>;
export type UpdateDataset = z.infer<typeof updateDatasetSchema>;
export type RefKind = z.infer<typeof RefKindSchema>;
export type DatasetRefs = z.infer<typeof DatasetRefsSchema>;
export type DatasetEnumColumns = z.infer<typeof DatasetEnumColumnsSchema>;
export type EnrichedDatasetSchemaField = z.infer<
  typeof EnrichedDatasetSchemaFieldSchema
>;
export type ResolvedRef = z.infer<typeof ResolvedRefSchema>;
export type ResolvedRefs = z.infer<typeof ResolvedRefsSchema>;
