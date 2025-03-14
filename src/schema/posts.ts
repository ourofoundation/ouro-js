import { z } from "zod";

import { AssetSchema, CreateAssetSchema } from "./assets";
import { AssetTypeSchema } from "./common";

const TipTapNode: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string(),
    content: z.array(TipTapNode).optional(),
    attrs: z.record(z.any()).optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.any()).optional(),
        })
      )
      .optional(),
    text: z.string().optional(), // For text nodes
  })
);

const TipTapSchema = z.object({
  type: z.literal("doc"),
  content: z.array(TipTapNode),
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
  // We have this on asset now
  // parent: ConnectionSchema.optional().nullable(),
  pinned: z.boolean().default(false),
});

const ReadPostsSchema = z.array(ReadPostSchema);

const ListPostsSchema = z.array(PostSchema);

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
    last_updated: z.string().default(() => new Date().toISOString()),
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
