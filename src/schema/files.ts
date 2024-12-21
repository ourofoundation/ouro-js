import { z } from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";
import { AssetTypeSchema } from "./common";

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
  asset_type: z.literal("file"),
  metadata: FileMetadataSchema,
});

const CreateFileSchema = z.discriminatedUnion("state", [
  // Success state, file is ready
  CreateAssetSchema.extend({
    asset_type: z.literal("file"),
    state: z.literal("success"),
    metadata: FileMetadataSchema,
  }),
  // In-progress state, file is being processed
  CreateAssetSchema.extend({
    asset_type: z.literal("file"),
    state: z.literal("in-progress"),
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
  })
  .extend({
    last_updated: z.string().default(() => new Date().toISOString()),
  });

type File = z.infer<typeof FileSchema>;
type CreateFile = z.infer<typeof CreateFileSchema>;
type UpdateFile = z.infer<typeof updateFileSchema>;

export {
  FileSchema,
  CreateFileSchema,
  updateFileSchema,
  type File,
  type CreateFile,
  type UpdateFile,
};
