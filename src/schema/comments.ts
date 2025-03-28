import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  array,
  type z,
  record,
  any,
  literal,
  optional,
  nullable
} from "zod";

import { AssetSchema } from "./assets";

const CommentSchema = AssetSchema.extend({
  asset_type: literal("comment").default("comment"),
  preview: optional(
    nullable(
      object({
        type: string().refine((x) => x === "doc"),
        content: array(record(string(), any())),
      }).default({ type: "doc", content: [] })
    )
  ),
});

const CreateCommentSchema = CommentSchema.partial()
  .omit({
    id: true,
    user_id: true,
  })
  .extend({
    asset_type: literal("comment").default("comment"),
    id: string().default(() => uuidv7()),
    name: string().default(""),
    created_at: string().default(() => new Date().toISOString()),
    last_updated: string().default(() => new Date().toISOString()),
  });

export { CommentSchema, CreateCommentSchema };
export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
