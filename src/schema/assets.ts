import { z } from "zod";

import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";
import { OrganizationsSchema } from "./organizations";
import { TeamSchema } from "./teams";

import { ProfileSchema } from "./users";

const AssetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user: ProfileSchema.partial().optional(),
  org_id: z.string().uuid(),
  organization: OrganizationsSchema.partial().optional(),
  team_id: z.string().uuid(),
  team: TeamSchema.partial().optional(),
  parent_id: z.string().uuid().optional().nullable(),
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
  created_at: z.string(),
  last_updated: z.string(),
});

export type Asset = z.infer<typeof AssetSchema>;
export { AssetSchema };
