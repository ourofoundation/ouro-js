import { z } from "zod";

import { AssetSchema } from "./assets";

const FileSchema = AssetSchema.extend({
  metadata: z.object({
    eTag: z.string(),
    size: z.number(),
    mimetype: z.string(),
    cacheControl: z.string(),
    lastModified: z.string(),
  }),
  // preview: z.array(z.object({}).passthrough()).optional().nullable(),
});

type File = z.infer<typeof FileSchema>;

export { FileSchema, type File };
