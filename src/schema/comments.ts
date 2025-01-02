import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { AssetSchema } from "./assets";

const CommentSchema = AssetSchema.extend({
  asset_type: z.literal("comment").default("comment"),
  preview: z
    .object({
      type: z.string().refine((x) => x === "doc"),
      content: z.array(z.object({}).passthrough()),
    })
    .optional()
    .nullable()
    .default({ type: "doc", content: [] }),
});

const CreateCommentSchema = CommentSchema.partial()
  .omit({
    id: true,
    user_id: true,
  })
  .extend({
    asset_type: z.literal("comment").default("comment"),
    id: z.string().default(() => uuidv7()),
    name: z.string().default(""),
    created_at: z.string().default(() => new Date().toISOString()),
    last_updated: z.string().default(() => new Date().toISOString()),
  });

export { CommentSchema, CreateCommentSchema };

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
