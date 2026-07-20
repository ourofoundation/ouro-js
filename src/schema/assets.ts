import {
  object,
  string,
  uuid,
  number,
  array,
  enum as zodEnum,
  nullable,
  optional,
  boolean,
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

/** Type-specific / incidental metadata only (not attribution). */
const AssetMetadataSchema = object({
  source: optional(nullable(string())),
  /** When present on a comment, the id of the comment the user directly replied to (for reply-to-reply; parent_id is the top-level comment). */
  reply_to_comment_id: optional(nullable(string())),
})

const RelationTypeSchema = zodEnum([
  "IsSupplementTo",
  "IsDerivedFrom",
  "References",
  "IsVariantFormOf",
  "IsIdenticalTo",
])

const CitationSchema = object({
  doi: optional(nullable(string())),
  title: optional(nullable(string())),
  authors: optional(nullable(array(string()))),
  year: optional(nullable(number())),
  venue: optional(nullable(string())),
  url: optional(nullable(string())),
  bibtex: optional(nullable(string())),
  source: optional(nullable(string())),
})

/** Provenance, related-work citation, and (later) this asset's minted DOI. */
const AttributionSchema = object({
  originality: optional(
    zodEnum(["original", "derivative", "third-party"])
  ).default("original"),
  external_url: optional(nullable(string())),
  github_url: optional(nullable(string())),
  paper_url: optional(nullable(string())),
  doi_url: optional(nullable(string())),
  citation: optional(nullable(CitationSchema)),
  relation_type: optional(nullable(RelationTypeSchema)),
  /** This asset's DOI — reserved for minting; never the related paper's DOI. */
  doi: optional(nullable(string())),
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
  // NOT NULL in DB; always present after 20260720_assets_attribution.
  attribution: AttributionSchema,
  preview: optional(nullable(array(record(string(), any())))),
  state: StatusSchema,
  source: SourceSchema,
  is_pinned_in_team: optional(boolean().default(false)),
  created_at: string(),
  last_updated: string(),
});

const DEFAULT_ATTRIBUTION = { originality: "original" as const };

const CreateAssetSchema = AssetSchema.partial()
  .omit({
    user_id: true,
    user: true,
    organization: true,
    license: true,
    team: true,
    slug: true,
    is_pinned_in_team: true,
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
    // Column is NOT NULL; coerce omitted/null so create_asset_with_content
    // never inserts an explicit null (which bypasses the DB default).
    attribution: optional(nullable(AttributionSchema)).transform((value) =>
      AttributionSchema.parse(value ?? DEFAULT_ATTRIBUTION)
    ),
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
  is_pinned_in_team: true,
}).transform((value) => normalizeAssetConfigForParsing(value));

export {
  AssetMetadataSchema,
  AttributionSchema,
  CitationSchema,
  RelationTypeSchema,
  AssetSchema,
  CreateAssetSchema,
  UpdateAssetSchema,
  DEFAULT_ATTRIBUTION,
  normalizeAssetConfigForParsing,
};
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type Attribution = z.infer<typeof AttributionSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type RelationType = z.infer<typeof RelationTypeSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAsset = z.infer<typeof CreateAssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
