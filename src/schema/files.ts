import { z } from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";

const FileMetadataSchema = z.object({
  id: z.string().uuid(), // The id of the file object
  path: z.string(), // The path of the file in storage
  bucket: z.enum(["public-files", "files"]),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  // If the file is an image, we store width and height
  width: z.number().optional(),
  height: z.number().optional(),
});

const FileSchema = AssetSchema.extend({
  asset_type: z.literal("file").default("file"),
  metadata: FileMetadataSchema,
});

const CreateFileSchema = z.discriminatedUnion("state", [
  // Success state, file is ready
  CreateAssetSchema.extend({
    asset_type: z.literal("file").default("file"),
    state: z.literal("success").default("success"),
    metadata: FileMetadataSchema,
  }),
  // In-progress state, file is being processed
  CreateAssetSchema.extend({
    asset_type: z.literal("file").default("file"),
    state: z.literal("in-progress").default("in-progress"),
    metadata: z.object({
      type: z.string(),
    }),
  }),
]);

const updateFileSchema = FileSchema.partial()
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
    last_updated: z.string().default(() => new Date().toISOString()),
  });

export { FileSchema, CreateFileSchema, updateFileSchema };
export type File = z.infer<typeof FileSchema>;
export type CreateFile = z.infer<typeof CreateFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;
