import {
  object,
  string,
  uuid,
  number,
  array,
  literal,
  record,
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

const DatasetFromFileMetadataSchema = object({
  type: string(),
  size: number(),
  path: string(),
  extension: string(),
  name: string(),
  id: uuid(), // storage file object id,
  bucket: zodEnum(["public-files", "files"]),
});

const BaseDatasetMetadataSchema = object({
  table_name: string(),
  schema: literal("datasets").default("datasets"),
  columns: array(string()),
});

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
};
export type Dataset = z.infer<typeof DatasetSchema>;
export type CreateFromFileDataset = z.infer<typeof CreateDatasetFromFileSchema>;
export type CreateFromSchemaDataset = z.infer<typeof CreateDatasetFromSchemaSchema>;
export type UpdateDataset = z.infer<typeof updateDatasetSchema>;
