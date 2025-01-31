import { z } from "zod";

import {
  AssetTypeSchema,
  MonetizationSchema,
  StatusSchema,
  VisibilitySchema,
} from "./common";
import { OrganizationsSchema } from "./organizations";
import { TeamSchema } from "./teams";

import { ProfileSchema } from "./users";
import { uuidv7 } from "uuidv7";

const AssetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user: ProfileSchema.partial().optional(),
  org_id: z.string().uuid(),
  organization: OrganizationsSchema.partial().optional(),
  team_id: z.string().uuid(),
  team: TeamSchema.partial().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  // parent: z.lazy(() => AssetSchema.partial()).optional(),
  parent: z.object({}).passthrough().optional(),
  asset_type: AssetTypeSchema,
  name: z.string(),
  name_url_slug: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  description: z.string().nullable().optional(),
  visibility: VisibilitySchema,
  // Product information
  monetization: MonetizationSchema,
  price: z.number().nullable().optional(),
  unit_cost: z.number().nullable().optional(),
  cost_accounting: z.enum(["fixed", "variable"]).optional().nullable(),
  cost_unit: z.string().optional().nullable(),
  product_id: z.string().optional().nullable(),
  price_id: z.string().optional().nullable(),
  // Metadata information
  metadata: z.object({}).passthrough().optional().nullable(),
  preview: z.array(z.object({}).passthrough()).optional().nullable(),
  state: StatusSchema.optional().nullable(),
  created_at: z.string(),
  last_updated: z.string(),
});

const CreateAssetSchema = AssetSchema.partial()
  .omit({
    user_id: true,
    // Remove extended foreign fields
    user: true,
    organization: true,
    team: true,
    // remove added slug
    slug: true,
  })
  .extend({
    id: z
      .string()
      .uuid()
      .default(() => uuidv7()),
    team_id: z
      .string()
      .uuid()
      .nullish()
      .default("00000000-0000-0000-0000-000000000000"),
    org_id: z
      .string()
      .uuid()
      .nullish()
      .default("00000000-0000-0000-0000-000000000000"),
    name: z
      .string()
      .min(1, {
        message: "Name cannot be empty",
      })
      .max(255, {
        message: "Name must be less than 255 characters",
      }), // name is required for all assets but posts and conversations
    name_url_slug: z.string().optional().nullable(),
    state: StatusSchema.optional().default("success"),
    visibility: VisibilitySchema.optional().default("public"),
    created_at: z.string().default(() => new Date().toISOString()),
    last_updated: z.string().default(() => new Date().toISOString()),
  });

const UpdateAssetSchema = AssetSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true,
  // Remove extended foreign fields
  user: true,
  organization: true,
  team: true,
  // remove added slug
  slug: true,
});

export { AssetSchema, CreateAssetSchema, UpdateAssetSchema };
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAsset = z.infer<typeof CreateAssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
