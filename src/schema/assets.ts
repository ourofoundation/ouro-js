import {
  object,
  string,
  uuid,
  number,
  array,
  enum as zodEnum,
  nullable,
  optional,
  record,
  type z,
  any
} from "zod";

import {
  AssetTypeSchema,
  MonetizationSchema,
  PriceCurrencySchema,
  StatusSchema,
  SourceSchema,
  VisibilitySchema,
} from "./common";
import { OrganizationsSchema } from "./organizations";
import { TeamSchema } from "./teams";
import { ProfileSchema } from "./users";
import { uuidv7 } from "uuidv7";
import { GLOBAL_ORG_ID, GLOBAL_TEAM_ID } from "./constants";

type AssetConfigInput = {
  org_id?: string | null;
  visibility?: z.infer<typeof VisibilitySchema> | null;
};

const normalizeAssetConfigForParsing = <T extends AssetConfigInput>(
  input: T
): T => {
  if (input.org_id === GLOBAL_ORG_ID && input.visibility === "organization") {
    return { ...input, visibility: "public" as T["visibility"] };
  }
  return input;
};

const AssetMetadataSchema = object({
  doi_url: optional(nullable(string())),
  external_url: optional(nullable(string())),
  paper_url: optional(nullable(string())),
  github_url: optional(nullable(string())),
  originality: zodEnum(["original", "derivative", "third-party"]),
  source: optional(nullable(string())),
})

const AssetSchema = object({
  id: uuid(),
  user_id: uuid(),
  user: optional(ProfileSchema.partial()),
  org_id: uuid(),
  organization: optional(OrganizationsSchema.partial()),
  team_id: uuid(),
  team: optional(TeamSchema.partial()),
  parent_id: optional(nullable(uuid())),
  parent: optional(record(string(), any())),
  license_id: string(),
  license: optional(record(string(), any())),
  asset_type: AssetTypeSchema,
  name: string(),
  name_url_slug: optional(nullable(string())),
  slug: optional(nullable(string())),
  // Rich description: store both editor json and plain text
  description: optional(
    nullable(
      object({
        json: record(string(), any()),
        text: string(),
      })
    )
  ),
  visibility: VisibilitySchema,
  monetization: MonetizationSchema,
  price: optional(nullable(number())),
  unit_cost: optional(nullable(number())),
  cost_accounting: optional(nullable(zodEnum(["fixed", "variable"]))),
  cost_unit: optional(nullable(string())),
  price_currency: optional(PriceCurrencySchema),
  stripe_product_id: optional(nullable(string())),
  stripe_price_id: optional(nullable(string())),
  stripe_meter_id: optional(nullable(string())),
  metadata: optional(nullable(AssetMetadataSchema)),
  preview: optional(nullable(array(record(string(), any())))),
  state: StatusSchema,
  source: SourceSchema,
  created_at: string(),
  last_updated: string(),
});

const CreateAssetSchema = AssetSchema.partial()
  .omit({
    user_id: true,
    user: true,
    organization: true,
    license: true,
    team: true,
    slug: true,
  })
  .extend({
    id: uuid().default(() => uuidv7()),
    team_id: nullable(uuid())
      .default(GLOBAL_TEAM_ID),
    org_id: nullable(uuid())
      .default(GLOBAL_ORG_ID),
    name: string()
      .min(1, { message: "Name cannot be empty" })
      .max(255, { message: "Name must be less than 255 characters" }),
    name_url_slug: optional(nullable(string())),
    state: StatusSchema.optional().default("success"),
    source: SourceSchema.default("web"),
    visibility: VisibilitySchema.optional().default("public"),
    created_at: string().default(() => new Date().toISOString()),
    last_updated: string().default(() => new Date().toISOString()),
  });

const UpdateAssetSchema = AssetSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true,
  user: true,
  organization: true,
  team: true,
  slug: true,
}).transform((value) => normalizeAssetConfigForParsing(value));

export {
  AssetMetadataSchema,
  AssetSchema,
  CreateAssetSchema,
  UpdateAssetSchema,
  normalizeAssetConfigForParsing,
};
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAsset = z.infer<typeof CreateAssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
