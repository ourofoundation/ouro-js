import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  number,
  array,
  type z,
  record,
  any,
  literal,
  optional,
  nullable
} from "zod";

import {
  AssetSchema,
  AttributionSchema,
  DEFAULT_ATTRIBUTION,
  normalizeAssetConfigForParsing,
} from "./assets";
import { ContentActionRefSchema } from "./content-refs";
import { ContentSchema } from "./posts";
import { reactionSchema } from "./reactions";
import { ProfileSchema } from "./users";

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
    attribution: optional(nullable(AttributionSchema)).transform((value) =>
      AttributionSchema.parse(value ?? DEFAULT_ATTRIBUTION)
    ),
    created_at: string().default(() => new Date().toISOString()),
    last_updated: string().default(() => new Date().toISOString()),
  })
  .transform((value) => normalizeAssetConfigForParsing(value));

/**
 * Supabase aggregate from `replies:connections!target_id(count)`.
 * List endpoints leave this as `[{ count }]`; prefer reading `replies[0]?.count`.
 */
const CommentRepliesAggregateSchema = array(
  object({
    count: number(),
  })
);

/** Comment as returned from read/list APIs, with content and resolved embeds. */
const ReadCommentSchema = CommentSchema.extend({
  content: optional(nullable(ContentSchema)),
  assets: optional(nullable(array(AssetSchema.partial()))),
  users: optional(nullable(array(ProfileSchema.partial()))),
  actions: optional(nullable(array(ContentActionRefSchema))),
  reactions: optional(nullable(array(reactionSchema))),
  replies: optional(nullable(CommentRepliesAggregateSchema)),
  /** Flattened count set by single-comment read; prefer `replies[0]?.count` on lists. */
  repliesCount: optional(number()),
});

export {
  CommentSchema,
  CreateCommentSchema,
  CommentRepliesAggregateSchema,
  ReadCommentSchema,
};
export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type CommentRepliesAggregate = z.infer<
  typeof CommentRepliesAggregateSchema
>;
export type ReadComment = z.infer<typeof ReadCommentSchema>;
