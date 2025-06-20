import {
  object,
  string,
  number,
  enum as zodEnum,
  type z,
  optional,
  literal,
  discriminatedUnion,
  nullable
} from "zod";

import { AssetSchema, CreateAssetSchema, AssetMetadataSchema } from "./assets";

const BaseFileMetadataSchema = object({
  id: string().uuid(), // The id of the file object
  path: string(), // The path of the file in storage
  bucket: zodEnum(["public-files", "files"]),
  name: string(),
  type: string(),
  extension: string(),
  size: number(),
  // If the file is an image, we store width and height
  width: optional(number()),
  height: optional(number()),
});

const BaseStubFileMetadataSchema = object({
  type: string(),
});

const FileMetadataSchema = BaseFileMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const StubFileMetadataSchema = BaseStubFileMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const FileSchema = AssetSchema.extend({
  asset_type: literal("file").default("file"),
  metadata: FileMetadataSchema,
});

const CreateFileSchema = discriminatedUnion("state", [
  // Success state, file is ready
  CreateAssetSchema.extend({
    asset_type: literal("file").default("file"),
    state: literal("success").default("success"),
    metadata: FileMetadataSchema,
  }),
  // In-progress state, file is being processed
  CreateAssetSchema.extend({
    asset_type: literal("file").default("file"),
    state: literal("in-progress").default("in-progress"),
    metadata: StubFileMetadataSchema,
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
    last_updated: string().default(() => new Date().toISOString()),
  });

export { FileSchema, CreateFileSchema, updateFileSchema };
export type File = z.infer<typeof FileSchema>;
export type CreateFile = z.infer<typeof CreateFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;
