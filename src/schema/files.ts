import {
  object,
  string,
  uuid,
  number,
  enum as zodEnum,
  type z,
  optional,
  literal,
  discriminatedUnion,
  nullable,
  boolean
} from "zod";

import {
  AssetSchema,
  CreateAssetSchema,
  AssetMetadataSchema,
  normalizeAssetConfigForParsing,
} from "./assets";

const ZipArchiveMetadataSchema = object({
  entry_count: number(),
  file_count: number(),
  directory_count: number(),
  total_uncompressed_size: number(),
  total_compressed_size: number(),
  preview_truncated: boolean(),
});

const BaseFileMetadataSchema = object({
  id: uuid(), // The id of the file object
  path: string(), // The path of the file in storage
  bucket: zodEnum(["public-files", "files"]),
  name: string(),
  type: string(),
  extension: string(),
  size: number(),
  // If the file is an image, we store width and height
  width: optional(number()),
  height: optional(number()),
  archive: optional(ZipArchiveMetadataSchema),
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
  // Success state, file is ready. Keep `.default()` on this branch only so
  // omitted `state` still creates a ready file. Zod 4.5 treats a defaulted
  // discriminator as claiming `undefined`; two such branches throw
  // `Duplicate discriminator value "undefined"` on first parse.
  CreateAssetSchema.extend({
    asset_type: literal("file").default("file"),
    state: literal("success").default("success"),
    metadata: FileMetadataSchema,
  }),
  // In-progress state, file is being processed
  CreateAssetSchema.extend({
    asset_type: literal("file").default("file"),
    state: literal("in-progress"),
    metadata: StubFileMetadataSchema,
  }),
]).transform((value) => normalizeAssetConfigForParsing(value));

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
    is_pinned_in_team: true,
  })
  .extend({
    last_updated: string().default(() => new Date().toISOString()),
  })
  .transform((value) => normalizeAssetConfigForParsing(value));

export {
  FileSchema,
  CreateFileSchema,
  updateFileSchema,
  ZipArchiveMetadataSchema,
};
export type File = z.infer<typeof FileSchema>;
export type CreateFile = z.infer<typeof CreateFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;
export type ZipArchiveMetadata = z.infer<typeof ZipArchiveMetadataSchema>;
