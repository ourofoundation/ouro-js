import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { AssetSchema } from "./assets";
import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";

const DatasetMetadataSchema = z.object({
  table_name: z.string(),
  schema: z
    .string()
    .default("datasets")
    .refine((val) => val === "datasets"),
  // Properties for if the dataset came from a file
  columns: z.array(z.string()).optional(),
  type: z.string().optional(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  path: z.string().optional(),
  fullPath: z.string().optional(),
  name: z.string().optional(),
  id: z.string().uuid().optional(),
});

const DatasetSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((val) => val === "dataset"),
  metadata: DatasetMetadataSchema,
  preview: z.array(z.object({}).passthrough()).optional().nullable(),
});

const CreateDatasetFromFileSchema = AssetSchema.partial()
  .omit({
    // id: true, // it's actually very important we take the id from the body
    // It's the id of the file that was uploaded
    user_id: true,
  })
  .extend({
    id: z
      .string()
      .uuid()
      .default(() => uuidv7()),
    team_id: z
      .string()
      .uuid()
      .nullish()
      .default("00000000-0000-0000-0000-000000000000"),
    org_id: z
      .string()
      .uuid()
      .nullish()
      .default("00000000-0000-0000-0000-000000000000"),
    name_url_slug: z.string().optional().nullable(),
    metadata: DatasetMetadataSchema.omit({
      schema: true,
    }).extend({
      // File has already been uploaded to storage
      type: z.string(),
      path: z.string(),
      name: z.string(),
      size: z.number(),
      width: z.number().optional().nullable(),
      height: z.number().optional().nullable(),
      // Will be determined from the file type
      table_name: z.string().optional().nullable(), // depreciated in favor of bucket
      bucket: z.string().optional().nullable(),
    }),
  });

const CreateDatasetFromSchemaSchema = AssetSchema.partial()
  .omit({
    // id: true, // it's actually very important we take the id from the body
    // It's the id of the file that was uploaded
    // user_id: true,
  })
  .extend({
    id: z
      .string()
      .uuid()
      .default(() => uuidv7()),
    team_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
    org_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
    name_url_slug: z.string().optional().nullable(),
  });

const updateDatasetSchema = z.object({
  team_id: z.string().uuid().nullable().optional(),
  name_url_slug: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  visibility: VisibilitySchema.nullable().optional(),
  monetization: MonetizationSchema.nullable().optional(),
  price: z.number().nullable().optional(),
  metadata: z
    .object({
      table_name: z.string(),
    })
    .passthrough()
    .optional()
    .nullable(),
  preview: z.array(z.object({}).passthrough()).optional().nullable(),
  last_updated: z.string().default(() => new Date().toISOString()),
});

type Dataset = z.infer<typeof DatasetSchema>;
type CreateFromFileDataset = z.infer<typeof CreateDatasetFromFileSchema>;
type CreateFromSchemaDataset = z.infer<typeof CreateDatasetFromSchemaSchema>;
type UpdateDataset = z.infer<typeof updateDatasetSchema>;

export {
  DatasetSchema,
  CreateDatasetFromFileSchema,
  CreateDatasetFromSchemaSchema,
  updateDatasetSchema,
  type Dataset,
  type CreateFromFileDataset,
  type CreateFromSchemaDataset,
  type UpdateDataset,
};
