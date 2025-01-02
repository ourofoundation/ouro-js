import { z } from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";
import { AssetTypeSchema, ConnectionSchema } from "./common";

const TipTapSchema = z.object({
  type: z.literal("doc"),
  content: z.array(
    z
      .object({
        content: z.array(z.object({}).passthrough()).optional(),
        attrs: z.object({}).passthrough().optional(),
      })
      .passthrough()
  ),
});

const ContentSchema = z
  .object({
    json: TipTapSchema,
    text: z.string(),
  })
  .default({ json: { type: "doc", content: [] }, text: "" });

const PostSchema = AssetSchema.extend({
  name: z.string().nullable(),
  asset_type: AssetTypeSchema.refine((x) => ["post", "comment"].includes(x)),
  // TODO: make this ContentSchema
  preview: TipTapSchema.default({ type: "doc", content: [] }),
  content: ContentSchema,
});

const CreatePostSchema = CreateAssetSchema.extend({
  asset_type: z.literal("post").default("post"),
  name: z
    .string()
    .optional()
    .nullable()
    .default("")
    .transform((x) => x?.trim())
    .transform((x) => x || null),
  preview: TipTapSchema,
});

const ReadPostSchema = PostSchema.extend({
  content: ContentSchema.optional()
    .nullable()
    .default({
      json: { type: "doc", content: [] },
      text: "",
    }),
  reactions: z.array(z.object({}).passthrough()).default([]),
  views: z.number().default(0),
  commentCount: z.number().default(0),
  parent: ConnectionSchema.optional().nullable(),
  pinned: z.boolean().default(false),
});

const ReadPostsSchema = z.array(ReadPostSchema);

const ListPostsSchema = z.array(PostSchema);

const UpdatePostSchema = CreatePostSchema.omit({
  last_updated: true,
}).extend({
  last_updated: z.string().default(() => new Date().toISOString()),
});

type Post = z.infer<typeof PostSchema>;
type CreatePost = z.infer<typeof CreatePostSchema>;
type ListPosts = z.infer<typeof ListPostsSchema>;
type ReadPost = z.infer<typeof ReadPostSchema>;
type ReadPosts = z.infer<typeof ReadPostsSchema>;
type UpdatePost = z.infer<typeof UpdatePostSchema>;
type Content = z.infer<typeof ContentSchema>;
type TipTap = z.infer<typeof TipTapSchema>;

export {
  TipTapSchema,
  ContentSchema,
  PostSchema,
  CreatePostSchema,
  ListPostsSchema,
  ReadPostSchema,
  ReadPostsSchema,
  UpdatePostSchema,
  type Post,
  type CreatePost,
  type ListPosts,
  type ReadPost,
  type ReadPosts,
  type UpdatePost,
  type Content,
  type TipTap,
};
