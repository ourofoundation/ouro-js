import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { AssetSchema } from "./assets";
import {
  AssetTypeSchema,
  ConnectionSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";

const TipTapSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.object({}).passthrough()),
});

const ContentSchema = z.object({
  json: TipTapSchema,
  text: z.string(),
});

const PostSchema = AssetSchema.extend({
  name: z.string().nullable(),
  asset_type: AssetTypeSchema.refine((x) => ["post", "comment"].includes(x)),
  // TODO: make this ContentSchema
  preview: TipTapSchema.default({ type: "doc", content: [] }),
  content: ContentSchema,
});

const CreatePostSchema = PostSchema.partial()
  .omit({
    id: true,
    user_id: true,
  })
  .extend({
    id: z
      .string()
      .uuid()
      .default(() => uuidv7()),
    team_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
    org_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
    asset_type: AssetTypeSchema.default("post").refine((x) => x === "post"),
    name: z
      .string()
      .default("")
      .transform((x) => x.trim())
      .transform((x) => x || null),
    visibility: VisibilitySchema.default("private"),
    monetization: MonetizationSchema.default("none"),
    // preview: z.object({
    //   type: z.string().refine((x) => x === "doc"),
    //   content: z.array(z.object({}).passthrough()),
    // }),
    created_at: z.string().default(() => new Date().toISOString()),
    last_updated: z.string().default(() => new Date().toISOString()),
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

const updatePostSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  visibility: VisibilitySchema.nullable().optional(),
  monetization: MonetizationSchema.nullable().optional(),
  price: z.number().nullable().optional(),
  metadata: z
    .object({
      table_name: z.string(),
    })
    .passthrough()
    .optional()
    .nullable(),
  preview: z.array(z.object({}).passthrough()).optional().nullable(),
  last_updated: z.string().default(() => new Date().toISOString()),
});

type Post = z.infer<typeof PostSchema>;
type CreatePost = z.infer<typeof CreatePostSchema>;
type ListPosts = z.infer<typeof ListPostsSchema>;
type ReadPost = z.infer<typeof ReadPostSchema>;
type ReadPosts = z.infer<typeof ReadPostsSchema>;
type UpdatePost = z.infer<typeof updatePostSchema>;
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
  updatePostSchema,
  type Post,
  type CreatePost,
  type ListPosts,
  type ReadPost,
  type ReadPosts,
  type UpdatePost,
  type Content,
  type TipTap,
};
