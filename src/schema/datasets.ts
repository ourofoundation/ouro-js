import { z } from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";
import { AssetTypeSchema } from "./common";

const DatasetFromFileMetadataSchema = z.object({
  type: z.string(),
  size: z.number(),
  path: z.string(),
  name: z.string(),
  id: z.string().uuid(), // storage file object id,
  bucket: z.enum(["public-files", "files"]),
});

const DatasetMetadataSchema = z.object({
  table_name: z.string(),
  schema: z.literal("datasets").default("datasets"),
  columns: z.array(z.string()),
});

const DatasetSchema = AssetSchema.extend({
  asset_type: z.literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema.extend({
    ...DatasetFromFileMetadataSchema.partial().shape,
  }),
  preview: z.array(z.object({}).passthrough()),
});

const CreateDatasetFromFileSchema = CreateAssetSchema.extend({
  asset_type: z.literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema.extend({
    ...DatasetFromFileMetadataSchema.shape,
  }),
  preview: z.array(z.object({}).passthrough()),
});

const CreateDatasetFromSchemaSchema = CreateAssetSchema.extend({
  asset_type: z.literal("dataset").default("dataset"),
  metadata: DatasetMetadataSchema,
  preview: z.array(z.object({}).passthrough()),
});

const updateDatasetSchema = DatasetSchema.partial()
  .omit({
    user_id: true,
    id: true,
    created_at: true,
    last_updated: true,
  })
  .extend({
    asset_type: z.literal("dataset").default("dataset"),
    last_updated: z.string().default(() => new Date().toISOString()),
  });

export {
  DatasetSchema,
  CreateDatasetFromFileSchema,
  CreateDatasetFromSchemaSchema,
  updateDatasetSchema,
};
export type Dataset = z.infer<typeof DatasetSchema>;
export type CreateFromFileDataset = z.infer<typeof CreateDatasetFromFileSchema>;
export type CreateFromSchemaDataset = z.infer<
  typeof CreateDatasetFromSchemaSchema
>;
export type UpdateDataset = z.infer<typeof updateDatasetSchema>;
