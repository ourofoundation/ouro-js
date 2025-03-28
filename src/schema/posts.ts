import {
  object,
  string,
  number,
  array,
  lazy,
  literal,
  record,
  type z,
  any,
  optional,
  nullable,
  boolean,
  type ZodType
} from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";
import { AssetTypeSchema } from "./common";

const TipTapNode: ZodType<any> = lazy(() =>
  object({
    type: string(),
    content: optional(array(TipTapNode)),
    attrs: optional(record(string(), any())),
    marks: optional(
      array(
        object({
          type: string(),
          attrs: optional(record(string(), any())),
        })
      )
    ),
    text: optional(string()), // For text nodes
  })
);

const TipTapSchema = object({
  type: literal("doc"),
  content: array(TipTapNode),
});

const ContentSchema = object({
  json: TipTapSchema,
  text: string(),
}).default({ json: { type: "doc", content: [] }, text: "" });

const PostSchema = AssetSchema.extend({
  name: nullable(string()),
  asset_type: AssetTypeSchema.refine((x) => ["post", "comment"].includes(x)),
  // TODO: make this ContentSchema
  preview: TipTapSchema.default({ type: "doc", content: [] }),
  content: ContentSchema,
});

const CreatePostSchema = CreateAssetSchema.extend({
  asset_type: literal("post").default("post"),
  name: string()
    .optional()
    .nullable()
    .default("")
    .transform((x) => x?.trim())
    .transform((x) => x || null),
  preview: TipTapSchema,
});

const ReadPostSchema = PostSchema.extend({
  content: optional(
    nullable(
      ContentSchema.default({
        json: { type: "doc", content: [] },
        text: "",
      })
    )
  ),
  reactions: array(record(string(), any())).default([]),
  views: number().default(0),
  commentCount: number().default(0),
  // We have this on asset now
  // parent: ConnectionSchema.optional().nullable(),
  pinned: boolean().default(false),
});

const ReadPostsSchema = array(ReadPostSchema);

const ListPostsSchema = array(PostSchema);

const UpdatePostSchema = PostSchema.partial()
  .omit({
    user_id: true,
    id: true,
    created_at: true,
    last_updated: true,
    content: true,
    organization: true,
    user: true,
    team: true,
    slug: true,
  })
  .extend({
    last_updated: string().default(() => new Date().toISOString()),
  });

export {
  TipTapSchema,
  ContentSchema,
  PostSchema,
  CreatePostSchema,
  ListPostsSchema,
  ReadPostSchema,
  ReadPostsSchema,
  UpdatePostSchema,
};
export type Post = z.infer<typeof PostSchema>;
export type CreatePost = z.infer<typeof CreatePostSchema>;
export type ListPosts = z.infer<typeof ListPostsSchema>;
export type ReadPost = z.infer<typeof ReadPostSchema>;
export type ReadPosts = z.infer<typeof ReadPostsSchema>;
export type UpdatePost = z.infer<typeof UpdatePostSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type TipTap = z.infer<typeof TipTapSchema>;
